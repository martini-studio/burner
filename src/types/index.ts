export interface PhoneNumber {
  id: number;
  phone_number: string;
  friendly_name: string | null;
  label: string;
  country_code: string;
  twilio_sid: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  unread_conversations?: number;
}

export interface Conversation {
  id: number;
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

export interface Message {
  id: number;
  conversation_id: number;
  twilio_sid: string | null;
  direction: 'inbound' | 'outbound';
  body: string;
  status: string;
  created_at: string;
}

export interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
  capabilities: Record<string, boolean>;
  addressRequirements: string;
  numberType: string;
}
