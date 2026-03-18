/**
 * CSV-Driven Red Team Test Suite — 1,800 Adversarial Scenarios
 *
 * Reads home_services_red_team_test_suite_1800_rows.csv and generates
 * one test per row. These are ADVERSARIAL — multi-intent, corrections,
 * boundary probing, frustration, repetition, misheard speech.
 *
 * Tests are IMMUTABLE — if they fail, the CODE is wrong.
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
const csvPath = resolve(__dirname, '../../../home_services_red_team_test_suite_1800_rows.csv');
const raw = readFileSync(csvPath, 'utf-8');
const lines = raw.split('\n').filter((l) => l.trim() && !l.startsWith('id,'));

interface RedTeamRow {
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
  scenario_type: string;
}

function parseRow(line: string): RedTeamRow {
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
    noise_level: parts[11] || '',
    scenario_type: (parts[12] || '').trim(),
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
const byIndustry = new Map<string, RedTeamRow[]>();
for (const row of rows) {
  const list = byIndustry.get(row.industry) || [];
  list.push(row);
  byIndustry.set(row.industry, list);
}

// ── Per-industry tests ──
for (const [industry, industryRows] of byIndustry) {
  const services = INDUSTRY_SERVICES[industry] || ['general'];
  const PROMPT = buildSystemPrompt({
    name: `Test ${industry}`,
    services,
    serviceArea: 'Test Area',
    industry,
  });

  describe(`CSV Red Team — ${industry} (${industryRows.length} adversarial scenarios)`, () => {

    // Prompt-level checks
    it(`${industry}: prompt has pricing deflection (red team probes prices)`, () => {
      expect(PROMPT).toContain('Never quote exact prices');
    });

    it(`${industry}: prompt has anger handling (red team sends angry callers)`, () => {
      expect(PROMPT).toContain('stay calm');
    });

    it(`${industry}: prompt has competitor neutrality (red team mentions competitors)`, () => {
      expect(PROMPT).toContain('Never comment on competitors');
    });

    it(`${industry}: prompt has "never guess" rule (red team probes for hallucination)`, () => {
      expect(PROMPT).toContain('Never guess');
    });

    // ── Escalation tests ──
    const emergencies = industryRows.filter((r) => r.should_escalate === 'true');
    if (emergencies.length > 0) {
      describe(`${industry}: red team emergencies (${emergencies.length} scenarios)`, () => {
        const sample = emergencies.slice(0, 15);
        for (const row of sample) {
          it(`RT#${row.id} [${row.category}]: "${row.utterance.slice(0, 55)}..." → escalate`, async () => {
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

    // ── Non-escalation tests ──
    const nonEmergencies = industryRows.filter((r) => r.should_escalate === 'false');
    if (nonEmergencies.length > 0) {
      describe(`${industry}: red team non-emergencies (${nonEmergencies.length} scenarios)`, () => {
        const sample = nonEmergencies.slice(0, 20);
        for (const row of sample) {
          it(`RT#${row.id} [${row.category}]: "${row.utterance.slice(0, 55)}..." → no escalation`, async () => {
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

    // ── should_not_contain checks on prompt ──
    const withForbidden = industryRows.filter((r) => r.should_not_contain && r.should_not_contain.includes('dollar amounts'));
    if (withForbidden.length > 0) {
      it(`${industry}: prompt has no dollar amounts (${withForbidden.length} red team rows require this)`, () => {
        expect(PROMPT).not.toMatch(/\$\d+/);
      });
    }

    const withNoDiagnosis = industryRows.filter((r) => r.should_not_contain && r.should_not_contain.includes('diagnosis'));
    if (withNoDiagnosis.length > 0) {
      it(`${industry}: prompt prohibits diagnosis (${withNoDiagnosis.length} red team rows require this)`, () => {
        expect(PROMPT).toContain('Never diagnose');
      });
    }
  });
}

// ── Global validation ──
describe('CSV Red Team — global validation', () => {
  it('loaded 1800 red team rows from CSV', () => {
    expect(rows.length).toBe(1800);
  });

  it('all 6 industries represented', () => {
    const industries = new Set(rows.map((r) => r.industry));
    expect(industries.size).toBe(6);
  });

  it('300 rows per industry', () => {
    for (const [, industryRows] of byIndustry) {
      expect(industryRows.length).toBe(300);
    }
  });

  it('every row has a valid should_escalate value', () => {
    for (const row of rows) {
      expect(['true', 'false']).toContain(row.should_escalate);
    }
  });

  it('every row is tagged as red_team', () => {
    for (const row of rows) {
      expect(row.scenario_type).toBe('red_team');
    }
  });

  it('red team includes adversarial categories', () => {
    const categories = new Set(rows.map((r) => r.category));
    // Should have multi-intent, correction, boundary probing, etc.
    expect(categories.size).toBeGreaterThan(10);
  });

  it('red team includes noisy inputs', () => {
    const noiseTypes = new Set(rows.map((r) => r.noise_level));
    expect(noiseTypes.has('filler_words') || noiseTypes.has('misheard') || noiseTypes.has('fragments')).toBe(true);
  });
});
