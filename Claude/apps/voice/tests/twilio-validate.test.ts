import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import formbody from '@fastify/formbody';

const mockValidateRequest = vi.fn();

vi.mock('twilio', () => {
  const twilioFn = vi.fn(() => ({}));
  twilioFn.validateRequest = mockValidateRequest;
  return { default: twilioFn };
});

const { validateTwilioWebhook } = await import('../src/services/twilio-validate.js');

function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.register(formbody);
  app.addHook('preHandler', validateTwilioWebhook);
  app.post('/test', async () => ({ ok: true }));
  return app;
}

describe('validateTwilioWebhook', () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {
      NODE_ENV: process.env.NODE_ENV,
      SKIP_TWILIO_VALIDATION: process.env.SKIP_TWILIO_VALIDATION,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      VOICE_SERVER_URL: process.env.VOICE_SERVER_URL,
    };
    mockValidateRequest.mockReset();
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('skips validation in development mode', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.TWILIO_AUTH_TOKEN;

    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'POST', url: '/test', payload: {} });

    expect(res.statusCode).toBe(200);
    expect(mockValidateRequest).not.toHaveBeenCalled();
    await app.close();
  });

  it('skips validation when SKIP_TWILIO_VALIDATION=true', async () => {
    process.env.NODE_ENV = 'test';
    process.env.SKIP_TWILIO_VALIDATION = 'true';

    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'POST', url: '/test', payload: {} });

    expect(res.statusCode).toBe(200);
    expect(mockValidateRequest).not.toHaveBeenCalled();
    await app.close();
  });

  it('returns 500 when TWILIO_AUTH_TOKEN is not set', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SKIP_TWILIO_VALIDATION;
    delete process.env.TWILIO_AUTH_TOKEN;

    const app = buildApp();
    await app.ready();
    const res = await app.inject({
      method: 'POST',
      url: '/test',
      headers: { 'x-twilio-signature': 'some-sig' },
      payload: {},
    });

    expect(res.statusCode).toBe(500);
    expect(res.body).toContain('auth token not configured');
    await app.close();
  });

  it('returns 403 when X-Twilio-Signature is missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SKIP_TWILIO_VALIDATION;
    process.env.TWILIO_AUTH_TOKEN = 'test-token';

    const app = buildApp();
    await app.ready();
    const res = await app.inject({ method: 'POST', url: '/test', payload: {} });

    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('Missing Twilio signature');
    await app.close();
  });

  it('returns 403 when signature is invalid', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SKIP_TWILIO_VALIDATION;
    process.env.TWILIO_AUTH_TOKEN = 'test-token';
    process.env.VOICE_SERVER_URL = 'https://voice.example.com';
    mockValidateRequest.mockReturnValue(false);

    const app = buildApp();
    await app.ready();
    const res = await app.inject({
      method: 'POST',
      url: '/test',
      headers: { 'x-twilio-signature': 'bad-sig' },
      payload: { CallSid: 'CA123' },
    });

    expect(res.statusCode).toBe(403);
    expect(res.body).toContain('Invalid Twilio signature');
    await app.close();
  });

  it('passes request through when signature is valid', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SKIP_TWILIO_VALIDATION;
    process.env.TWILIO_AUTH_TOKEN = 'test-token';
    process.env.VOICE_SERVER_URL = 'https://voice.example.com';
    mockValidateRequest.mockReturnValue(true);

    const app = buildApp();
    await app.ready();
    const res = await app.inject({
      method: 'POST',
      url: '/test',
      headers: { 'x-twilio-signature': 'valid-sig' },
      payload: { CallSid: 'CA123' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
    expect(mockValidateRequest).toHaveBeenCalledWith(
      'test-token',
      'valid-sig',
      'https://voice.example.com/test',
      expect.objectContaining({ CallSid: 'CA123' }),
    );
    await app.close();
  });
});
