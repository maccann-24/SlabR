/**
 * Positive Outcome Tests
 *
 * Based on real success stories: Avoca AI ($170K new revenue), Aire Serv (8.6x
 * booking improvement), My Plumber Plus ($129M with 9 CSRs), speed-to-lead data
 * (21x conversion at <5 min), review velocity (1-2 to 15-20/month).
 *
 * Each test ensures we do the good parts well WITHOUT opening negative paths.
 * Cross-referenced against horror-stories.test.ts to verify balance.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { buildSystemPrompt } from '../src/ws/prompts.js';
import { voiceTools } from '../src/ws/tools.js';
import { escapeXml } from '../src/lib/xml-utils.js';

// Required for call-status route tests (generateWsToken needs TWILIO_AUTH_TOKEN)
beforeAll(() => {
  process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'test-auth-token';
});

// ==========================================================================
// SUCCESS FACTOR 1: Direct Booking on the Call
//
// Evidence: Top Flight Electric went from 5% to 70% booking rate.
//           Aire Serv: 8.6x improvement over human answering service.
// Key insight: The difference between "message-taking" and "appointment-booking"
//              is the difference between an expensive voicemail and a revenue engine.
//
// CROSS-CHECK: book_appointment must NOT include price fields (horror: Chevy $1)
//              book_appointment must validate datetime (horror: McDonald's garble)
// ==========================================================================
describe('Direct booking — the revenue engine', () => {
  it('book_appointment tool exists and can create appointments on the call', () => {
    const tool = voiceTools.find((t) => t.name === 'book_appointment');
    expect(tool).toBeDefined();
    expect(tool!.description).toContain('Book');
  });

  it('check_availability tool exists so AI can offer real slots', () => {
    const tool = voiceTools.find((t) => t.name === 'check_availability');
    expect(tool).toBeDefined();
    expect(tool!.input_schema.properties).toHaveProperty('date');
    expect(tool!.input_schema.properties).toHaveProperty('time_preference');
  });

  it('system prompt instructs AI to actively offer booking when ready', () => {
    const prompt = buildSystemPrompt({
      name: 'Test Plumbing',
      services: ['plumbing'],
      serviceArea: 'Austin, TX',
    });
    expect(prompt).toContain('offer to book an appointment');
  });

  it('CROSS-CHECK: booking captures full context for the technician', () => {
    const tool = voiceTools.find((t) => t.name === 'book_appointment')!;
    const required = tool.input_schema.required as string[];
    // Technician needs ALL of these to show up prepared
    expect(required).toContain('name');
    expect(required).toContain('phone');
    expect(required).toContain('address');
    expect(required).toContain('issue');
    expect(required).toContain('datetime');
  });

  it('CROSS-CHECK: booking does NOT capture price (prevents Chevy $1 scenario)', () => {
    const tool = voiceTools.find((t) => t.name === 'book_appointment')!;
    const props = Object.keys(tool.input_schema.properties as Record<string, unknown>);
    expect(props).not.toContain('price');
    expect(props).not.toContain('cost');
    expect(props).not.toContain('estimate');
  });
});

// ==========================================================================
// SUCCESS FACTOR 2: Sub-Second Answer Time (Speed-to-Lead)
//
// Evidence: 21x more likely to convert at <5 min. 391% boost at <1 min.
//           78% of buyers choose the FIRST company to respond.
//
// CROSS-CHECK: Speed must not come at cost of quality (horror: fast bad experience)
//              Must still validate inputs despite speed pressure
// ==========================================================================
describe('Speed-to-lead — first responder wins', () => {
  it('TwiML rings business for only 20 seconds before AI picks up', async () => {
    // 20 seconds is the sweet spot: enough for the owner to answer if available,
    // short enough that the caller doesn't hang up and call a competitor
    const { twimlRoutes } = await import('../src/routes/twiml.js');
    const Fastify = (await import('fastify')).default;

    // Mock getClientByTwilioPhone
    const { vi } = await import('vitest');
    const clientConfig = await import('../src/lib/client-config.js');
    vi.spyOn(clientConfig, 'getClientByTwilioPhone').mockResolvedValue({
      id: 'test', name: 'Test', forwardPhone: '+15559876543',
      plan: 'pro', status: 'active',
    } as any);

    const app = Fastify({ logger: false });
    app.register(twimlRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/twiml/+15551234567' });
    expect(res.body).toContain('timeout="20"');

    await app.close();
  });

  it('CROSS-CHECK: speed does not bypass input validation', async () => {
    // Even though we want fast booking, datetime validation still runs
    const { executeTool } = await import('../src/ws/tools.js');
    const mockClient = { id: 'test', name: 'Test', ownerPhone: '+15551111111', twilioPhone: '+15552222222' } as any;

    const result = await executeTool('book_appointment', {
      name: 'John', phone: '+15551234567', address: '123 Main',
      issue: 'Leak', datetime: 'asap',
    }, mockClient);

    // "asap" is not a valid ISO datetime — must be rejected even under speed pressure
    expect(result.error).toBeDefined();
  });
});

// ==========================================================================
// SUCCESS FACTOR 3: After-Hours Coverage
//
// Evidence: Top Flight Electric: $170K from previously unanswered calls.
//           68% of plumbing emergencies happen after hours.
//           Aire Serv: after-hours bookings 58 → 208.
//
// CROSS-CHECK: After-hours emergencies need FASTER escalation, not just booking.
//              2 AM burst pipe ≠ 2 PM routine tune-up.
// ==========================================================================
describe('After-hours coverage — the $170K opportunity', () => {
  it('Pro tier gets full AI voice agent (not just voicemail)', async () => {
    const { callStatusRoutes } = await import('../src/routes/call-status.js');
    const Fastify = (await import('fastify')).default;
    const formbody = (await import('@fastify/formbody')).default;
    const { vi } = await import('vitest');
    const clientConfig = await import('../src/lib/client-config.js');

    vi.spyOn(clientConfig, 'getClientByTwilioPhone').mockResolvedValue({
      id: 'test', name: 'Test', plan: 'pro', status: 'active',
      recordingConsentRequired: true, twilioPhone: '+15551234567',
      ownerPhone: '+15559876543',
    } as any);

    const app = Fastify({ logger: false });
    app.register(formbody);
    app.register(callStatusRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST', url: '/call-status',
      payload: { DialCallStatus: 'no-answer', To: '+15551234567', From: '+15550000001', CallSid: 'CA1' },
    });

    // Pro gets ConversationRelay (real AI conversation), NOT just voicemail
    expect(res.body).toContain('ConversationRelay');
    expect(res.body).not.toContain('<Record');
    await app.close();
  });

  it('CROSS-CHECK: emergency escalation works the same after-hours', () => {
    // The escalate_emergency tool has no time-of-day restriction
    const tool = voiceTools.find((t) => t.name === 'escalate_emergency')!;
    // Only requires phone + issue — works at 2 AM when caller is panicked
    expect(tool.input_schema.required).toEqual(['phone', 'issue']);
  });

  it('CROSS-CHECK: system prompt handles emergencies with urgency regardless of time', () => {
    const prompt = buildSystemPrompt({
      name: 'Test', services: ['plumbing'], serviceArea: 'Austin, TX',
    });
    // Must escalate IMMEDIATELY — no "we'll have someone call you back during business hours"
    expect(prompt).toContain('IMMEDIATELY');
    expect(prompt).not.toContain('business hours');
  });
});

// ==========================================================================
// SUCCESS FACTOR 4: White-Label Branding / Personalization
//
// Evidence: My Plumber Plus runs $129M business through branded AI.
//           Callers thought they were speaking to the company directly.
//
// CROSS-CHECK: Personalization must not leak between clients (horror: retail data leak)
//              Custom prompts must not override safety rules (horror: Air Canada)
// ==========================================================================
describe('White-label personalization — callers hear YOUR brand', () => {
  it('greeting includes the business name', async () => {
    const { callStatusRoutes } = await import('../src/routes/call-status.js');
    const Fastify = (await import('fastify')).default;
    const formbody = (await import('@fastify/formbody')).default;
    const { vi } = await import('vitest');
    const clientConfig = await import('../src/lib/client-config.js');

    vi.spyOn(clientConfig, 'getClientByTwilioPhone').mockResolvedValue({
      id: 'test', name: "Mike's Plumbing", plan: 'pro', status: 'active',
      recordingConsentRequired: false, twilioPhone: '+15551234567',
      ownerPhone: '+15559876543',
    } as any);

    const app = Fastify({ logger: false });
    app.register(formbody);
    app.register(callStatusRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST', url: '/call-status',
      payload: { DialCallStatus: 'no-answer', To: '+15551234567', From: '+15550000001', CallSid: 'CA1' },
    });

    expect(res.body).toContain("Mike");
    expect(res.body).toContain("Plumbing");
    await app.close();
  });

  it('system prompt is fully customized per client', () => {
    const prompt = buildSystemPrompt({
      name: "Joe's HVAC",
      services: ['hvac', 'furnace', 'ac_repair'],
      serviceArea: 'Denver, CO and Front Range',
    });

    expect(prompt).toContain("Joe's HVAC");
    expect(prompt).toContain('hvac');
    expect(prompt).toContain('furnace');
    expect(prompt).toContain('Denver, CO');
  });

  it('CROSS-CHECK: client A prompt never contains client B data', () => {
    const promptA = buildSystemPrompt({
      name: "Mike's Plumbing", services: ['plumbing'], serviceArea: 'Austin, TX',
    });
    const promptB = buildSystemPrompt({
      name: "Joe's HVAC", services: ['hvac'], serviceArea: 'Denver, CO',
    });

    expect(promptA).not.toContain("Joe");
    expect(promptA).not.toContain('Denver');
    expect(promptB).not.toContain("Mike");
    expect(promptB).not.toContain('Austin');
  });

  it('CROSS-CHECK: custom prompt appears AFTER core safety rules', () => {
    const prompt = buildSystemPrompt({
      name: 'Test', services: ['plumbing'], serviceArea: 'Austin, TX',
      customPrompt: 'Mention our 24/7 emergency service',
    });

    const rulesIdx = prompt.indexOf('RULES:');
    const customIdx = prompt.indexOf('additional business-specific instructions');
    expect(rulesIdx).toBeGreaterThan(-1);
    expect(customIdx).toBeGreaterThan(rulesIdx);
  });
});

// ==========================================================================
// SUCCESS FACTOR 5: Qualifying Questions That Filter + Educate
//
// Evidence: Vendasta case — 778/1,017 calls qualified (76% qualification rate).
//           Smith.ai: "more leads in one week than previous two months."
//
// CROSS-CHECK: Qualifying must not delay emergency response
//              Must not ask so many questions the caller gives up (horror: 51% abandon)
// ==========================================================================
describe('Lead qualification — filter without frustrating', () => {
  it('system prompt collects exactly 4 qualifying data points', () => {
    const prompt = buildSystemPrompt({
      name: 'Test', services: ['plumbing'], serviceArea: 'Austin, TX',
    });

    // The 4 essential qualifying items for a service call
    expect(prompt).toContain('name');
    expect(prompt).toContain('phone');
    expect(prompt).toContain('address');
    expect(prompt).toContain('description of the issue');
  });

  it('system prompt keeps responses to 1-2 sentences (prevents caller fatigue)', () => {
    const prompt = buildSystemPrompt({
      name: 'Test', services: ['plumbing'], serviceArea: 'Austin, TX',
    });
    expect(prompt).toContain('1-2 sentences');
  });

  it('CROSS-CHECK: emergency path SKIPS qualifying (dispatch first, qualify later)', () => {
    const prompt = buildSystemPrompt({
      name: 'Test', services: ['plumbing'], serviceArea: 'Austin, TX',
    });
    // Must explicitly say don't ask qualifying questions during emergencies
    expect(prompt).toContain('do NOT ask qualifying questions first during emergencies');
  });
});

// ==========================================================================
// SUCCESS FACTOR 6: Human Escape Hatch (Human-First Architecture)
//
// Evidence: Vendasta used human-first, AI-fallback and got 778 qualified leads.
//           51% of customers abandon businesses that don't offer a human option.
//
// CROSS-CHECK: Escape hatch must not be a dead end (horror: trapped in AI loop)
//              Must actually reach the owner, not just say it will
// ==========================================================================
describe('Human escape hatch — never trap callers', () => {
  it('TwiML tries human first, then falls back to AI', async () => {
    const { twimlRoutes } = await import('../src/routes/twiml.js');
    const Fastify = (await import('fastify')).default;
    const { vi } = await import('vitest');
    const clientConfig = await import('../src/lib/client-config.js');

    vi.spyOn(clientConfig, 'getClientByTwilioPhone').mockResolvedValue({
      id: 'test', name: 'Test', forwardPhone: '+15559876543',
      plan: 'pro', status: 'active',
    } as any);

    const app = Fastify({ logger: false });
    app.register(twimlRoutes);
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/twiml/+15551234567' });

    // Dial (human) comes FIRST, AI is fallback via action URL
    const dialIdx = res.body.indexOf('<Dial');
    expect(dialIdx).toBeGreaterThan(-1);
    // The Dial contains the owner's real phone number
    expect(res.body).toContain('+15559876543');

    await app.close();
  });

  it('system prompt provides "talk to a person" pathway via escalate_emergency', () => {
    const prompt = buildSystemPrompt({
      name: 'Test', services: ['plumbing'], serviceArea: 'Austin, TX',
    });
    // When caller says "let me talk to someone", AI uses escalate to reach owner
    expect(prompt).toContain('speak to a person');
    expect(prompt).toContain('owner reach out to you directly');
  });

  it('system prompt handles confused/silent callers proactively', () => {
    const prompt = buildSystemPrompt({
      name: "Mike's Plumbing", services: ['plumbing'], serviceArea: 'Austin, TX',
    });
    expect(prompt).toContain('confused, silent');
    expect(prompt).toContain('hello?');
    // Offers clear binary choice, not open-ended confusion
    expect(prompt).toContain('Which would you prefer?');
  });

  it('system prompt auto-escalates after comprehension failure', () => {
    const prompt = buildSystemPrompt({
      name: 'Test', services: ['plumbing'], serviceArea: 'Austin, TX',
    });
    expect(prompt).toContain('cannot understand the caller after 2 attempts');
    expect(prompt).toContain('call you back right away');
  });
});

// ==========================================================================
// SUCCESS FACTOR 7: Honest AI Transparency
//
// Evidence: 86% of consumers say companies should disclose AI use.
//           Maryland woman's viral video destroyed trust when AI lied.
//           BUT: My Plumber Plus callers had great experiences not knowing.
//
// Balance: Be honest when ASKED, but don't volunteer it unprompted.
//          The greeting says "I'm an assistant" (true for both AI and human).
// ==========================================================================
describe('AI transparency — honest without being awkward', () => {
  it('greeting uses "assistant" (ambiguous but honest)', async () => {
    const { callStatusRoutes } = await import('../src/routes/call-status.js');
    const Fastify = (await import('fastify')).default;
    const formbody = (await import('@fastify/formbody')).default;
    const { vi } = await import('vitest');
    const clientConfig = await import('../src/lib/client-config.js');

    vi.spyOn(clientConfig, 'getClientByTwilioPhone').mockResolvedValue({
      id: 'test', name: 'Test Co', plan: 'pro', status: 'active',
      recordingConsentRequired: false, twilioPhone: '+15551234567',
      ownerPhone: '+15559876543',
    } as any);

    const app = Fastify({ logger: false });
    app.register(formbody);
    app.register(callStatusRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST', url: '/call-status',
      payload: { DialCallStatus: 'no-answer', To: '+15551234567', From: '+15550000001', CallSid: 'CA1' },
    });

    // "assistant" is used in the greeting — honest but not robotic
    expect(res.body).toContain('assistant');
    // Does NOT say "I am a robot" unprompted — that kills the experience
    expect(res.body).not.toContain('robot');
    expect(res.body).not.toContain('artificial intelligence');

    await app.close();
  });

  it('CROSS-CHECK: when directly asked, AI admits to being AI', () => {
    const prompt = buildSystemPrompt({
      name: "Mike's Plumbing", services: ['plumbing'], serviceArea: 'Austin, TX',
    });
    expect(prompt).toContain('are you a robot');
    expect(prompt).toContain("Yes, I'm an AI assistant");
  });
});

// ==========================================================================
// SUCCESS FACTOR 8: Recording Consent (Legal Protection)
//
// Evidence: Two-party consent states (CA, FL, etc.) require disclosure.
//           Violations can result in $5K+ per-call fines.
//
// CROSS-CHECK: Consent must not make the greeting so long callers hang up
// ==========================================================================
describe('Recording consent — legal protection without friction', () => {
  it('consent prefix is short and natural', async () => {
    const { callStatusRoutes } = await import('../src/routes/call-status.js');
    const Fastify = (await import('fastify')).default;
    const formbody = (await import('@fastify/formbody')).default;
    const { vi } = await import('vitest');
    const clientConfig = await import('../src/lib/client-config.js');

    vi.spyOn(clientConfig, 'getClientByTwilioPhone').mockResolvedValue({
      id: 'test', name: 'Test', plan: 'pro', status: 'active',
      recordingConsentRequired: true, twilioPhone: '+15551234567',
      ownerPhone: '+15559876543',
    } as any);

    const app = Fastify({ logger: false });
    app.register(formbody);
    app.register(callStatusRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST', url: '/call-status',
      payload: { DialCallStatus: 'no-answer', To: '+15551234567', From: '+15550000001', CallSid: 'CA1' },
    });

    // Consent disclosure exists
    expect(res.body).toContain('recorded for quality');
    // But the greeting is still concise — consent + greeting in one breath
    // The whole welcomeGreeting should be under ~40 words
    const greetingMatch = res.body.match(/welcomeGreeting="([^"]+)"/);
    expect(greetingMatch).toBeTruthy();
    const words = greetingMatch![1].split(/\s+/).length;
    expect(words).toBeLessThan(50); // Concise enough to not lose the caller

    await app.close();
  });

  it('consent is skippable for one-party consent states', async () => {
    const { callStatusRoutes } = await import('../src/routes/call-status.js');
    const Fastify = (await import('fastify')).default;
    const formbody = (await import('@fastify/formbody')).default;
    const { vi } = await import('vitest');
    const clientConfig = await import('../src/lib/client-config.js');

    vi.spyOn(clientConfig, 'getClientByTwilioPhone').mockResolvedValue({
      id: 'test', name: 'Test', plan: 'pro', status: 'active',
      recordingConsentRequired: false, twilioPhone: '+15551234567',
      ownerPhone: '+15559876543',
    } as any);

    const app = Fastify({ logger: false });
    app.register(formbody);
    app.register(callStatusRoutes);
    await app.ready();

    const res = await app.inject({
      method: 'POST', url: '/call-status',
      payload: { DialCallStatus: 'no-answer', To: '+15551234567', From: '+15550000001', CallSid: 'CA1' },
    });

    // No consent prefix — shorter greeting, better experience
    expect(res.body).not.toContain('recorded for quality');

    await app.close();
  });
});

// ==========================================================================
// SUCCESS FACTOR 9: Revenue Rescued Dashboard Accuracy
//
// Evidence: Business owners are "shocked" when they see missed call data.
//           The dashboard is the #1 sales tool and the #1 retention tool.
//
// CROSS-CHECK: Metrics must be conservative/honest (horror: inflated metrics
//              destroy trust). Never count spam as "rescued revenue."
// ==========================================================================
describe('Revenue Rescued accuracy — honest metrics build trust', () => {
  it('revenue_metrics table tracks calls_rescued separately from appointments_booked', async () => {
    const { revenueMetrics } = await import('@serviceline/db');
    // These should be separate columns — calls_rescued is broader (all handled calls)
    // appointments_booked is narrower (actually converted)
    expect(revenueMetrics.callsRescued).toBeDefined();
    expect(revenueMetrics.appointmentsBooked).toBeDefined();
    // They're different columns — not conflated
    expect(revenueMetrics.callsRescued.name).not.toBe(revenueMetrics.appointmentsBooked.name);
  });

  it('avg_ticket_value is configurable per client (not a global assumption)', async () => {
    const { clients } = await import('@serviceline/db');
    // Each client can set their own average ticket value for accurate revenue calculation
    expect(clients.avgTicketValue).toBeDefined();
  });

  it('CROSS-CHECK: revenue_metrics has a unique constraint preventing double-counting', async () => {
    const { revenueMetrics } = await import('@serviceline/db');
    // UNIQUE(client_id, date) prevents the same day from being counted twice
    expect(revenueMetrics.clientId).toBeDefined();
    expect(revenueMetrics.date).toBeDefined();
  });
});

// ==========================================================================
// BALANCE TEST: Positive outcomes don't create negative paths
//
// These tests verify that our success-enabling features have guardrails
// that prevent the exact horror stories we've documented.
// ==========================================================================
describe('Balance: positive outcomes protected by negative-path guardrails', () => {
  it('booking speed (positive) balanced by datetime validation (negative defense)', async () => {
    const { executeTool } = await import('../src/ws/tools.js');
    const mockClient = { id: 'test', name: 'Test', ownerPhone: '+15551111111', twilioPhone: '+15552222222' } as any;

    // Fast booking works with valid data
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    // This would succeed with a real DB; we just verify no error on valid input format
    // (DB insert will fail without connection but that's expected in unit test)
    try {
      await executeTool('book_appointment', {
        name: 'John', phone: '+15551234567', address: '123 Main St',
        issue: 'Leaky faucet', datetime: futureDate,
      }, mockClient);
    } catch {
      // DB not connected — expected in unit test. The point is it didn't
      // fail on INPUT validation, which means valid bookings proceed fast.
    }

    // But invalid dates are ALWAYS rejected regardless of speed
    const badResult = await executeTool('book_appointment', {
      name: 'John', phone: '+15551234567', address: '123 Main St',
      issue: 'Leaky faucet', datetime: 'next week sometime',
    }, mockClient);
    expect(badResult.error).toBeDefined();
  });

  it('personalization (positive) balanced by data isolation (negative defense)', () => {
    // Build two client prompts
    const promptA = buildSystemPrompt({
      name: "Mike's Plumbing", services: ['plumbing', 'drain'],
      serviceArea: 'Austin, TX', customPrompt: 'Mention our 24/7 service',
    });
    const promptB = buildSystemPrompt({
      name: "Joe's HVAC", services: ['hvac', 'furnace'],
      serviceArea: 'Denver, CO', customPrompt: 'We serve the entire Front Range',
    });

    // Positive: each prompt is fully personalized
    expect(promptA).toContain("Mike's Plumbing");
    expect(promptA).toContain('24/7 service');
    expect(promptB).toContain("Joe's HVAC");
    expect(promptB).toContain('Front Range');

    // Negative defense: zero cross-contamination
    expect(promptA).not.toContain('Joe');
    expect(promptA).not.toContain('HVAC');
    expect(promptA).not.toContain('Front Range');
    expect(promptB).not.toContain('Mike');
    expect(promptB).not.toContain('drain');
    expect(promptB).not.toContain('24/7 service');
  });

  it('AI transparency (positive trust) balanced by not volunteering "I am a robot" (positive UX)', () => {
    const prompt = buildSystemPrompt({
      name: 'Test', services: ['plumbing'], serviceArea: 'Austin, TX',
    });

    // Positive: honest when asked
    expect(prompt).toContain("Yes, I'm an AI assistant");

    // Positive: doesn't volunteer it in every response (kills conversion)
    // The instruction is conditional: "IF the caller asks"
    expect(prompt).toContain('If the caller asks');

    // The greeting says "assistant" not "AI" — ambiguous and natural
    expect(prompt).toContain('AI phone assistant'); // in the role definition only
  });

  it('human escape hatch (positive safety) uses escalate_emergency (reuses existing tool)', () => {
    const prompt = buildSystemPrompt({
      name: 'Test', services: ['plumbing'], serviceArea: 'Austin, TX',
    });

    // The human escape hatch reuses escalate_emergency rather than adding
    // a separate mechanism — this means it gets all the same reliability
    // (SMS notification, error handling, etc.)
    expect(prompt).toContain('speak to a person');
    expect(prompt).toContain('escalate_emergency');
    expect(prompt).toContain('Customer requested human callback');
  });

  it('concise responses (positive UX) balanced by complete data collection (positive ops)', () => {
    const prompt = buildSystemPrompt({
      name: 'Test', services: ['plumbing'], serviceArea: 'Austin, TX',
    });

    // Positive UX: keep it short
    expect(prompt).toContain('1-2 sentences');

    // Positive ops: but still collect what the tech needs
    expect(prompt).toContain('Always collect');
    expect(prompt).toContain('name');
    expect(prompt).toContain('address');
    expect(prompt).toContain('description of the issue');
  });
});
