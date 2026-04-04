import { Device, Call } from '@twilio/voice-sdk';
import { getCredentials } from './settings';
import { twilio } from './twilio';

let device: Device | null = null;
let activeCall: Call | null = null;

function base64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateAccessToken(
  accountSid: string,
  apiKeySid: string,
  apiKeySecret: string,
  twimlAppSid: string,
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT', cty: 'twilio-fpa;v=1' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    jti: `${apiKeySid}-${now}`,
    iss: apiKeySid,
    sub: accountSid,
    exp: now + 3600,
    grants: {
      identity: 'burner-browser',
      voice: {
        outgoing: {
          application_sid: twimlAppSid,
        },
      },
    },
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(apiKeySecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput)),
  );

  return `${signingInput}.${base64urlBytes(signature)}`;
}

async function ensureDevice(): Promise<Device> {
  const { sid: accountSid } = getCredentials();
  const [apiKey, twimlAppSid] = await Promise.all([
    twilio.ensureApiKey(),
    twilio.ensureTwimlApp(),
  ]);
  const token = await generateAccessToken(accountSid, apiKey.sid, apiKey.secret, twimlAppSid);

  if (device) {
    device.destroy();
  }

  device = new Device(token);
  await device.register();
  return device;
}

export async function requestMicPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch {
    return false;
  }
}

export async function makeVoiceCall(
  from: string,
  to: string,
  onStatusChange: (status: string) => void,
): Promise<void> {
  const dev = await ensureDevice();

  activeCall = await dev.connect({
    params: { To: to, CallerId: from },
  });

  activeCall.on('ringing', () => onStatusChange('ringing'));
  activeCall.on('accept', () => onStatusChange('in-progress'));
  activeCall.on('disconnect', () => {
    activeCall = null;
    onStatusChange('completed');
  });
  activeCall.on('cancel', () => {
    activeCall = null;
    onStatusChange('canceled');
  });
  activeCall.on('error', () => {
    activeCall = null;
    onStatusChange('failed');
  });

  onStatusChange('connecting');
}

export function endVoiceCall(): void {
  if (activeCall) {
    activeCall.disconnect();
    activeCall = null;
  }
  if (device) {
    device.destroy();
    device = null;
  }
}

export function hasActiveCall(): boolean {
  return activeCall !== null;
}
