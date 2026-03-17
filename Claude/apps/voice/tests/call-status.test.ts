import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import formbody from '@fastify/formbody';
import { callStatusRoutes } from '../src/routes/call-status.js';

vi.mock('../src/lib/client-config.js', () => ({
  getClientByTwilioPhone: vi.fn().mockImplementation((phone: string) => {
    if (phone === '+15551234567') {
      return Promise.resolve({
        id: 'test-uuid',
        name: "Mike's Plumbing",
        forwardPhone: '+15559876543',
        plan: 'pro',
        status: 'active',
        recordingConsentRequired: true,
        twilioPhone: '+15551234567',
        ownerPhone: '+15559876543',
      });
    }
    if (phone === '+15552222222') {
      return Promise.resolve({
        id: 'test-uuid-2',
        name: "Joe's HVAC",
        forwardPhone: '+15553333333',
        plan: 'starter',
        status: 'active',
        recordingConsentRequired: false,
        twilioPhone: '+15552222222',
        ownerPhone: '+15553333333',
      });
    }
    return Promise.resolve(null);
  }),
}));

describe('POST /call-status', () => {
  const app = Fastify();

  beforeAll(async () => {
    // Required for generateWsToken in call-status route
    process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
    app.register(formbody);
    app.register(callStatusRoutes);
    await app.ready();
  });

  afterAll(() => app.close());

  it('returns ConversationRelay TwiML for Pro no-answer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/call-status',
      payload: {
        DialCallStatus: 'no-answer',
        To: '+15551234567',
        From: '+15559999999',
        CallSid: 'CA123',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<ConversationRelay');
    expect(res.body).toContain('welcomeGreeting');
    expect(res.body).toContain('recorded for quality');
  });

  it('returns voicemail TwiML for Starter no-answer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/call-status',
      payload: {
        DialCallStatus: 'no-answer',
        To: '+15552222222',
        From: '+15559999999',
        CallSid: 'CA456',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<Record');
    expect(res.body).toContain("Joe&apos;s HVAC");
    expect(res.body).not.toContain('ConversationRelay');
  });

  it('returns Hangup for completed calls', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/call-status',
      payload: {
        DialCallStatus: 'completed',
        To: '+15551234567',
        From: '+15559999999',
        CallSid: 'CA789',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<Hangup');
  });

  it('returns Hangup for unknown number', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/call-status',
      payload: {
        DialCallStatus: 'no-answer',
        To: '+19999999999',
        From: '+15559999999',
        CallSid: 'CA000',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<Hangup');
  });
});
