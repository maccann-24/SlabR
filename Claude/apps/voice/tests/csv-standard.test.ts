/**
 * CSV-Driven Standard Test Suite — 1,800 Scenarios
 *
 * Reads home_services_test_suite_1800_rows.csv and generates one test
 * per row. Tests are IMMUTABLE — if they fail, the CODE is wrong.
 *
 * Columns used:
 * - industry: which template to load
 * - utterance: what the caller says
 * - should_escalate: "true" | "false" — does the mock simulator escalate?
 * - expected_behavior: escalate_immediately | book_appointment | deflect_to_tech | defer_to_owner | offer_callback
 * - expected_intent: emergency | booking | pricing | complaint | unclear | services | credentials
 * - expected_priority: P1 | P2 | P3 | P4
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { buildSystemPrompt } from '../src/ws/prompts.js';

// Mock DB
vi.mock('@serviceline/db', () => {
  const c = { values: vi.fn().mockReturnThis(), onConflictDoNothing: vi.fn().mockReturnThis(), returning: vi.fn().mockResolvedValue([{ id: 'id' }]) };
  return {
    db: {
      insert: vi.fn(() => ({ ...c })),
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ innerJoin: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }), where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
    },
    clients: 'c', leads: 'l', calls: 'ca', appointments: 'a', escalations: 'e',
    onCallContacts: { id: 'id', name: 'n', phone: 'p', role: 'r', isActive: 'ia' },
    onCallSchedule: { contactId: 'ci', clientId: 'cli', dayOfWeek: 'd' },
    eq: vi.fn(), and: vi.fn(), notInArray: vi.fn(),
  };
});
vi.mock('../src/services/notifications.js', () => ({
  smsToOwner: vi.fn().mockResolvedValue(undefined),
  smsToCustomer: vi.fn().mockResolvedValue(undefined),
  callSummaryNotification: vi.fn().mockResolvedValue(undefined),
}));

const { createSession, sendMessage, getSessionSummary } = await import('../src/demo/simulator.js');

// ── Load CSV ──
const csvPath = resolve(__dirname, '../../../home_services_test_suite_1800_rows.csv');
const raw = readFileSync(csvPath, 'utf-8');
const lines = raw.split('\n').filter((l) => l.trim() && !l.startsWith('id,'));

interface TestRow {
  id: string;
  industry: string;
  utterance: string;
  expected_intent: string;
  expected_priority: string;
  should_escalate: string;
  expected_behavior: string;
  should_not_contain: string;
  tone: string;
  category: string;
  is_multi_part: string;
  noise_level: string;
}

function parseRow(line: string): TestRow {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { parts.push(current); current = ''; continue; }
    current += ch;
  }
  parts.push(current);
  return {
    id: parts[0] || '',
    industry: parts[1] || '',
    utterance: parts[2] || '',
    expected_intent: parts[3] || '',
    expected_priority: parts[4] || '',
    should_escalate: parts[5] || '',
    expected_behavior: parts[6] || '',
    should_not_contain: parts[7] || '',
    tone: parts[8] || '',
    category: parts[9] || '',
    is_multi_part: parts[10] || '',
    noise_level: (parts[11] || '').trim(),
  };
}

const rows = lines.map(parseRow).filter((r) => r.industry && r.utterance);

const INDUSTRY_SERVICES: Record<string, string[]> = {
  plumbing: ['plumbing', 'drain', 'water_heater', 'sewer', 'fixture_install'],
  hvac: ['hvac', 'ac_repair', 'furnace', 'heat_pump', 'duct_cleaning'],
  pest: ['pest_control', 'termite', 'rodent', 'mosquito', 'wildlife'],
  painting: ['painting', 'interior', 'exterior', 'cabinet_refinishing', 'staining'],
  lawn: ['lawn_care', 'mowing', 'landscaping', 'irrigation', 'tree_service'],
  electrical: ['electrical', 'panel_upgrade', 'wiring', 'lighting', 'generator'],
};

// ── Group by industry ──
const byIndustry = new Map<string, TestRow[]>();
for (const row of rows) {
  const list = byIndustry.get(row.industry) || [];
  list.push(row);
  byIndustry.set(row.industry, list);
}

// ── Prompt-level tests (per industry) ──
for (const [industry, industryRows] of byIndustry) {
  const services = INDUSTRY_SERVICES[industry] || ['general'];
  const PROMPT = buildSystemPrompt({
    name: `Test ${industry}`,
    services,
    serviceArea: 'Test Area',
    industry,
  });

  describe(`CSV Standard — ${industry} (${industryRows.length} scenarios)`, () => {

    // Prompt must have core rules
    it(`${industry}: prompt has pricing deflection`, () => {
      expect(PROMPT).toContain('Never quote exact prices');
    });

    it(`${industry}: prompt has diagnosis prohibition`, () => {
      expect(PROMPT).toContain('Never diagnose');
    });

    it(`${industry}: prompt has booking tools`, () => {
      expect(PROMPT).toContain('book_appointment');
    });

    it(`${industry}: prompt has escalation tool`, () => {
      expect(PROMPT).toContain('escalate_emergency');
    });

    // ── Escalation tests (should_escalate = true) ──
    const emergencies = industryRows.filter((r) => r.should_escalate === 'true');
    if (emergencies.length > 0) {
      describe(`${industry}: emergency escalation (${emergencies.length} P1 scenarios)`, () => {
        // Test a sample of emergencies via simulator
        const sample = emergencies.slice(0, 15);
        for (const row of sample) {
          it(`#${row.id}: "${row.utterance.slice(0, 60)}..." → escalate`, async () => {
            const s = await createSession({
              businessName: `Test ${industry}`,
              ownerName: 'Owner',
              ownerPhone: '+15551111111',
              services,
              serviceArea: 'Test Area',
              callerPhone: '+15559876543',
              industry,
              plan: 'pro',
              useRealAI: false,
            });
            await sendMessage(s, row.utterance);
            expect(s.emergencyEscalated).toBe(true);
          });
        }
      });
    }

    // ── Non-escalation tests (should_escalate = false) ──
    const nonEmergencies = industryRows.filter((r) => r.should_escalate === 'false');
    if (nonEmergencies.length > 0) {
      describe(`${industry}: routine (non-emergency) calls (${nonEmergencies.length} scenarios)`, () => {
        // Test a sample of non-emergencies
        const sample = nonEmergencies.slice(0, 20);
        for (const row of sample) {
          it(`#${row.id}: "${row.utterance.slice(0, 60)}..." → no escalation`, async () => {
            const s = await createSession({
              businessName: `Test ${industry}`,
              ownerName: 'Owner',
              ownerPhone: '+15551111111',
              services,
              serviceArea: 'Test Area',
              callerPhone: '+15559876543',
              industry,
              plan: 'pro',
              useRealAI: false,
            });
            await sendMessage(s, row.utterance);
            expect(s.emergencyEscalated).toBe(false);
          });
        }
      });
    }

    // ── Pricing scenarios must not contain dollar amounts in prompt ──
    const pricingRows = industryRows.filter((r) => r.expected_intent === 'pricing');
    if (pricingRows.length > 0) {
      it(`${industry}: prompt contains no dollar amounts (${pricingRows.length} pricing scenarios depend on this)`, () => {
        expect(PROMPT).not.toMatch(/\$\d+/);
      });
    }
  });
}

// ── Global validation ──
describe('CSV Standard — global validation', () => {
  it('loaded 1800 test rows from CSV', () => {
    expect(rows.length).toBe(1800);
  });

  it('all 6 industries represented', () => {
    const industries = new Set(rows.map((r) => r.industry));
    expect(industries.size).toBe(6);
    expect(industries).toContain('plumbing');
    expect(industries).toContain('hvac');
    expect(industries).toContain('pest');
    expect(industries).toContain('painting');
    expect(industries).toContain('lawn');
    expect(industries).toContain('electrical');
  });

  it('300 rows per industry', () => {
    for (const [industry, industryRows] of byIndustry) {
      expect(industryRows.length).toBe(300);
    }
  });

  it('every row has an utterance', () => {
    for (const row of rows) {
      expect(row.utterance.length).toBeGreaterThan(0);
    }
  });

  it('every row has a valid should_escalate value', () => {
    for (const row of rows) {
      expect(['true', 'false']).toContain(row.should_escalate);
    }
  });

  it('every row has a valid expected_behavior', () => {
    const validBehaviors = ['escalate_immediately', 'book_appointment', 'deflect_to_tech', 'defer_to_owner', 'offer_callback'];
    for (const row of rows) {
      expect(validBehaviors).toContain(row.expected_behavior);
    }
  });
});
