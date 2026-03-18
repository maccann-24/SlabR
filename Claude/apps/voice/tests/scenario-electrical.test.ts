/**
 * Electrical Scenario Test Suite
 *
 * Every scenario covers the electrical industry template: emergencies,
 * safety boundaries, routine service requests, pricing deflection,
 * seasonal context, common scenarios, and knowledge boundaries.
 *
 * Tests validate the PROMPT RULES -- not the AI's exact words (that's
 * non-deterministic). We verify that:
 * 1. The system prompt contains rules that guide the AI correctly
 * 2. Emergency scenarios are covered by prompt definitions
 * 3. Pricing questions are deflected (never quote numbers)
 * 4. Safety boundaries: AI must NEVER tell callers to touch anything electrical
 * 5. Routine calls flow to booking, not escalation
 * 6. Electrical-specific FAQ, seasonal hints, and industry rules appear in the prompt
 */
import { describe, it, expect, vi } from 'vitest';
import { buildSystemPrompt } from '../src/ws/prompts.js';
import { getTemplate } from '@serviceline/templates';

// Mock DB for simulator
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
          innerJoin: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      }),
    },
    clients: 'clients', leads: 'leads', calls: 'calls',
    appointments: 'appointments', escalations: 'escalations',
    onCallContacts: { id: 'id', name: 'name', phone: 'phone', role: 'role', isActive: 'is_active' },
    onCallSchedule: { contactId: 'cid', clientId: 'clid', dayOfWeek: 'dow' },
    eq: vi.fn(), and: vi.fn(), notInArray: vi.fn(),
  };
});
vi.mock('../src/services/notifications.js', () => ({
  smsToOwner: vi.fn().mockResolvedValue(undefined),
  smsToCustomer: vi.fn().mockResolvedValue(undefined),
  callSummaryNotification: vi.fn().mockResolvedValue(undefined),
}));

const { createSession, sendMessage } = await import('../src/demo/simulator.js');

const CONFIG = {
  businessName: "Spark Electric Co",
  ownerName: 'Mike Chen',
  ownerPhone: '+15553333333',
  services: ['electrical', 'panel_upgrade', 'wiring', 'lighting', 'generator'],
  serviceArea: 'Austin, TX and surrounding areas',
  callerPhone: '+15551234567',
  plan: 'pro' as const,
  useRealAI: false,
  industry: 'electrical',
};

const PROMPT = buildSystemPrompt({
  name: CONFIG.businessName,
  services: CONFIG.services,
  serviceArea: CONFIG.serviceArea,
  industry: 'electrical',
});

// ==========================================================================
// CATEGORY 1: Emergency Triage (Electrical emergencies are DANGEROUS)
// ==========================================================================
describe('Cat 1: Electrical Emergency Triage', () => {
  it('E1: sparking outlet -> prompt covers sparking emergency', () => {
    expect(PROMPT).toContain('Sparking outlet or switch');
  });

  it('E2: burning smell from panel -> prompt covers burning smell emergency', () => {
    expect(PROMPT).toContain('Burning smell from panel or outlet');
  });

  it('E3: partial power outage -> prompt covers partial outage emergency', () => {
    expect(PROMPT).toContain('Partial power outage in the home');
  });

  it('E4: exposed wiring -> prompt covers exposed wires emergency', () => {
    expect(PROMPT).toContain('Exposed or damaged wiring');
  });

  it('E5: panel buzzing or warm -> prompt covers panel buzzing emergency', () => {
    expect(PROMPT).toContain('Panel buzzing, humming, or warm to the touch');
  });

  it('E6: lights flickering throughout house -> prompt covers flickering emergency', () => {
    expect(PROMPT).toContain('Lights flickering throughout the house');
  });

  it('E7: power out after storm with wire damage -> prompt covers storm emergency', () => {
    expect(PROMPT).toContain('Power out after a storm with visible wire damage');
  });

  it('prompt has emergency escalation rule: do NOT ask extra questions', () => {
    expect(PROMPT).toContain('Do NOT ask extra questions during emergencies');
  });

  it('prompt lists all 7 electrical emergency definitions', () => {
    expect(PROMPT).toContain('Sparking outlet or switch');
    expect(PROMPT).toContain('Burning smell from panel or outlet');
    expect(PROMPT).toContain('Partial power outage in the home');
    expect(PROMPT).toContain('Exposed or damaged wiring');
    expect(PROMPT).toContain('Panel buzzing, humming, or warm to the touch');
    expect(PROMPT).toContain('Lights flickering throughout the house');
    expect(PROMPT).toContain('Power out after a storm with visible wire damage');
  });

  it('non-emergency electrical items should NOT escalate in mock mode', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "I need a new outlet installed in my kitchen");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('routine flickering single fixture is NOT an emergency', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "One light in my bathroom flickers sometimes");
    expect(s.emergencyEscalated).toBe(false);
  });
});

// ==========================================================================
// CATEGORY 2: Safety Boundaries (NEVER tell caller to touch anything electrical)
// ==========================================================================
describe('Cat 2: Electrical Safety Boundaries', () => {
  it('prompt says never suggest DIY electrical work', () => {
    expect(PROMPT).toContain('Never suggest DIY electrical work');
  });

  it('prompt mentions safety risk for DIY', () => {
    expect(PROMPT).toContain('safety risk');
  });

  it('prompt has safety concern escalation rule', () => {
    expect(PROMPT).toContain('If any safety concern: escalate immediately');
  });

  it('prompt always asks about burning smell, sparks, panel warmth', () => {
    expect(PROMPT).toContain('do you smell burning');
    expect(PROMPT).toContain('Do you see sparks');
    expect(PROMPT).toContain('Is the panel warm');
  });

  it('prompt does NOT contain instructions to check breakers or reset anything', () => {
    // The AI must NEVER tell someone to open their panel or reset a breaker
    // Note: FAQ says "flip the breaker" for a sparking outlet — that's a STOP instruction, not DIY repair
    expect(PROMPT).not.toMatch(/check your breaker/i);
    expect(PROMPT).not.toMatch(/reset the breaker/i);
    expect(PROMPT).not.toMatch(/open your panel/i);
    expect(PROMPT).not.toMatch(/check your electrical panel/i);
  });

  it('prompt does NOT tell callers to touch wiring', () => {
    expect(PROMPT).not.toMatch(/touch the wire/i);
    expect(PROMPT).not.toMatch(/handle the wire/i);
    expect(PROMPT).not.toMatch(/move the wire/i);
  });

  it('prompt has general "Never diagnose" rule', () => {
    expect(PROMPT).toContain('Never diagnose');
  });

  it('"are you a robot" -> prompt has safe response with business name', () => {
    expect(PROMPT).toContain("Yep, I'm an AI assistant for Spark Electric Co");
  });
});

// ==========================================================================
// CATEGORY 3: Routine Service Requests
// ==========================================================================
describe('Cat 3: Routine Electrical Service Requests', () => {
  it('R1: outlet install -> routine, not emergency', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "I need a new outlet installed in my kitchen");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('R2: lighting install -> routine', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "I want to install recessed lighting in my living room");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('R3: panel upgrade -> routine', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "I need to upgrade my electrical panel");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('R4: ceiling fan install -> routine', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Can you install a ceiling fan in my bedroom?");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('R5: generator install -> routine', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "I want a whole house generator installed");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('R6: EV charger install -> routine', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Can you install an EV charger in my garage?");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('R7: outdoor lighting -> routine', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "I need landscape lighting installed in my backyard");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('R8: GFCI outlet -> routine', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "I need GFCI outlets installed in my bathroom");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('R9: smoke detector -> routine', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Can you install new smoke detectors throughout my house?");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('R10: whole house rewire -> routine', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "My house has old knob and tube wiring, I need it rewired");
    expect(s.emergencyEscalated).toBe(false);
  });
});

// ==========================================================================
// CATEGORY 4: Pricing Deflection
// ==========================================================================
describe('Cat 4: Electrical Pricing Deflection', () => {
  it('prompt never contains dollar amounts', () => {
    expect(PROMPT).not.toMatch(/\$\d+/);
  });

  it('prompt deflects all pricing to on-site quote', () => {
    expect(PROMPT).toContain('Never quote exact prices');
  });

  it('P1: panel upgrade cost -> prompt has pricing disclaimer', () => {
    expect(PROMPT).toContain('assess the job on-site and give you upfront pricing');
  });

  it('P2: EV charger cost -> FAQ has safe answer', () => {
    expect(PROMPT).toContain("assess your panel capacity and install the right charger");
  });

  it('P3: pricing questions should not trigger emergency', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "How much does it cost to upgrade my panel?");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('P4: prompt has free on-site estimate deflection', () => {
    expect(PROMPT).toContain('free on-site estimate');
  });

  it('P5: prompt says never guess', () => {
    expect(PROMPT).toContain('Never guess');
  });

  it('P6: "do you charge a service fee" -> should not guess', () => {
    expect(PROMPT).toContain('Never guess');
  });

  it('P7: "how much for an outlet" -> no dollar amount in prompt', () => {
    expect(PROMPT).not.toMatch(/\$\d+/);
    expect(PROMPT).toContain('Never quote exact prices');
  });
});

// ==========================================================================
// CATEGORY 5: Seasonal Context
// ==========================================================================
describe('Cat 5: Electrical Seasonal Context', () => {
  it('prompt includes seasonal context section when in-season', () => {
    // March (month 3) is NOT in any electrical seasonal range:
    // [4,5,6], [7,8], [10,11], [12,1,2]
    // So no seasonal hints should be present for March
    const currentMonth = new Date().getMonth() + 1;
    const electricalSeasonalMonths = [4, 5, 6, 7, 8, 10, 11, 12, 1, 2];
    if (electricalSeasonalMonths.includes(currentMonth)) {
      expect(PROMPT).toContain('SEASONAL CONTEXT');
    } else {
      // Month 3 or 9 — no seasonal hints for electrical
      expect(PROMPT).not.toContain('SEASONAL CONTEXT');
    }
  });

  it('spring/summer hint (months 4,5,6) talks about generator installs and outdoor lighting', () => {
    const tmpl = getTemplate('electrical')!;
    const springHint = tmpl.seasonalHints.find((h) => h.months.includes(4));
    expect(springHint?.hint).toContain('generator installs before storm season');
    expect(springHint?.hint).toContain('outdoor lighting');
  });

  it('summer hint (months 7,8) mentions AC circuit overloads and panel upgrades', () => {
    const tmpl = getTemplate('electrical')!;
    const summerHint = tmpl.seasonalHints.find((h) => h.months.includes(7));
    expect(summerHint?.hint).toContain('AC circuit overloads');
    expect(summerHint?.hint).toContain('panel upgrade demand');
  });

  it('fall hint (months 10,11) mentions holiday lighting and generator service', () => {
    const tmpl = getTemplate('electrical')!;
    const fallHint = tmpl.seasonalHints.find((h) => h.months.includes(10));
    expect(fallHint?.hint).toContain('holiday lighting');
    expect(fallHint?.hint).toContain('generator service before winter');
  });

  it('winter hint (months 12,1,2) mentions heater circuit issues and storm outages', () => {
    const tmpl = getTemplate('electrical')!;
    const winterHint = tmpl.seasonalHints.find((h) => h.months.includes(12));
    expect(winterHint?.hint).toContain('heater circuit issues');
    expect(winterHint?.hint).toContain('storm-related outages');
  });
});

// ==========================================================================
// CATEGORY 6: Common Electrical Scenarios
// ==========================================================================
describe('Cat 6: Common Electrical Scenarios', () => {
  it('SC1: outlet not working -> routine', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "One of my outlets stopped working");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('SC2: flickering lights in one room -> routine (not whole-house)', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "The lights in my kitchen keep flickering");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('SC3: tripping breaker -> routine', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "My breaker keeps tripping when I use the microwave");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('SC4: hot outlet or switch -> routine (but prompt asks safety questions)', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "The outlet in my bedroom feels warm to the touch");
    expect(s.emergencyEscalated).toBe(false);
    // Prompt should guide AI to ask about burning smell / sparks
    expect(PROMPT).toContain('do you smell burning');
  });

  it('SC5: knob-and-tube rewire -> routine', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "We have knob and tube wiring and want to get it replaced");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('SC6: adding circuits -> routine', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "I need to add more circuits to my panel");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('SC7: light switch not working -> routine', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "My light switch in the hallway doesn't work anymore");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('SC8: previous electrician didn\'t fix it -> routine', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "The last electrician didn't fix the problem, my outlets still don't work");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('SC9: angry customer -> prompt says escalate to owner', () => {
    expect(PROMPT).toContain("Let me get the owner on the phone");
  });

  it('SC10: confused caller saying "hello?" -> prompt has recovery', () => {
    expect(PROMPT).toContain("Hey, I'm here!");
  });
});

// ==========================================================================
// CATEGORY 7: Knowledge Boundaries (defer to electrician)
// ==========================================================================
describe('Cat 7: Electrical Knowledge Boundaries', () => {
  it('prompt includes electrical services list', () => {
    expect(PROMPT).toContain('electrical');
    expect(PROMPT).toContain('panel_upgrade');
    expect(PROMPT).toContain('wiring');
    expect(PROMPT).toContain('lighting');
    expect(PROMPT).toContain('generator');
  });

  it('prompt includes electrical issue categories', () => {
    expect(PROMPT).toContain('panel_breaker');
    expect(PROMPT).toContain('outlets_switches');
    expect(PROMPT).toContain('lighting');
    expect(PROMPT).toContain('wiring');
    expect(PROMPT).toContain('generator');
    expect(PROMPT).toContain('ev_charger');
    expect(PROMPT).toContain('ceiling_fan');
  });

  it('K1: wire gauge question -> should not guess, defer to tech', () => {
    expect(PROMPT).toContain("I'm not sure about that");
    expect(PROMPT).toContain('technician can answer');
  });

  it('K2: code requirements -> should not guess', () => {
    expect(PROMPT).toContain('Never guess');
  });

  it('K3: permit questions -> should not promise', () => {
    expect(PROMPT).toContain('Never promise');
  });

  it('K4: "licensed and insured" -> should not make claims', () => {
    expect(PROMPT).toContain("I'm not sure about that");
  });

  it('K5: "how long in business" -> should not guess', () => {
    expect(PROMPT).toContain('Never guess');
  });

  it('K6: warranty questions -> should not promise', () => {
    expect(PROMPT).toContain('Never promise');
    expect(PROMPT).toContain('warranties');
  });

  it('K7: commercial vs residential -> should not guess capability', () => {
    expect(PROMPT).toContain("I'm not sure about that");
  });

  it('K8: services questions should never trigger emergency', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Do you install ceiling fans?");
    expect(s.emergencyEscalated).toBe(false);
  });
});

// ==========================================================================
// CATEGORY 8: Electrical-Specific FAQ in Prompt
// ==========================================================================
describe('Cat 8: Electrical FAQ Answers in Prompt', () => {
  it('FAQ: outlet safety -> safe answer present', () => {
    expect(PROMPT).toContain('If you see sparking or smell burning, stop using it and flip the breaker');
  });

  it('FAQ: panel upgrade cost -> safe deflection answer present', () => {
    expect(PROMPT).toContain('It depends on your current setup and needs');
    expect(PROMPT).toContain('electrician will give you a quote on-site');
  });

  it('FAQ: EV charger -> safe answer present', () => {
    expect(PROMPT).toContain("Absolutely");
    expect(PROMPT).toContain('assess your panel capacity');
    expect(PROMPT).toContain('install the right charger for your vehicle');
  });

  it('FAQ: power keeps tripping -> safe diagnostic deflection', () => {
    expect(PROMPT).toContain('overloaded circuit or a faulty breaker');
    expect(PROMPT).toContain('tech will diagnose it safely');
  });

  it('all 4 electrical FAQ entries appear in the COMMON QUESTIONS section', () => {
    expect(PROMPT).toContain('COMMON QUESTIONS');
    expect(PROMPT).toContain('Is it safe to keep using this outlet?');
    expect(PROMPT).toContain('How much does a panel upgrade cost?');
    expect(PROMPT).toContain('Can you install an EV charger?');
    expect(PROMPT).toContain('My power keeps tripping');
  });
});

// ==========================================================================
// CATEGORY 9: Electrical Industry-Specific Prompt Rules
// ==========================================================================
describe('Cat 9: Electrical Industry-Specific Prompt Rules', () => {
  it('prompt has INDUSTRY-SPECIFIC RULES section', () => {
    expect(PROMPT).toContain('INDUSTRY-SPECIFIC RULES');
  });

  it('rule: collect caller name, address, what\'s going on', () => {
    expect(PROMPT).toContain('Collect: caller name, address');
    expect(PROMPT).toContain('which fixture, which room, symptoms');
  });

  it('rule: always ask about burning, sparks, panel warmth', () => {
    expect(PROMPT).toContain('ALWAYS ask: do you smell burning');
    expect(PROMPT).toContain('Do you see sparks');
    expect(PROMPT).toContain('Is the panel warm');
  });

  it('rule: safety concern escalation', () => {
    expect(PROMPT).toContain('If any safety concern: escalate immediately');
  });

  it('rule: outlet troubleshooting questions', () => {
    expect(PROMPT).toContain('one outlet or multiple');
    expect(PROMPT).toContain('GFCI or regular');
    expect(PROMPT).toContain('when it stopped working');
  });

  it('rule: panel upgrade questions', () => {
    expect(PROMPT).toContain('home age');
    expect(PROMPT).toContain('current panel size');
    expect(PROMPT).toContain("what's prompting the upgrade");
  });

  it('rule: EV charger questions', () => {
    expect(PROMPT).toContain('which vehicle');
    expect(PROMPT).toContain('where they want it mounted');
    expect(PROMPT).toContain('how far from the panel');
  });

  it('rule: never suggest DIY electrical work', () => {
    expect(PROMPT).toContain('Never suggest DIY electrical work');
    expect(PROMPT).toContain('safety risk');
  });
});

// ==========================================================================
// CATEGORY 10: Scheduling & Booking
// ==========================================================================
describe('Cat 10: Electrical Scheduling & Booking', () => {
  it('S1: "can you come today" -> routine', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Can you come out today to look at my wiring?");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('S2: "weekend availability" -> routine', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Do you have any weekend availability for a panel upgrade?");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('S3: "can I reschedule" -> should offer human callback', () => {
    expect(PROMPT).toContain('person, a human');
  });

  it('S4: "how long does service take" -> should not guess', () => {
    expect(PROMPT).toContain("I'm not sure about that");
    expect(PROMPT).toContain('technician can answer');
  });

  it('prompt has booking tools for scheduling', () => {
    expect(PROMPT).toContain('check_availability');
    expect(PROMPT).toContain('book_appointment');
    expect(PROMPT).toContain('offer to book');
  });

  it('prompt has escalation for emergency after-hours', () => {
    expect(PROMPT).toContain('escalate_emergency');
  });
});

// ==========================================================================
// CATEGORY 11: Service Area
// ==========================================================================
describe('Cat 11: Electrical Service Area', () => {
  it('prompt includes the service area', () => {
    expect(PROMPT).toContain('Austin, TX and surrounding areas');
  });

  it('service area questions should never trigger emergency', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Do you serve the Round Rock area?");
    expect(s.emergencyEscalated).toBe(false);
  });
});

// ==========================================================================
// CROSS-CATEGORY: Electrical Prompt Completeness
// ==========================================================================
describe('Cross-category: Electrical prompt completeness', () => {
  it('has pricing deflection with electrical-specific disclaimer', () => {
    expect(PROMPT).toContain('Never quote exact prices');
    expect(PROMPT).toContain('assess the job on-site and give you upfront pricing');
  });

  it('has diagnosis prohibition', () => {
    expect(PROMPT).toContain('Never diagnose');
    expect(PROMPT).toContain('tech will take a look');
  });

  it('has "I don\'t know" fallback for questions outside AI scope', () => {
    expect(PROMPT).toContain("I'm not sure about that");
    expect(PROMPT).toContain('technician can answer');
  });

  it('has all 7 electrical emergency definitions', () => {
    expect(PROMPT).toContain('Sparking outlet or switch');
    expect(PROMPT).toContain('Burning smell from panel or outlet');
    expect(PROMPT).toContain('Partial power outage in the home');
    expect(PROMPT).toContain('Exposed or damaged wiring');
    expect(PROMPT).toContain('Panel buzzing, humming, or warm to the touch');
    expect(PROMPT).toContain('Lights flickering throughout the house');
    expect(PROMPT).toContain('Power out after a storm with visible wire damage');
  });

  it('has booking tools', () => {
    expect(PROMPT).toContain('check_availability');
    expect(PROMPT).toContain('book_appointment');
    expect(PROMPT).toContain('offer to book');
  });

  it('has human escalation path', () => {
    expect(PROMPT).toContain('person, a human');
    expect(PROMPT).toContain('owner call you right back');
  });

  it('non-emergency electrical items are excluded from emergency list', () => {
    expect(PROMPT).toContain('NOT on that list is a normal service call');
  });

  it('prompt word count is under 1100', () => {
    const wordCount = PROMPT.split(/\s+/).length;
    expect(wordCount).toBeLessThan(1100);
  });

  it('electrical-specific: prompt does NOT contain HVAC emergency definitions', () => {
    expect(PROMPT).not.toContain('No heat when outside temperature is below 40');
    expect(PROMPT).not.toContain('Gas smell near furnace');
    expect(PROMPT).not.toContain('Furnace making loud banging or popping sounds');
  });

  it('electrical-specific: prompt does NOT contain plumbing emergency definitions', () => {
    expect(PROMPT).not.toContain('Burst or spraying pipe');
    expect(PROMPT).not.toContain('Sewage backup into the home');
    expect(PROMPT).not.toContain('No running water to entire house');
  });
});
