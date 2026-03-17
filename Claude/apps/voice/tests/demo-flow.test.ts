/**
 * Demo Flow Integration Tests
 *
 * Tests the complete call flow end-to-end using the simulator.
 * No external services needed — all mocked at the DB/API layer.
 *
 * These tests validate that the full product works as a cohesive
 * system, not just individual components.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB
vi.mock('@serviceline/db', () => {
  const insertChain = {
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'test-uuid' }]),
  };
  return {
    db: {
      insert: vi.fn(() => ({ ...insertChain })),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    },
    clients: 'clients_table',
    leads: 'leads_table',
    calls: 'calls_table',
    appointments: 'appointments_table',
    escalations: 'escalations_table',
    onCallContacts: { id: 'id', name: 'name', phone: 'phone', role: 'role', isActive: 'is_active' },
    onCallSchedule: { contactId: 'contact_id', clientId: 'client_id', dayOfWeek: 'day_of_week' },
    eq: vi.fn(),
    and: vi.fn(),
    notInArray: vi.fn(),
  };
});

vi.mock('../src/services/notifications.js', () => ({
  smsToOwner: vi.fn().mockResolvedValue(undefined),
  smsToCustomer: vi.fn().mockResolvedValue(undefined),
  callSummaryNotification: vi.fn().mockResolvedValue(undefined),
}));

const { createSession, sendMessage, endSession, getSessionSummary } = await import(
  '../src/demo/simulator.js'
);

const DEFAULT_CONFIG = {
  businessName: "Mike's Plumbing",
  ownerName: 'Mike Johnson',
  ownerPhone: '+15551111111',
  services: ['plumbing', 'drain', 'water_heater'],
  serviceArea: 'Austin, TX',
  callerPhone: '+15559876543',
  plan: 'pro' as const,
  useRealAI: false, // mock mode — no API key needed
};

// ==========================================================================
// FULL FLOW: Normal service call → booking
// ==========================================================================
describe('Full flow: normal service call', () => {
  it('completes a 3-turn conversation ending in a booking', async () => {
    const session = await createSession(DEFAULT_CONFIG);

    // Turn 1: describe the problem
    const r1 = await sendMessage(session, 'My water heater stopped working, no hot water since this morning');
    expect(r1.length).toBeGreaterThan(0);
    expect(r1.length).toBeLessThan(200); // Not rambling

    // Turn 2: provide name and address
    const r2 = await sendMessage(session, "John Smith, 4521 Oak Lane, Austin");
    expect(r2.length).toBeGreaterThan(0);

    // Turn 3: confirm appointment
    const r3 = await sendMessage(session, 'Yeah that works');
    expect(r3.length).toBeGreaterThan(0);

    await endSession(session);
    const summary = getSessionSummary(session);

    expect(summary.totalTurns).toBe(3);
    expect(summary.appointmentBooked).toBe(true);
    expect(summary.briefGenerated).toBe(true);
    expect(summary.revenueRescued).toBe(350);
  });

  it('generates a call brief with customer info', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, 'Leaky faucet in the kitchen');
    await sendMessage(session, 'Jane Doe, 123 Main St');
    await sendMessage(session, 'Yes book it');

    expect(session.brief).not.toBeNull();
    expect(session.brief!.customer.phone).toBe('+15559876543');
    expect(session.brief!.source).toBe('ai_voice');
  });

  it('tracks all events in the session', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, 'Drain is clogged');
    await sendMessage(session, 'Bob, 456 Elm St');
    await sendMessage(session, 'Sure');

    // Should have: setup + ai_responses + tool_calls + booking + brief + notification
    expect(session.events.length).toBeGreaterThan(5);

    const eventTypes = session.events.map((e) => e.type);
    expect(eventTypes).toContain('setup');
    expect(eventTypes).toContain('ai_response');
  });
});

// ==========================================================================
// EMERGENCY FLOW: burst pipe → immediate escalation
// ==========================================================================
// ==========================================================================
// ROUTINE CALLS: "leak" is NOT an emergency
// ==========================================================================
describe('Routine calls — not emergencies', () => {
  it('"leak in my kitchen sink" does NOT trigger emergency escalation', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, 'I have a leak in my kitchen sink');

    const summary = getSessionSummary(session);
    expect(summary.emergencyEscalated).toBe(false);

    const emergencyEvents = session.events.filter(
      (e) => e.type === 'notification' && e.data.type === 'emergency',
    );
    expect(emergencyEvents).toHaveLength(0);
  });

  it('"leaky faucet" does NOT trigger emergency escalation', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, 'I have a leaky faucet');

    expect(session.emergencyEscalated).toBe(false);
  });

  it('"dripping pipe under the sink" does NOT trigger emergency', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, 'I have a dripping pipe under the sink');

    expect(session.emergencyEscalated).toBe(false);
  });

  it('"slow leak in the bathroom" does NOT trigger emergency', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, 'There is a slow leak in my bathroom');

    expect(session.emergencyEscalated).toBe(false);
  });

  it('"AC not cooling" does NOT trigger emergency', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, 'My AC is not cooling the house');

    expect(session.emergencyEscalated).toBe(false);
  });
});

// ==========================================================================
// REAL EMERGENCIES: these SHOULD trigger escalation
// ==========================================================================
describe('Full flow: emergency call', () => {
  it('escalates immediately on emergency keywords', async () => {
    const session = await createSession(DEFAULT_CONFIG);

    const response = await sendMessage(session, 'My basement is flooding! Pipe burst!');
    expect(response.length).toBeGreaterThan(0);

    const summary = getSessionSummary(session);
    expect(summary.emergencyEscalated).toBe(true);

    // Should have escalation notification event
    const notificationEvent = session.events.find((e) => e.type === 'notification');
    expect(notificationEvent).toBeDefined();
    expect(notificationEvent!.data.type).toBe('emergency');
  });

  it('does NOT try to book an appointment during emergency', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, 'Gas smell in the house!');

    const summary = getSessionSummary(session);
    expect(summary.emergencyEscalated).toBe(true);
    expect(summary.appointmentBooked).toBe(false);
  });

  it('"sewage backing up" triggers emergency', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, 'Sewage is backing up into the tub!');

    expect(session.emergencyEscalated).toBe(true);
  });

  it('"no heat" triggers emergency', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, "We have no heat and it's 10 degrees outside");

    expect(session.emergencyEscalated).toBe(true);
  });

  it('"pipe burst" triggers emergency', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, 'A pipe burst in the basement');

    expect(session.emergencyEscalated).toBe(true);
  });
});

// ==========================================================================
// SESSION LIFECYCLE
// ==========================================================================
describe('Session lifecycle', () => {
  it('creates session with correct config', async () => {
    const session = await createSession(DEFAULT_CONFIG);

    expect(session.config.businessName).toBe("Mike's Plumbing");
    expect(session.config.callerPhone).toBe('+15559876543');
    expect(session.systemPrompt).toContain("Mike's Plumbing");
    expect(session.systemPrompt).toContain('dispatcher');
    expect(session.events[0].type).toBe('setup');
  });

  it('tracks message history correctly', async () => {
    const session = await createSession(DEFAULT_CONFIG);

    await sendMessage(session, 'First message');
    expect(session.messageHistory.length).toBe(2); // user + assistant

    await sendMessage(session, 'Second message');
    expect(session.messageHistory.length).toBe(4); // 2 user + 2 assistant
  });

  it('endSession creates a call record event', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, 'Hello');
    await endSession(session);

    const callRecordEvent = session.events.find((e) => e.type === 'call_record');
    expect(callRecordEvent).toBeDefined();
    expect(callRecordEvent!.data.status).toBe('answered_ai');
  });

  it('getSessionSummary returns correct totals', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, 'Test 1');
    await sendMessage(session, 'Test 2');

    const summary = getSessionSummary(session);
    expect(summary.totalTurns).toBe(2);
    expect(summary.eventsCount).toBeGreaterThan(2); // setup + 2 responses minimum
  });
});

// ==========================================================================
// AI RESPONSE QUALITY (mock mode)
// ==========================================================================
describe('AI response quality (mock mode)', () => {
  it('responses are concise (under 200 chars)', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    const r1 = await sendMessage(session, 'My AC is broken');
    expect(r1.length).toBeLessThan(200);

    const r2 = await sendMessage(session, 'Tom, 789 Pine St');
    expect(r2.length).toBeLessThan(200);
  });

  it('responses do not contain preamble phrases', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    const r1 = await sendMessage(session, 'Need a plumber');

    expect(r1).not.toContain('Great question');
    expect(r1).not.toContain("I'd be happy to help");
    expect(r1).not.toContain('Absolutely');
    expect(r1).not.toContain('Certainly');
  });

  it('mock booking response confirms the appointment', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, 'Leaky pipe');
    await sendMessage(session, 'Name and address');
    const r3 = await sendMessage(session, 'Yes');

    // Should confirm the booking — not ask another question
    expect(r3.toLowerCase()).toContain('set');
  });
});

// ==========================================================================
// CALL BRIEF QUALITY
// ==========================================================================
describe('Call brief quality', () => {
  it('brief contains all required fields', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, 'Water heater out');
    await sendMessage(session, 'Name and address');
    await sendMessage(session, 'Book it');

    expect(session.brief).not.toBeNull();
    expect(session.brief!.customer).toBeDefined();
    expect(session.brief!.job).toBeDefined();
    expect(session.brief!.appointment).toBeDefined();
    expect(session.brief!.customer.phone).toBe('+15559876543');
  });

  it('brief has human-readable date (not ISO)', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, 'Drain blocked');
    await sendMessage(session, 'Info');
    await sendMessage(session, 'Confirm');

    if (session.brief) {
      expect(session.brief.appointment.date).not.toContain('2026-');
      expect(session.brief.appointment.date).toMatch(/[A-Z][a-z]+day/); // "Tuesday", "Wednesday", etc.
    }
  });

  it('SMS brief event is generated', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, 'Pipe leak');
    await sendMessage(session, 'Info');
    await sendMessage(session, 'Yes');

    const briefEvent = session.events.find((e) => e.type === 'brief');
    expect(briefEvent).toBeDefined();
    expect(briefEvent!.data.sms).toBeDefined();
    expect((briefEvent!.data.sms as string)).toContain('SERVICE CALL');
  });
});

// ==========================================================================
// REVENUE RESCUED TRACKING
// ==========================================================================
describe('Revenue Rescued tracking', () => {
  it('reports $350 for one booked appointment', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, 'Fix my sink');
    await sendMessage(session, 'Details');
    await sendMessage(session, 'Book it');

    const summary = getSessionSummary(session);
    expect(summary.revenueRescued).toBe(350);
  });

  it('reports $0 when no appointment booked', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, 'Just had a question');

    const summary = getSessionSummary(session);
    expect(summary.revenueRescued).toBe(0);
  });

  it('reports $0 for emergency (escalated, not booked)', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    await sendMessage(session, 'Pipe burst flooding everywhere!');

    const summary = getSessionSummary(session);
    expect(summary.appointmentBooked).toBe(false);
    expect(summary.revenueRescued).toBe(0);
  });
});

// ==========================================================================
// EDGE CASES
// ==========================================================================
describe('Demo edge cases', () => {
  it('handles empty message gracefully', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    const response = await sendMessage(session, '');
    expect(response.length).toBeGreaterThan(0);
  });

  it('handles very long message without crashing', async () => {
    const session = await createSession(DEFAULT_CONFIG);
    const longMsg = 'My water heater is broken and '.repeat(50);
    const response = await sendMessage(session, longMsg);
    expect(response.length).toBeGreaterThan(0);
  });

  it('can create multiple sessions independently', async () => {
    const session1 = await createSession({ ...DEFAULT_CONFIG, businessName: "Joe's HVAC" });
    const session2 = await createSession({ ...DEFAULT_CONFIG, businessName: "Bob's Plumbing" });

    await sendMessage(session1, 'AC broken');
    await sendMessage(session2, 'Pipe leak');

    expect(session1.systemPrompt).toContain("Joe's HVAC");
    expect(session2.systemPrompt).toContain("Bob's Plumbing");
    expect(session1.systemPrompt).not.toContain("Bob's Plumbing");
  });

  it('session config matches what was provided', async () => {
    const session = await createSession({
      ...DEFAULT_CONFIG,
      businessName: 'Custom Plumbing Co',
      ownerPhone: '+15559999999',
    });

    expect(session.config.businessName).toBe('Custom Plumbing Co');
    expect(session.config.ownerPhone).toBe('+15559999999');
  });
});
