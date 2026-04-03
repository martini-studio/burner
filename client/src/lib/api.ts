import db from './db';
import { twilio } from './twilio';
import type { PhoneNumber, Conversation, Message, AvailableNumber } from '@/types';

function now() {
  return new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
}

function detectCountry(phoneNumber: string): string {
  if (phoneNumber.startsWith('+61')) return 'AU';
  if (phoneNumber.startsWith('+64')) return 'NZ';
  if (phoneNumber.startsWith('+44')) return 'GB';
  if (phoneNumber.startsWith('+1')) return 'US';
  return 'US';
}

export const api = {
  numbers: {
    async list(): Promise<PhoneNumber[]> {
      const numbers = await db.numbers.where('is_active').equals(1).reverse().sortBy('created_at');
      const result: PhoneNumber[] = [];
      for (const n of numbers) {
        const unread = await db.conversations
          .where('number_id').equals(n.id!)
          .filter(c => c.unread_count > 0)
          .count();
        result.push({ ...n, id: n.id!, unread_conversations: unread });
      }
      return result;
    },

    async available(country: string = 'AU'): Promise<AvailableNumber[]> {
      const numbers = await twilio.searchAvailable(country);
      return numbers.map(n => ({
        phoneNumber: n.phone_number,
        friendlyName: n.friendly_name,
        locality: n.locality || '',
        region: n.region || '',
        capabilities: n.capabilities as unknown as Record<string, boolean>,
      }));
    },

    async provision(phoneNumber: string, label: string): Promise<PhoneNumber> {
      const purchased = await twilio.provisionNumber(phoneNumber);
      const ts = now();
      const id = await db.numbers.add({
        phone_number: purchased.phone_number,
        friendly_name: purchased.friendly_name,
        label: label || '',
        country_code: detectCountry(purchased.phone_number),
        twilio_sid: purchased.sid,
        is_active: 1,
        created_at: ts,
        updated_at: ts,
      });
      return (await db.numbers.get(id))! as PhoneNumber;
    },

    async update(id: number, label: string): Promise<PhoneNumber> {
      await db.numbers.update(id, { label, updated_at: now() });
      return (await db.numbers.get(id))! as PhoneNumber;
    },

    async delete(id: number): Promise<{ success: boolean }> {
      const number = await db.numbers.get(id);
      if (!number) throw new Error('Number not found');

      try {
        await twilio.releaseNumber(number.twilio_sid);
      } catch (err: any) {
        console.warn('Failed to release from Twilio:', err.message);
      }

      const convs = await db.conversations.where('number_id').equals(id).toArray();
      for (const conv of convs) {
        await db.messages.where('conversation_id').equals(conv.id!).delete();
      }
      await db.conversations.where('number_id').equals(id).delete();
      await db.numbers.delete(id);
      return { success: true };
    },
  },

  conversations: {
    async listByNumber(numberId: number): Promise<Conversation[]> {
      const convs = await db.conversations.where('number_id').equals(numberId).toArray();
      convs.sort((a, b) => {
        const aTime = a.last_message_at || a.created_at;
        const bTime = b.last_message_at || b.created_at;
        return bTime.localeCompare(aTime);
      });
      return convs.map(c => ({ ...c, id: c.id! }));
    },

    async create(number_id: number, contact_number: string, contact_name?: string): Promise<Conversation> {
      const existing = await db.conversations
        .where('[number_id+contact_number]')
        .equals([number_id, contact_number])
        .first();
      if (existing) return { ...existing, id: existing.id! };

      const ts = now();
      const id = await db.conversations.add({
        number_id,
        contact_number,
        contact_name: contact_name || null,
        last_message: null,
        last_message_at: null,
        unread_count: 0,
        created_at: ts,
        updated_at: ts,
      });
      return (await db.conversations.get(id))! as Conversation;
    },

    async update(id: number, contact_name: string): Promise<Conversation> {
      await db.conversations.update(id, { contact_name, updated_at: now() });
      return (await db.conversations.get(id))! as Conversation;
    },

    async markRead(id: number): Promise<{ success: boolean }> {
      await db.conversations.update(id, { unread_count: 0, updated_at: now() });
      return { success: true };
    },

    async delete(id: number): Promise<{ success: boolean }> {
      await db.messages.where('conversation_id').equals(id).delete();
      await db.conversations.delete(id);
      return { success: true };
    },
  },

  messages: {
    async listByConversation(conversationId: number): Promise<Message[]> {
      const msgs = await db.messages.where('conversation_id').equals(conversationId).sortBy('created_at');
      return msgs.map(m => ({ ...m, id: m.id! }));
    },

    async send(conversation_id: number, body: string): Promise<Message> {
      const conv = await db.conversations.get(conversation_id);
      if (!conv) throw new Error('Conversation not found');

      const number = await db.numbers.get(conv.number_id);
      if (!number) throw new Error('Number not found');

      const twilioMsg = await twilio.sendMessage(number.phone_number, conv.contact_number, body);

      const ts = now();
      const id = await db.messages.add({
        conversation_id,
        twilio_sid: twilioMsg.sid,
        direction: 'outbound',
        body,
        status: twilioMsg.status || 'sent',
        created_at: ts,
      });

      await db.conversations.update(conversation_id, {
        last_message: body,
        last_message_at: ts,
        updated_at: ts,
      });

      return (await db.messages.get(id))! as Message;
    },
  },

  sync: {
    async pollIncoming(): Promise<number> {
      const numbers = await db.numbers.where('is_active').equals(1).toArray();
      let newCount = 0;

      for (const num of numbers) {
        try {
          const messages = await twilio.fetchMessages(num.phone_number);

          for (const msg of messages) {
            const isInbound = msg.direction === 'inbound';
            if (!isInbound) continue;

            const existingMsg = await db.messages.where('twilio_sid').equals(msg.sid).first();
            if (existingMsg) continue;

            const contactNumber = msg.from;

            let conv = await db.conversations
              .where('[number_id+contact_number]')
              .equals([num.id!, contactNumber])
              .first();

            if (!conv) {
              const ts = now();
              const convId = await db.conversations.add({
                number_id: num.id!,
                contact_number: contactNumber,
                contact_name: null,
                last_message: null,
                last_message_at: null,
                unread_count: 0,
                created_at: ts,
                updated_at: ts,
              });
              conv = await db.conversations.get(convId);
            }

            if (!conv) continue;

            const msgTs = new Date(msg.date_created).toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
            await db.messages.add({
              conversation_id: conv.id!,
              twilio_sid: msg.sid,
              direction: 'inbound',
              body: msg.body,
              status: 'received',
              created_at: msgTs,
            });

            await db.conversations.update(conv.id!, {
              last_message: msg.body,
              last_message_at: msgTs,
              unread_count: (conv.unread_count || 0) + 1,
              updated_at: now(),
            });

            newCount++;
          }
        } catch (err: any) {
          console.warn(`Failed to poll messages for ${num.phone_number}:`, err.message);
        }
      }

      return newCount;
    },
  },
};
