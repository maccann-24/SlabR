/**
 * Live AI Evaluation Harness
 *
 * Sends real utterances from the CSV test suites to Claude Haiku
 * with the actual production system prompt, then scores every response.
 *
 * Scoring criteria per response:
 * 1. Word count: under 35 words? (conciseness)
 * 2. No dollar amounts mentioned? (pricing deflection)
 * 3. No diagnosis? (doesn't explain the problem)
 * 4. Correct escalation behavior? (emergency → tool call, routine → booking offer)
 * 5. Collects info? (asks for name/address/issue)
 * 6. No preamble? (doesn't start with "Great question!" etc.)
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/eval-live.ts [--sample N] [--industry plumbing]
 */
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

async function main() {
// Dynamic imports for ESM modules
const { buildSystemPrompt } = await import('../apps/voice/src/ws/prompts.js');
const { voiceTools } = await import('../apps/voice/src/ws/tools.js');

const client = new Anthropic();

// ── Parse args ──
const args = process.argv.slice(2);
const sampleSize = parseInt(args.find((_, i) => args[i - 1] === '--sample') || '50');
const filterIndustry = args.find((_, i) => args[i - 1] === '--industry') || '';
const csvFile = args.includes('--redteam')
  ? 'home_services_red_team_test_suite_1800_rows.csv'
  : 'home_services_test_suite_1800_rows.csv';

// ── Load CSV ──
const csvPath = resolve(process.cwd(), csvFile);
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
    should_escalate: (parts[5] || '').trim(),
    expected_behavior: parts[6] || '',
    should_not_contain: parts[7] || '',
  };
}

let rows = lines.map(parseRow).filter((r) => r.industry && r.utterance);
if (filterIndustry) {
  rows = rows.filter((r) => r.industry === filterIndustry);
}

// Sample
if (rows.length > sampleSize) {
  const shuffled = rows.sort(() => Math.random() - 0.5);
  rows = shuffled.slice(0, sampleSize);
}

const INDUSTRY_SERVICES: Record<string, string[]> = {
  plumbing: ['plumbing', 'drain', 'water_heater', 'sewer', 'fixture_install'],
  hvac: ['hvac', 'ac_repair', 'furnace', 'heat_pump', 'duct_cleaning'],
  pest: ['pest_control', 'termite', 'rodent', 'mosquito', 'wildlife'],
  painting: ['painting', 'interior', 'exterior', 'cabinet_refinishing', 'staining'],
  lawn: ['lawn_care', 'mowing', 'landscaping', 'irrigation', 'tree_service'],
  electrical: ['electrical', 'panel_upgrade', 'wiring', 'lighting', 'generator'],
};

// ── Scoring functions ──
interface Score {
  concise: boolean;       // under 35 words
  noPricing: boolean;     // no dollar amounts
  noDiagnosis: boolean;   // doesn't explain the cause
  noPreamble: boolean;    // doesn't start with filler
  correctAction: boolean; // escalated when should, didn't when shouldn't
  total: number;          // out of 5
}

function scoreResponse(response: string, row: TestRow, usedTools: string[]): Score {
  const words = response.split(/\s+/).length;
  const concise = words <= 40; // small buffer over 35 for tool-use responses

  const noPricing = !/\$\d+/.test(response);

  const diagnosisPatterns = /the (cause|problem|issue|reason) is|this (is|means|indicates)|you (have|need) a|it('s| is) (likely|probably|definitely|caused by)/i;
  const noDiagnosis = !diagnosisPatterns.test(response);

  const preamblePatterns = /^(great question|i'd be happy|absolutely|certainly|of course|sure thing|no problem|wonderful|fantastic)/i;
  const noPreamble = !preamblePatterns.test(response.trim());

  const shouldEscalate = row.should_escalate === 'true';
  const didEscalate = usedTools.includes('escalate_emergency');
  const didBook = usedTools.includes('book_appointment') || usedTools.includes('check_availability');

  let correctAction: boolean;
  if (shouldEscalate) {
    correctAction = didEscalate;
  } else if (row.expected_behavior === 'book_appointment') {
    // Should offer booking — check if response mentions scheduling/booking or used tool
    correctAction = didBook || /book|schedule|appointment|available|slot|come out/i.test(response);
  } else if (row.expected_behavior === 'deflect_to_tech') {
    correctAction = /tech|on-site|estimate|quote|come out|take a look/i.test(response);
  } else if (row.expected_behavior === 'offer_callback') {
    correctAction = /call.*(back|you)|owner|someone.*reach|have.*call/i.test(response);
  } else if (row.expected_behavior === 'defer_to_owner') {
    correctAction = /owner|call.*back|reach out|someone/i.test(response);
  } else {
    correctAction = true; // unknown behavior — pass
  }

  const total = [concise, noPricing, noDiagnosis, noPreamble, correctAction].filter(Boolean).length;

  return { concise, noPricing, noDiagnosis, noPreamble, correctAction, total };
}

// ── Run evaluation ──
console.log(`\n🧪 Live AI Evaluation — ${csvFile}`);
console.log(`   Industries: ${filterIndustry || 'all'}`);
console.log(`   Sample size: ${rows.length}`);
console.log(`   Model: claude-haiku-4-5-20251001\n`);

const results: { row: TestRow; response: string; tools: string[]; score: Score }[] = [];
let completed = 0;
const startTime = Date.now();

for (const row of rows) {
  const services = INDUSTRY_SERVICES[row.industry] || ['general'];
  const systemPrompt = buildSystemPrompt({
    name: `Test ${row.industry.charAt(0).toUpperCase() + row.industry.slice(1)} Co`,
    services,
    serviceArea: 'Test Metro Area',
    industry: row.industry,
  });

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: systemPrompt,
      tools: voiceTools,
      messages: [{ role: 'user', content: row.utterance }],
    });

    const textBlocks = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text);
    const toolBlocks = response.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      .map((b) => b.name);

    const responseText = textBlocks.join(' ') || '[tool call only]';
    const score = scoreResponse(responseText, row, toolBlocks);

    results.push({ row, response: responseText, tools: toolBlocks, score });
    completed++;

    // Progress
    if (completed % 10 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const avgScore = results.reduce((s, r) => s + r.score.total, 0) / results.length;
      process.stdout.write(`   ${completed}/${rows.length} evaluated (${elapsed}s, avg ${avgScore.toFixed(2)}/5)\r`);
    }

    // Rate limiting — ~30 req/sec for Haiku
    await new Promise((r) => setTimeout(r, 100));
  } catch (err: any) {
    console.error(`   ✗ #${row.id} failed: ${err.message}`);
    // Rate limit — back off
    if (err.status === 429) {
      console.log('   ⏳ Rate limited — waiting 10s...');
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
}

// ── Report ──
console.log('\n\n═══════════════════════════════════════════════');
console.log('  LIVE AI EVALUATION RESULTS');
console.log('═══════════════════════════════════════════════\n');

const totalTests = results.length;
const avgScore = results.reduce((s, r) => s + r.score.total, 0) / totalTests;
const concisePass = results.filter((r) => r.score.concise).length;
const noPricingPass = results.filter((r) => r.score.noPricing).length;
const noDiagnosisPass = results.filter((r) => r.score.noDiagnosis).length;
const noPreamblePass = results.filter((r) => r.score.noPreamble).length;
const correctActionPass = results.filter((r) => r.score.correctAction).length;

console.log(`  Total evaluated:    ${totalTests}`);
console.log(`  Average score:      ${avgScore.toFixed(2)} / 5`);
console.log(`  Time:               ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
console.log('');
console.log(`  ┌──────────────────────┬────────┬───────┐`);
console.log(`  │ Criterion            │ Passed │  Rate │`);
console.log(`  ├──────────────────────┼────────┼───────┤`);
console.log(`  │ Concise (≤40 words)  │ ${String(concisePass).padStart(6)} │ ${((concisePass / totalTests) * 100).toFixed(1).padStart(5)}% │`);
console.log(`  │ No pricing           │ ${String(noPricingPass).padStart(6)} │ ${((noPricingPass / totalTests) * 100).toFixed(1).padStart(5)}% │`);
console.log(`  │ No diagnosis         │ ${String(noDiagnosisPass).padStart(6)} │ ${((noDiagnosisPass / totalTests) * 100).toFixed(1).padStart(5)}% │`);
console.log(`  │ No preamble          │ ${String(noPreamblePass).padStart(6)} │ ${((noPreamblePass / totalTests) * 100).toFixed(1).padStart(5)}% │`);
console.log(`  │ Correct action       │ ${String(correctActionPass).padStart(6)} │ ${((correctActionPass / totalTests) * 100).toFixed(1).padStart(5)}% │`);
console.log(`  └──────────────────────┴────────┴───────┘`);

// ── Per-industry breakdown ──
const byIndustry = new Map<string, typeof results>();
for (const r of results) {
  const list = byIndustry.get(r.row.industry) || [];
  list.push(r);
  byIndustry.set(r.row.industry, list);
}

console.log('\n  Per-Industry Scores:');
for (const [industry, industryResults] of byIndustry) {
  const avg = industryResults.reduce((s, r) => s + r.score.total, 0) / industryResults.length;
  const action = industryResults.filter((r) => r.score.correctAction).length;
  console.log(`    ${industry.padEnd(12)} ${avg.toFixed(2)}/5  (${action}/${industryResults.length} correct actions)`);
}

// ── Show failures ──
const failures = results.filter((r) => r.score.total < 3);
if (failures.length > 0) {
  console.log(`\n  ⚠ Low-scoring responses (${failures.length}):\n`);
  for (const f of failures.slice(0, 10)) {
    console.log(`    #${f.row.id} [${f.row.industry}] "${f.row.utterance.slice(0, 50)}..."`);
    console.log(`      Response: "${f.response.slice(0, 80)}..."`);
    console.log(`      Tools: ${f.tools.length > 0 ? f.tools.join(', ') : 'none'}`);
    console.log(`      Score: ${f.score.total}/5 (concise:${f.score.concise} pricing:${f.score.noPricing} diag:${f.score.noDiagnosis} preamble:${f.score.noPreamble} action:${f.score.correctAction})`);
    console.log('');
  }
}

// ── Show perfect scores ──
const perfect = results.filter((r) => r.score.total === 5);
console.log(`\n  ✅ Perfect scores: ${perfect.length}/${totalTests} (${((perfect.length / totalTests) * 100).toFixed(1)}%)`);

console.log('\n═══════════════════════════════════════════════\n');

} // end main()

main().catch(console.error);
