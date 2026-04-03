import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.warn('WARNING: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in environment variables');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export function getTwilioClient() {
  if (!client) {
    throw new Error('Twilio client not initialized. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
  }
  return client;
}

export default client;
