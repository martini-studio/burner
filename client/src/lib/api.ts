import type { PhoneNumber, Conversation, Message, AvailableNumber } from '@/types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  numbers: {
    list: () => request<PhoneNumber[]>('/numbers'),
    available: (country: string = 'AU') =>
      request<AvailableNumber[]>(`/numbers/available?country=${country}`),
    provision: (phoneNumber: string, label: string) =>
      request<PhoneNumber>('/numbers/provision', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, label }),
      }),
    update: (id: number, label: string) =>
      request<PhoneNumber>(`/numbers/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ label }),
      }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/numbers/${id}`, { method: 'DELETE' }),
  },

  conversations: {
    listByNumber: (numberId: number) =>
      request<Conversation[]>(`/conversations/number/${numberId}`),
    create: (number_id: number, contact_number: string, contact_name?: string) =>
      request<Conversation>('/conversations', {
        method: 'POST',
        body: JSON.stringify({ number_id, contact_number, contact_name }),
      }),
    update: (id: number, contact_name: string) =>
      request<Conversation>(`/conversations/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ contact_name }),
      }),
    markRead: (id: number) =>
      request<{ success: boolean }>(`/conversations/${id}/read`, { method: 'PUT' }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/conversations/${id}`, { method: 'DELETE' }),
  },

  messages: {
    listByConversation: (conversationId: number) =>
      request<Message[]>(`/messages/conversation/${conversationId}`),
    send: (conversation_id: number, body: string) =>
      request<Message>('/messages/send', {
        method: 'POST',
        body: JSON.stringify({ conversation_id, body }),
      }),
  },
};
