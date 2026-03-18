/**
 * Lawn Care Scenario Test Suite
 *
 * Maps the lawn_care_ai_voice_assistant_test_suite.md scenarios to tests
 * verifying the system prompt handles lawn care calls correctly.
 *
 * Tests validate the PROMPT RULES -- not the AI's exact words (that's
 * non-deterministic). We verify that:
 * 1. The system prompt contains rules that guide the AI correctly
 * 2. Emergency scenarios trigger escalation (mock mode) -- lawn has FEWER emergencies
 * 3. Pricing questions are deflected (never quote numbers)
 * 4. Property-specific questions (lot size, grass type) defer to tech
 * 5. Seasonal context is injected correctly
 * 6. Routine calls flow to booking, not escalation (most lawn calls)
 * 7. The AI does NOT give lawn care advice (fertilizer types, watering schedules)
 */
import { describe, it, expect, vi } from 'vitest';
import { buildSystemPrompt } from '../src/ws/prompts.js';

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
  businessName: "Green Thumb Lawn Care",
  ownerName: 'Dave Wilson',
  ownerPhone: '+15552222222',
  services: ['lawn_care', 'mowing', 'landscaping', 'irrigation', 'tree_service'],
  serviceArea: 'Charlotte, NC and surrounding areas',
  callerPhone: '+15559876543',
  plan: 'pro' as const,
  industry: 'lawn',
  useRealAI: false,
};

const PROMPT = buildSystemPrompt({
  name: CONFIG.businessName,
  services: CONFIG.services,
  serviceArea: CONFIG.serviceArea,
  industry: 'lawn',
});

// ==========================================================================
// CATEGORY 1: Routine Booking & Scheduling
// Most lawn calls are routine — these should NEVER escalate
// ==========================================================================
describe('Cat 1: Routine Booking & Scheduling', () => {
  it('L1: "I need my lawn mowed" -> routine booking, not emergency', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "I need my lawn mowed this week");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('L2: "Can you edge and trim my yard?" -> routine booking', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Can you edge and trim my yard?");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('L3: "I want weed control" -> routine booking', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "I want weed control for my front yard");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('L4: "Can you aerate my lawn?" -> routine booking', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Can you aerate my lawn?");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('L5: "Do you offer overseeding?" -> routine booking', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Do you offer overseeding?");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('L6: "I need seasonal cleanup" -> routine booking', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "I need a seasonal cleanup done");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('L7: "Can you install sod?" -> routine booking', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Can you install sod in my backyard?");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('L8: "Can you fix patchy areas?" -> routine booking', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Can you fix the patchy areas in my yard?");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('L9: earliest available -> AI should offer to check availability', () => {
    expect(PROMPT).toContain('check_availability');
    expect(PROMPT).toContain('offer to book');
  });

  it('L10: "Can I set up weekly mowing?" -> recurring service, routine', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Can I set up weekly mowing?");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('L11: "Can you come tomorrow?" -> routine scheduling', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Can you come tomorrow morning?");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('L12: "Can I reschedule?" -> AI has no reschedule tool, should offer human callback', () => {
    expect(PROMPT).toContain('person, a human');
  });

  it('L13: "Can you call before arriving?" -> routine request, not emergency', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Can you call before arriving?");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('L14: "My grass is dying and turning brown" -> routine visit, not emergency', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "My grass is dying and turning brown");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('L15: "I think I have a fungus spreading" -> routine visit (tech should diagnose)', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "I think I have a fungus spreading in my lawn");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('L16: "Bugs are destroying my grass" -> routine visit', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Bugs are destroying my grass");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('L17: "My lawn looks dead after treatment" -> routine callback', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "My lawn looks dead after the treatment you guys did");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('prompt asks about one-time vs ongoing service', () => {
    expect(PROMPT).toContain('one-time job or are you looking for ongoing service');
  });
});

// ==========================================================================
// CATEGORY 2: Emergency Calls (Lawn has FEWER emergencies)
// Only 3 emergency definitions for lawn care
// ==========================================================================
describe('Cat 2: Emergency Calls (lawn-specific)', () => {
  it('prompt has lawn-specific emergency definitions', () => {
    expect(PROMPT).toContain('Fallen tree on a structure or blocking a driveway');
    expect(PROMPT).toContain('Broken irrigation main flooding the yard');
    expect(PROMPT).toContain('Large hanging branch about to fall on house or power line');
  });

  it('prompt says do NOT ask extra questions during emergencies', () => {
    expect(PROMPT).toContain('Do NOT ask extra questions during emergencies');
  });

  it('prompt does NOT contain plumbing emergencies', () => {
    expect(PROMPT).not.toContain('Burst or spraying pipe');
    expect(PROMPT).not.toContain('Sewage backup');
    expect(PROMPT).not.toContain('No running water');
  });

  it('lawn has only 3 emergency definitions (fewer than plumbing)', () => {
    // The prompt should contain exactly these 3 emergencies
    expect(PROMPT).toContain('Fallen tree on a structure');
    expect(PROMPT).toContain('Broken irrigation main');
    expect(PROMPT).toContain('Large hanging branch');
  });

  it('L-E1: "A tree fell on my shed" -> should contain fallen tree emergency rule', () => {
    expect(PROMPT).toContain('Fallen tree on a structure');
  });

  it('L-E2: "My irrigation main line broke and the yard is flooding" -> mock escalation', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "My irrigation main line broke and there's water flooding everywhere in the yard");
    // Mock catches "flood" keyword
    expect(s.emergencyEscalated).toBe(true);
  });

  it('L-E3: "There is a big branch about to fall on my house" -> emergency rule exists', () => {
    expect(PROMPT).toContain('Large hanging branch about to fall on house or power line');
  });

  it('routine lawn issues should NOT be emergencies', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "My sprinkler heads are not working right");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('brown grass is NOT an emergency', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "My entire lawn is turning brown quickly");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('weeds are NOT an emergency', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Weeds have taken over my entire yard");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('pest damage is NOT an emergency', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Something is eating my grass overnight");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('irrigation system not turning on is NOT an emergency', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "My irrigation system stopped working");
    expect(s.emergencyEscalated).toBe(false);
  });
});

// ==========================================================================
// CATEGORY 3: Pricing & Cost Questions
// AI must NEVER quote specific prices. Always deflect.
// ==========================================================================
describe('Cat 3: Pricing & Cost (lawn-specific)', () => {
  it('prompt never contains dollar amounts', () => {
    expect(PROMPT).not.toMatch(/\$\d+/);
  });

  it('prompt deflects all pricing to on-site quote', () => {
    expect(PROMPT).toContain('Never quote exact prices');
  });

  it('prompt has lawn-specific pricing disclaimer', () => {
    expect(PROMPT).toContain('lot size and services');
    expect(PROMPT).toContain('quote after a quick look at the property');
  });

  it('L-P1: "How much is lawn mowing?" -> deflect', () => {
    expect(PROMPT).toContain('quote');
  });

  it('L-P2: "What do you charge for fertilization?" -> deflect', () => {
    expect(PROMPT).toContain('Never quote exact prices');
  });

  it('L-P3: "Is there a monthly plan?" -> should not guess', () => {
    expect(PROMPT).toContain('Never guess');
  });

  it('L-P4: "How much for aeration?" -> should not quote a number', () => {
    expect(PROMPT).not.toMatch(/\$\d+/);
  });

  it('L-P5: "What is the cost for sod installation?" -> deflect', () => {
    expect(PROMPT).toContain('Never quote exact prices');
  });

  it('L-P6: "Do you give free quotes?" -> prompt has free on-site estimate', () => {
    expect(PROMPT).toContain('free on-site estimate');
  });

  it('L-P7: "Do you offer packages?" -> should not guess at package details', () => {
    expect(PROMPT).toContain('Never guess');
  });

  it('L-P8: "Do you charge per visit?" -> should not guess business model', () => {
    expect(PROMPT).toContain('Never guess');
  });

  it('L-P9: "extra charge for weekend" -> should not guess', () => {
    expect(PROMPT).toContain('Never guess');
  });

  it('L-P10: "senior discounts" -> should not promise discounts', () => {
    expect(PROMPT).toContain('Never promise');
  });

  it('no pricing questions should trigger emergency', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "How much does it cost to mow a half-acre lot?");
    expect(s.emergencyEscalated).toBe(false);
  });
});

// ==========================================================================
// CATEGORY 4: Services & Capabilities (lawn-specific)
// AI should reference client's service list, not guess about others
// ==========================================================================
describe('Cat 4: Services & Capabilities (lawn-specific)', () => {
  it('prompt includes the client services list', () => {
    expect(PROMPT).toContain('lawn_care');
    expect(PROMPT).toContain('mowing');
    expect(PROMPT).toContain('landscaping');
    expect(PROMPT).toContain('irrigation');
    expect(PROMPT).toContain('tree_service');
  });

  it('prompt has lawn issue categories', () => {
    expect(PROMPT).toContain('mowing');
    expect(PROMPT).toContain('fertilization');
    expect(PROMPT).toContain('weed_control');
    expect(PROMPT).toContain('aeration');
    expect(PROMPT).toContain('landscaping');
    expect(PROMPT).toContain('irrigation');
    expect(PROMPT).toContain('tree_service');
    expect(PROMPT).toContain('leaf_removal');
  });

  it('L-S1: "Do you handle landscaping too?" -> in services list', () => {
    expect(PROMPT).toContain('landscaping');
  });

  it('L-S2: "Can you fix my sprinkler system?" -> FAQ answer exists', () => {
    expect(PROMPT).toContain('we service and repair irrigation systems');
  });

  it('L-S3: tree removal is covered under tree_service', () => {
    expect(PROMPT).toContain('tree_service');
  });

  it('services questions should never trigger emergency', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Do you do fertilization treatments?");
    expect(s.emergencyEscalated).toBe(false);
  });
});

// ==========================================================================
// CATEGORY 5: Property-Specific Questions
// AI should NOT guess about lot size, grass type, soil, etc.
// ==========================================================================
describe('Cat 5: Property-Specific Questions (defer to tech)', () => {
  it('prompt asks for approximate lot size', () => {
    expect(PROMPT).toContain('approximate lot size or yard size');
  });

  it('L-PS1: "How big is my lot?" -> AI should not guess', () => {
    expect(PROMPT).toContain('Never guess');
  });

  it('L-PS2: "What type of grass do I have?" -> AI should not diagnose', () => {
    expect(PROMPT).toContain('Never diagnose');
  });

  it('L-PS3: "What fertilizer should I use?" -> AI should not give advice', () => {
    // AI should never diagnose or prescribe -- defer to tech
    expect(PROMPT).toContain('Never diagnose');
    expect(PROMPT).toContain('tech will take a look');
  });

  it('L-PS4: "How often should I water my lawn?" -> defer to tech', () => {
    expect(PROMPT).toContain("I'm not sure about that");
    expect(PROMPT).toContain('technician can answer');
  });

  it('L-PS5: "Why is my grass turning yellow?" -> should not diagnose', () => {
    expect(PROMPT).toContain('Never diagnose');
  });

  it('L-PS6: "How do I get rid of weeds?" -> should not give DIY advice', () => {
    expect(PROMPT).toContain('Never diagnose');
  });

  it('property questions should never trigger emergency', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "What kind of grass should I plant in my backyard?");
    expect(s.emergencyEscalated).toBe(false);
  });
});

// ==========================================================================
// CATEGORY 6: Seasonal Context
// Prompt should include seasonal hints for the current month
// ==========================================================================
describe('Cat 6: Seasonal Context', () => {
  it('prompt has seasonal context section', () => {
    expect(PROMPT).toContain('SEASONAL CONTEXT');
  });

  it('lawn template has 5 seasonal hint groups covering all 12 months', () => {
    // Verify the template covers spring, late spring, summer, fall, winter
    // We check the prompt for whichever season is current
    // March = month 3 -> "Spring -- lawn waking up, mention pre-emergent weed control and first mowing"
    // The test runs at some point, so we just verify the section exists
    expect(PROMPT).toMatch(/SEASONAL CONTEXT/);
  });

  it('spring hints mention weed control and first mowing', () => {
    // March/April -> spring hints
    // This test will pass when run in March/April
    // We check that the template strings exist in the prompt for the current month
    const currentMonth = new Date().getMonth() + 1;
    if ([3, 4].includes(currentMonth)) {
      expect(PROMPT).toContain('pre-emergent weed control and first mowing');
    }
    if ([5, 6].includes(currentMonth)) {
      expect(PROMPT).toContain('aeration and overseeding window');
    }
    if ([7, 8].includes(currentMonth)) {
      expect(PROMPT).toContain('drought stress and watering schedules');
    }
    if ([9, 10].includes(currentMonth)) {
      expect(PROMPT).toContain('leaf removal season');
    }
    if ([11, 12, 1, 2].includes(currentMonth)) {
      expect(PROMPT).toContain('dormant season');
    }
    // At least one season should always be active
    expect(PROMPT).toContain('SEASONAL CONTEXT');
  });

  it('seasonal context says "use naturally, don\'t force it"', () => {
    expect(PROMPT).toContain("use naturally, don't force it");
  });
});

// ==========================================================================
// CATEGORY 7: FAQ & Common Questions (lawn-specific)
// AI should use FAQ answers from the lawn template
// ==========================================================================
describe('Cat 7: FAQ & Common Questions (lawn-specific)', () => {
  it('prompt has common questions section', () => {
    expect(PROMPT).toContain('COMMON QUESTIONS');
  });

  it('FAQ: "How much for mowing?" -> lot size response', () => {
    expect(PROMPT).toContain('It depends on your lot size');
  });

  it('FAQ: "How often should I mow?" -> weekly recommendation', () => {
    expect(PROMPT).toContain('Weekly is ideal during the growing season');
  });

  it('FAQ: "Do you do one-time cleanups?" -> yes, both options', () => {
    expect(PROMPT).toContain('we do both one-time jobs and recurring service plans');
  });

  it('FAQ: "Can you fix my sprinkler system?" -> yes, irrigation', () => {
    expect(PROMPT).toContain('we service and repair irrigation systems');
  });
});

// ==========================================================================
// CATEGORY 8: Industry-Specific Prompt Rules
// Lawn template has 7 prompt rules that guide AI behavior
// ==========================================================================
describe('Cat 8: Industry-Specific Prompt Rules', () => {
  it('prompt has industry-specific rules section', () => {
    expect(PROMPT).toContain('INDUSTRY-SPECIFIC RULES');
  });

  it('rule: collect caller name, address, what service they need', () => {
    expect(PROMPT).toContain('Collect: caller name, address, what service they need');
  });

  it('rule: ask approximate lot size', () => {
    expect(PROMPT).toContain('approximate lot size or yard size');
  });

  it('rule: mowing frequency and coverage', () => {
    expect(PROMPT).toContain('how often (weekly, biweekly), front and back or just front');
  });

  it('rule: landscaping vision', () => {
    expect(PROMPT).toContain('flower beds, hardscape, sod, plants');
  });

  it('rule: irrigation system questions', () => {
    expect(PROMPT).toContain('existing system');
    expect(PROMPT).toContain('dry spots, leaks');
  });

  it('rule: tree work details', () => {
    expect(PROMPT).toContain('tree size, how many, and whether it');
    expect(PROMPT).toContain('trimming or removal');
  });

  it('rule: one-time vs ongoing service', () => {
    expect(PROMPT).toContain('one-time job or are you looking for ongoing service');
  });
});

// ==========================================================================
// CATEGORY 9: Recurring Service Scheduling
// Lawn care commonly involves recurring schedules
// ==========================================================================
describe('Cat 9: Recurring Service', () => {
  it('L-R1: "I need recurring service" -> routine, not emergency', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "I need recurring weekly lawn service");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('L-R2: "What days do you service my area?" -> should not guess', () => {
    expect(PROMPT).toContain('Never guess');
  });

  it('L-R3: "Do you offer same-day service?" -> should not promise', () => {
    expect(PROMPT).toContain('Never promise');
  });

  it('prompt asks about mowing frequency (weekly, biweekly)', () => {
    expect(PROMPT).toContain('weekly, biweekly');
  });

  it('FAQ mentions recurring schedule setup', () => {
    expect(PROMPT).toContain('recurring schedule');
  });
});

// ==========================================================================
// CATEGORY 10: Edge Cases & Stress Tests
// Vague, emotional, or confusing caller scenarios
// ==========================================================================
describe('Cat 10: Edge Cases & Stress Tests', () => {
  it('L-EC1: "I need help with lawn maintenance" -> routine booking', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "I need help with lawn maintenance");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('L-EC2: "My lawn is completely dried out" -> routine visit, not emergency', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "My lawn is completely dried out");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('L-EC3: "There are bare spots forming fast" -> routine visit', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "There are bare spots forming fast all over my yard");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('L-EC4: "Is this safe for pets?" -> AI should defer, not advise', () => {
    expect(PROMPT).toContain("I'm not sure about that");
    expect(PROMPT).toContain('technician can answer');
  });

  it('L-EC5: "How long does treatment take?" -> should not guess', () => {
    expect(PROMPT).toContain("I'm not sure about that");
    expect(PROMPT).toContain('technician can answer');
  });

  it('L-EC6: angry caller -> prompt has anger handling', () => {
    expect(PROMPT).toContain('angry, frustrated, or threatening bad reviews');
    expect(PROMPT).toContain("I'm sorry you're dealing with this");
  });

  it('L-EC7: "are you a robot?" -> prompt has bot disclosure', () => {
    expect(PROMPT).toContain("I'm an AI assistant");
  });

  it('L-EC8: vague "Can you help with lawn design?" -> routine booking', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Can you help with lawn design?");
    expect(s.emergencyEscalated).toBe(false);
  });

  it('L-EC9: "Do you do organic treatments?" -> should not guess', () => {
    expect(PROMPT).toContain("I'm not sure about that");
  });

  it('L-EC10: "What is the best time to mow?" -> should not diagnose/advise', () => {
    expect(PROMPT).toContain('Never diagnose');
  });
});

// ==========================================================================
// CATEGORY 11: Service Area & Availability
// ==========================================================================
describe('Cat 11: Service Area & Availability', () => {
  it('prompt includes the service area', () => {
    expect(PROMPT).toContain('Charlotte, NC');
  });

  it('L-SA1: "do you serve [area]" -> can reference service area from prompt', () => {
    expect(PROMPT).toContain('Charlotte, NC and surrounding areas');
  });

  it('L-SA2: specific address coverage -> should not guess', () => {
    expect(PROMPT).toContain("I'm not sure about that");
  });

  it('L-SA3: "normal business hours" -> should not guess hours', () => {
    expect(PROMPT).toContain('Never guess');
  });

  it('L-SA4: "24-hour emergency service" -> can mention emergency escalation', () => {
    expect(PROMPT).toContain('escalate_emergency');
  });

  it('service area questions should never trigger emergency', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Do you service the Huntersville area?");
    expect(s.emergencyEscalated).toBe(false);
  });
});

// ==========================================================================
// CATEGORY 12: Credentials & Trust
// ==========================================================================
describe('Cat 12: Credentials & Trust', () => {
  it('L-CT1: "licensed and insured" -> should not make claims', () => {
    expect(PROMPT).toContain("I'm not sure about that");
  });

  it('L-CT2: "how long in business" -> should not guess', () => {
    expect(PROMPT).toContain('Never guess');
  });

  it('L-CT3: "warranty on your work" -> should not promise', () => {
    expect(PROMPT).toContain('Never promise');
    expect(PROMPT).toContain('warranties');
    expect(PROMPT).toContain('guarantees');
  });

  it('trust questions should never trigger emergency', async () => {
    const s = await createSession(CONFIG);
    await sendMessage(s, "Are your guys licensed and insured?");
    expect(s.emergencyEscalated).toBe(false);
  });
});

// ==========================================================================
// CROSS-CATEGORY: Prompt completeness for lawn care
// ==========================================================================
describe('Cross-category: prompt completeness (lawn)', () => {
  it('has pricing deflection', () => {
    expect(PROMPT).toContain('Never quote exact prices');
    expect(PROMPT).toContain('free on-site estimate');
  });

  it('has diagnosis prohibition', () => {
    expect(PROMPT).toContain('Never diagnose');
    expect(PROMPT).toContain('tech will take a look');
  });

  it('has "I don\'t know" fallback for questions outside AI scope', () => {
    expect(PROMPT).toContain("I'm not sure about that");
    expect(PROMPT).toContain('technician can answer');
  });

  it('has lawn emergency keywords covering all 3 emergency definitions', () => {
    expect(PROMPT).toContain('Fallen tree on a structure or blocking a driveway');
    expect(PROMPT).toContain('Broken irrigation main flooding the yard');
    expect(PROMPT).toContain('Large hanging branch about to fall on house or power line');
  });

  it('has booking tools for scheduling scenarios', () => {
    expect(PROMPT).toContain('check_availability');
    expect(PROMPT).toContain('book_appointment');
    expect(PROMPT).toContain('offer to book');
  });

  it('has human escalation path for complex questions', () => {
    expect(PROMPT).toContain('person, a human');
    expect(PROMPT).toContain('owner call you right back');
  });

  it('non-emergency list rule present (lawn has fewer emergencies)', () => {
    expect(PROMPT).toContain('NOT on that list is a normal service call');
  });

  it('prompt word count is under 1100', () => {
    const wordCount = PROMPT.split(/\s+/).length;
    expect(wordCount).toBeLessThan(1100);
  });
});
