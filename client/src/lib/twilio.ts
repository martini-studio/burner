import { getCredentials, hasCredentials } from './settings';

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01';

function authHeaders(): HeadersInit {
  const { sid, token } = getCredentials();
  return {
    'Authorization': 'Basic ' + btoa(`${sid}:${token}`),
  };
}

function formBody(params: Record<string, string>): URLSearchParams {
  return new URLSearchParams(params);
}

function ensureCredentials() {
  if (!hasCredentials()) {
    throw new Error('Twilio credentials not configured. Go to Settings to add them.');
  }
}

async function twilioRequest<T>(path: string, options?: RequestInit): Promise<T> {
  ensureCredentials();
  const { sid } = getCredentials();
  const url = `${TWILIO_BASE}/Accounts/${sid}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.detail || `Twilio error: ${res.status}`);
  }
  return res.json();
}

export interface TwilioAvailableNumber {
  phone_number: string;
  friendly_name: string;
  locality: string;
  region: string;
  capabilities: { sms: boolean; mms: boolean; voice: boolean };
}

export interface TwilioIncomingNumber {
  sid: string;
  phone_number: string;
  friendly_name: string;
}

export interface TwilioMessageResource {
  sid: string;
  body: string;
  from: string;
  to: string;
  date_created: string;
  direction: string;
  status: string;
}

export const twilio = {
  async searchAvailable(country: string): Promise<TwilioAvailableNumber[]> {
    const types = ['Mobile', 'Local'];
    for (const type of types) {
      try {
        const data = await twilioRequest<{ available_phone_numbers: TwilioAvailableNumber[] }>(
          `/AvailablePhoneNumbers/${country}/${type}.json?SmsEnabled=true&PageSize=20`
        );
        if (data.available_phone_numbers.length > 0) {
          return data.available_phone_numbers;
        }
      } catch {
        continue;
      }
    }
    return [];
  },

  async provisionNumber(phoneNumber: string): Promise<TwilioIncomingNumber> {
    return twilioRequest<TwilioIncomingNumber>(
      '/IncomingPhoneNumbers.json',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody({ PhoneNumber: phoneNumber }),
      }
    );
  },

  async releaseNumber(twilioSid: string): Promise<void> {
    ensureCredentials();
    const { sid } = getCredentials();
    const url = `${TWILIO_BASE}/Accounts/${sid}/IncomingPhoneNumbers/${twilioSid}.json`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `Failed to release number: ${res.status}`);
    }
  },

  async sendMessage(from: string, to: string, body: string): Promise<TwilioMessageResource> {
    return twilioRequest<TwilioMessageResource>(
      '/Messages.json',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody({ From: from, To: to, Body: body }),
      }
    );
  },

  async fetchMessages(numberPhone: string, sinceDate?: string): Promise<TwilioMessageResource[]> {
    let path = `/Messages.json?PageSize=200&To=${encodeURIComponent(numberPhone)}`;
    if (sinceDate) {
      path += `&DateSent>=${encodeURIComponent(sinceDate)}`;
    }
    const incoming = await twilioRequest<{ messages: TwilioMessageResource[] }>(path);

    let outPath = `/Messages.json?PageSize=200&From=${encodeURIComponent(numberPhone)}`;
    if (sinceDate) {
      outPath += `&DateSent>=${encodeURIComponent(sinceDate)}`;
    }
    const outgoing = await twilioRequest<{ messages: TwilioMessageResource[] }>(outPath);

    const all = [...(incoming.messages || []), ...(outgoing.messages || [])];
    const unique = new Map<string, TwilioMessageResource>();
    for (const msg of all) {
      unique.set(msg.sid, msg);
    }
    return Array.from(unique.values());
  },

  async testCredentials(): Promise<{ success: boolean; friendlyName?: string }> {
    try {
      const data = await twilioRequest<{ friendly_name: string }>('.json');
      return { success: true, friendlyName: data.friendly_name };
    } catch {
      return { success: false };
    }
  },
};
