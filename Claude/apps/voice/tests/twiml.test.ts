import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { twimlRoutes } from '../src/routes/twiml.js';

vi.mock('../src/lib/client-config.js', () => ({
  getClientByTwilioPhone: vi.fn().mockImplementation((phone: string) => {
    if (phone === '+15551234567') {
      return Promise.resolve({
        id: 'test-uuid',
        name: "Mike's Plumbing",
        forwardPhone: '+15559876543',
        plan: 'pro',
        status: 'active',
      });
    }
    return Promise.resolve(null);
  }),
}));

describe('GET /twiml/:twilioPhone', () => {
  const app = Fastify();

  beforeAll(async () => {
    app.register(twimlRoutes);
    await app.ready();
  });

  afterAll(() => app.close());

  it('returns TwiML with Dial and action URL for known number', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/twiml/+15551234567',
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/xml');
    expect(res.body).toContain('<Dial');
    expect(res.body).toContain('action=');
    expect(res.body).toContain('timeout="20"');
    expect(res.body).toContain('+15559876543');
  });

  it('returns 404 for unknown number', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/twiml/+19999999999',
    });
    expect(res.statusCode).toBe(404);
  });
});
