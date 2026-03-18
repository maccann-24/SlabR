import twilio from 'twilio';

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    // In development without Twilio keys, log instead of sending
    return null;
  }
  return twilio(sid, token);
}

/**
 * Redact phone numbers for log output — preserves last 4 digits.
 * e.g. +15551234567 -> +1***###4567
 */
export function redactPhone(phone: string): string {
  if (phone.length <= 4) return '****';
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
}

export async function smsToOwner(ownerPhone: string, fromPhone: string, message: string) {
  const client = getTwilioClient();
  if (!client) {
    console.log(`[DEV SMS -> Owner ${redactPhone(ownerPhone)}] ${message}`);
    return;
  }
  await client.messages.create({ to: ownerPhone, from: fromPhone, body: message });
}

// TODO: unused — planned for Phase 2
export async function smsToCustomer(customerPhone: string, fromPhone: string, message: string) {
  const client = getTwilioClient();
  if (!client) {
    console.log(`[DEV SMS -> Customer ${redactPhone(customerPhone)}] ${message}`);
    return;
  }
  await client.messages.create({ to: customerPhone, from: fromPhone, body: message });
}

export async function callSummaryNotification(
  ownerPhone: string,
  fromPhone: string,
  summary: string,
  callerPhone: string,
) {
  const message = `Missed call handled by AI\nCaller: ${callerPhone}\n\n${summary}`;
  await smsToOwner(ownerPhone, fromPhone, message);
}
