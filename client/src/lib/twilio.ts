import { getCredentials, hasCredentials } from './settings';

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01';
const SERVERLESS_BASE = 'https://serverless.twilio.com/v1';
const SERVERLESS_UPLOAD_BASE = 'https://serverless-upload.twilio.com/v1';
const NOREPLY_SERVICE_NAME = 'burner-noreply';
const NOREPLY_FUNCTION_PATH = '/noreply';
const NOREPLY_URL_CACHE_KEY = 'burner_noreply_webhook_url';

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

async function serverlessRequest<T>(path: string, options?: RequestInit): Promise<T> {
  ensureCredentials();
  const res = await fetch(`${SERVERLESS_BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Serverless error: ${res.status}`);
  }
  return res.json();
}

async function deployNoReplyFunction(): Promise<string> {
  // Check for an existing service
  let serviceSid: string | null = null;
  try {
    const data = await serverlessRequest<{ services: { sid: string; unique_name: string }[] }>('/Services');
    const existing = data.services?.find(s => s.unique_name === NOREPLY_SERVICE_NAME);
    if (existing) {
      serviceSid = existing.sid;
      const envData = await serverlessRequest<{ environments: { sid: string; build_sid: string | null; domain_name: string }[] }>(
        `/Services/${serviceSid}/Environments`
      );
      const env = envData.environments?.[0];
      if (env?.build_sid && env.domain_name) {
        return `https://${env.domain_name}${NOREPLY_FUNCTION_PATH}`;
      }
    }
  } catch { /* service doesn't exist yet */ }

  if (!serviceSid) {
    const svc = await serverlessRequest<{ sid: string }>('/Services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody({ UniqueName: NOREPLY_SERVICE_NAME, FriendlyName: 'Burner No Reply', IncludeCredentials: 'true' }),
    });
    serviceSid = svc.sid;
  }

  const env = await serverlessRequest<{ sid: string; domain_name: string }>(`/Services/${serviceSid}/Environments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({ UniqueName: 'production' }),
  });

  const func = await serverlessRequest<{ sid: string }>(`/Services/${serviceSid}/Functions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({ FriendlyName: 'noreply' }),
  });

  const code = 'exports.handler = function(context, event, callback) {\n  callback(null, new Twilio.twiml.MessagingResponse());\n};\n';
  const blob = new Blob([code], { type: 'application/javascript' });
  const uploadForm = new FormData();
  uploadForm.append('Path', NOREPLY_FUNCTION_PATH);
  uploadForm.append('Visibility', 'public');
  uploadForm.append('Content', blob, 'noreply.js');

  const uploadRes = await fetch(
    `${SERVERLESS_UPLOAD_BASE}/Services/${serviceSid}/Functions/${func.sid}/Versions`,
    { method: 'POST', headers: authHeaders(), body: uploadForm },
  );
  if (!uploadRes.ok) throw new Error(`Function upload failed: ${uploadRes.status}`);
  const version = await uploadRes.json() as { sid: string };

  const build = await serverlessRequest<{ sid: string }>(`/Services/${serviceSid}/Builds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({ FunctionVersions: version.sid }),
  });

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const b = await serverlessRequest<{ status: string }>(`/Services/${serviceSid}/Builds/${build.sid}`);
    if (b.status === 'completed') break;
    if (b.status === 'failed') throw new Error('Serverless build failed');
  }

  await serverlessRequest(`/Services/${serviceSid}/Environments/${env.sid}/Deployments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({ BuildSid: build.sid }),
  });

  const envInfo = await serverlessRequest<{ domain_name: string }>(`/Services/${serviceSid}/Environments/${env.sid}`);
  return `https://${envInfo.domain_name}${NOREPLY_FUNCTION_PATH}`;
}

async function getNoReplyUrl(): Promise<string> {
  const cached = localStorage.getItem(NOREPLY_URL_CACHE_KEY);
  if (cached) return cached;

  const url = await deployNoReplyFunction();
  localStorage.setItem(NOREPLY_URL_CACHE_KEY, url);
  return url;
}

export interface TwilioAvailableNumber {
  phone_number: string;
  friendly_name: string;
  locality: string;
  region: string;
  capabilities: { sms: boolean; mms: boolean; voice: boolean };
  address_requirements: string;
}

export interface TwilioIncomingNumber {
  sid: string;
  phone_number: string;
  friendly_name: string;
}

export interface TwilioAddress {
  sid: string;
  friendly_name: string;
  customer_name: string;
  street: string;
  city: string;
  region: string;
  postal_code: string;
  iso_country: string;
  validated: boolean;
  verified: boolean;
}

export interface TwilioBundle {
  sid: string;
  friendly_name: string;
  status: string;
  regulation_sid: string;
  iso_country: string;
  number_type: string;
  valid_until: string | null;
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
  async searchAvailable(country: string): Promise<{ numbers: TwilioAvailableNumber[]; numberType: string }> {
    const types = ['Mobile', 'Local'];
    for (const type of types) {
      try {
        const data = await twilioRequest<{ available_phone_numbers: TwilioAvailableNumber[] }>(
          `/AvailablePhoneNumbers/${country}/${type}.json?SmsEnabled=true&PageSize=20`
        );
        if (data.available_phone_numbers.length > 0) {
          return { numbers: data.available_phone_numbers, numberType: type.toLowerCase() };
        }
      } catch {
        continue;
      }
    }
    return { numbers: [], numberType: '' };
  },

  async listAddresses(): Promise<TwilioAddress[]> {
    const data = await twilioRequest<{ addresses: TwilioAddress[] }>(
      '/Addresses.json?PageSize=100'
    );
    return data.addresses || [];
  },

  async listBundles(): Promise<TwilioBundle[]> {
    ensureCredentials();
    const { sid, token } = getCredentials();
    const url = 'https://numbers.twilio.com/v2/RegulatoryCompliance/Bundles?Status=twilio-approved&PageSize=100';
    const res = await fetch(url, {
      headers: { 'Authorization': 'Basic ' + btoa(`${sid}:${token}`) },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `Failed to list bundles: ${res.status}`);
    }
    const data = await res.json();
    return data.results || [];
  },

  async provisionNumber(phoneNumber: string, addressSid?: string, bundleSid?: string): Promise<TwilioIncomingNumber> {
    const params: Record<string, string> = { PhoneNumber: phoneNumber };

    try {
      const noReplyUrl = await getNoReplyUrl();
      params.SmsUrl = noReplyUrl;
      params.VoiceUrl = noReplyUrl;
    } catch (err) {
      console.warn('No-reply webhook setup failed, provisioning with defaults:', err);
    }

    if (addressSid) {
      params.AddressSid = addressSid;
    }
    if (bundleSid) {
      params.BundleSid = bundleSid;
    }
    return twilioRequest<TwilioIncomingNumber>(
      '/IncomingPhoneNumbers.json',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody(params),
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
