import { createHmac, timingSafeEqual } from 'crypto';

/**
 * WebSocket authentication via HMAC-SHA256 tokens.
 * Tokens are generated server-side when producing ConversationRelay TwiML,
 * then validated on the WebSocket upgrade path.
 */

function getSecret(): string {
  const secret = process.env.TWILIO_AUTH_TOKEN;
  if (!secret) {
    throw new Error('TWILIO_AUTH_TOKEN is required for WebSocket authentication');
  }
  return secret;
}

const WS_TOKEN_MAX_AGE_MS = 60_000; // 60 seconds

export function generateWsToken(callSid: string): { token: string; ts: string } {
  const ts = String(Date.now());
  const secret = getSecret();
  const token = createHmac('sha256', secret)
    .update(callSid + ts)
    .digest('hex');
  return { token, ts };
}

export function validateWsToken(
  token: string | undefined,
  ts: string | undefined,
  callSid?: string,
): { valid: boolean; reason?: string } {
  if (!token || !ts) {
    return { valid: false, reason: 'Missing token or timestamp' };
  }

  const timestamp = parseInt(ts, 10);
  if (isNaN(timestamp)) {
    return { valid: false, reason: 'Invalid timestamp' };
  }

  const age = Date.now() - timestamp;
  if (age > WS_TOKEN_MAX_AGE_MS || age < 0) {
    return { valid: false, reason: 'Token expired or timestamp in the future' };
  }

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return { valid: false, reason: 'Server misconfigured — missing auth token' };
  }

  // callSid is embedded in the token at generation time and passed via query param
  const data = (callSid || '') + ts;
  const expected = createHmac('sha256', secret).update(data).digest('hex');

  // Constant-time comparison to prevent timing attacks
  if (token.length !== expected.length) {
    return { valid: false, reason: 'Invalid token' };
  }

  const tokenBuf = Buffer.from(token, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');

  if (tokenBuf.length !== expectedBuf.length) {
    return { valid: false, reason: 'Invalid token format' };
  }

  if (!timingSafeEqual(tokenBuf, expectedBuf)) {
    return { valid: false, reason: 'Invalid token' };
  }

  return { valid: true };
}
