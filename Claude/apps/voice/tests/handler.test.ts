import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Mock DB
vi.mock('@serviceline/db', () => {
  const insertChain = {
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'lead-uuid' }]),
  };
  return {
    db: {
      insert: vi.fn(() => ({ ...insertChain })),
      update: vi.fn(() => ({ set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) })),
    },
    calls: 'calls_table',
    leads: 'leads_table',
    eq: vi.fn(),
    and: vi.fn(),
    notInArray: vi.fn(),
  };
});

vi.mock('../src/lib/client-config.js', () => ({
  getClientByTwilioPhone: vi.fn(),
}));

vi.mock('../src/services/notifications.js', () => ({
  smsToOwner: vi.fn().mockResolvedValue(undefined),
  smsToCustomer: vi.fn().mockResolvedValue(undefined),
  callSummaryNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: vi.fn() },
  })),
}));

const { getClientByTwilioPhone } = await import('../src/lib/client-config.js');
const { db } = await import('@serviceline/db');
const { handleWebSocket } = await import('../src/ws/handler.js');

function makeWs() {
  const ws = new EventEmitter() as EventEmitter & {
    send: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    readyState: number;
  };
  ws.send = vi.fn();
  ws.close = vi.fn();
  ws.readyState = 1;
  return ws;
}

const MOCK_CLIENT = {
  id: 'client-uuid',
  name: "Mike's Plumbing",
  twilioPhone: '+15551234567',
  ownerPhone: '+15559876543',
  forwardPhone: '+15559876543',
  plan: 'pro',
  status: 'active',
  services: ['plumbing', 'drain'],
  serviceArea: 'Austin, TX',
  recordingConsentRequired: false,
  aiSystemPrompt: null,
};

describe('handleWebSocket', () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY };
    vi.mocked(getClientByTwilioPhone).mockResolvedValue(MOCK_CLIENT as any);
    vi.mocked(db.insert).mockImplementation(() => ({
      values: vi.fn().mockReturnThis(),
      onConflictDoNothing: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 'lead-uuid' }]),
    }) as any);
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('closes connection with 1008 on unknown phone', async () => {
    vi.mocked(getClientByTwilioPhone).mockResolvedValue(null);

    const ws = makeWs();
    handleWebSocket(ws as any);
    ws.emit('message', JSON.stringify({ type: 'setup', callSid: 'CA1', from: '+15550000001', to: '+19999999999' }));
    await new Promise((r) => setImmediate(r));

    expect(ws.send).toHaveBeenCalledOnce();
    const sent = JSON.parse(ws.send.mock.calls[0][0]);
    expect(sent.token).toContain('system error');
    expect(ws.close).toHaveBeenCalledWith(1008, 'Unknown phone number');
  });

  it('handles malformed JSON without crashing', async () => {
    const ws = makeWs();
    handleWebSocket(ws as any);

    ws.emit('message', JSON.stringify({ type: 'setup', callSid: 'CA1', from: '+15550000001', to: '+15551234567' }));
    await new Promise((r) => setImmediate(r));

    ws.send.mockClear();
    ws.emit('message', 'not json {{{{');
    await new Promise((r) => setImmediate(r));

    expect(ws.send).not.toHaveBeenCalled();
    expect(ws.close).not.toHaveBeenCalled();
  });

  it('creates lead record on setup', async () => {
    const ws = makeWs();
    handleWebSocket(ws as any);
    ws.emit('message', JSON.stringify({ type: 'setup', callSid: 'CA1', from: '+15550000001', to: '+15551234567' }));
    await new Promise((r) => setImmediate(r));

    expect(db.insert).toHaveBeenCalledWith('leads_table');
  });

  it('sends mock response when no API key', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const ws = makeWs();
    handleWebSocket(ws as any);

    ws.emit('message', JSON.stringify({ type: 'setup', callSid: 'CA1', from: '+15550000001', to: '+15551234567' }));
    await new Promise((r) => setImmediate(r));

    ws.emit('message', JSON.stringify({ type: 'prompt', voicePrompt: 'I have a leak' }));
    await new Promise((r) => setImmediate(r));

    expect(ws.send).toHaveBeenCalledOnce();
    const frame = JSON.parse(ws.send.mock.calls[0][0]);
    expect(frame.type).toBe('text');
    expect(frame.last).toBe(true);
    expect(frame.token.length).toBeGreaterThan(0);
  });

  it('ignores prompt messages before setup', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const ws = makeWs();
    handleWebSocket(ws as any);

    ws.emit('message', JSON.stringify({ type: 'prompt', voicePrompt: 'hello' }));
    await new Promise((r) => setImmediate(r));

    expect(ws.send).not.toHaveBeenCalled();
  });

  it('silently ignores unknown message types', async () => {
    const ws = makeWs();
    handleWebSocket(ws as any);

    ws.emit('message', JSON.stringify({ type: 'setup', callSid: 'CA1', from: '+15550000001', to: '+15551234567' }));
    await new Promise((r) => setImmediate(r));
    ws.send.mockClear();

    ws.emit('message', JSON.stringify({ type: 'interrupt' }));
    await new Promise((r) => setImmediate(r));

    expect(ws.send).not.toHaveBeenCalled();
    expect(ws.close).not.toHaveBeenCalled();
  });
});
