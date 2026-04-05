import Dexie, { type EntityTable } from 'dexie';

export interface DbNumber {
  id?: number;
  phone_number: string;
  friendly_name: string | null;
  label: string;
  country_code: string;
  twilio_sid: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface DbConversation {
  id?: number;
  number_id: number;
  contact_number: string;
  contact_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMessage {
  id?: number;
  conversation_id: number;
  twilio_sid: string | null;
  direction: 'inbound' | 'outbound';
  body: string;
  status: string;
  created_at: string;
}

const db = new Dexie('BurnerDB') as Dexie & {
  numbers: EntityTable<DbNumber, 'id'>;
  conversations: EntityTable<DbConversation, 'id'>;
  messages: EntityTable<DbMessage, 'id'>;
};

db.version(1).stores({
  numbers: '++id, phone_number, twilio_sid, is_active',
  conversations: '++id, number_id, contact_number, [number_id+contact_number]',
  messages: '++id, conversation_id, twilio_sid, created_at',
});

db.version(2).stores({
  numbers: '++id, phone_number, twilio_sid, is_active',
  conversations: '++id, number_id, contact_number, [number_id+contact_number]',
  messages: '++id, conversation_id, twilio_sid, created_at',
}).upgrade(tx => {
  return tx.table('conversations').toCollection().modify(conv => {
    if (conv.deleted_at === undefined) {
      conv.deleted_at = null;
    }
  });
});

export default db;
