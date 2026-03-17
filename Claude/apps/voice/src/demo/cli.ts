#!/usr/bin/env tsx
/**
 * ServiceLine AI — Interactive Demo CLI
 *
 * Usage:
 *   npx tsx apps/voice/src/demo/cli.ts              # mock AI (no API key needed)
 *   ANTHROPIC_API_KEY=sk-... npx tsx apps/voice/src/demo/cli.ts  # real Claude AI
 *
 * Simulates the entire call flow in your terminal.
 */
import * as readline from 'readline';
import { createSession, sendMessage, endSession, getSessionSummary, SimulatorSession } from './simulator.js';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
};

function log(icon: string, msg: string, color = COLORS.reset) {
  console.log(`${color}${icon} ${msg}${COLORS.reset}`);
}

async function main() {
  const useRealAI = !!process.env.ANTHROPIC_API_KEY;

  console.log(`\n${COLORS.bold}🔧 ServiceLine AI — Proof of Concept${COLORS.reset}`);
  console.log(`${COLORS.gray}Mode: ${useRealAI ? 'Real Claude Haiku AI' : 'Mock AI (set ANTHROPIC_API_KEY for real AI)'}${COLORS.reset}\n`);

  log('📋', 'Setting up "Mike\'s Plumbing" in Austin, TX...', COLORS.cyan);

  let session: SimulatorSession;
  try {
    session = await createSession({
      businessName: "Mike's Plumbing",
      ownerName: 'Mike Johnson',
      ownerPhone: '+15551111111',
      services: ['plumbing', 'drain', 'water_heater'],
      serviceArea: 'Austin, TX',
      callerPhone: '+15559876543',
      plan: 'pro',
      useRealAI,
    });
    log('✅', 'Client created in database', COLORS.green);
  } catch {
    session = await createSession({
      businessName: "Mike's Plumbing",
      ownerName: 'Mike Johnson',
      ownerPhone: '+15551111111',
      services: ['plumbing', 'drain', 'water_heater'],
      serviceArea: 'Austin, TX',
      callerPhone: '+15559876543',
      plan: 'pro',
      useRealAI,
    });
    log('⚠️', 'Database not available — running in mock mode', COLORS.yellow);
  }

  log('✅', 'AI system prompt configured (dispatcher tone, 35-word limit)', COLORS.green);
  log('✅', 'On-call: Mike Johnson (owner, 24/7 fallback)', COLORS.green);

  console.log(`\n${COLORS.gray}─────────────────────────────────────────────${COLORS.reset}`);
  log('📞', 'Simulating incoming call from +15559876543...', COLORS.yellow);
  log('  ', 'Caller didn\'t answer after 20 seconds.', COLORS.gray);
  log('  ', 'Plan: Pro → routing to AI voice agent.\n', COLORS.gray);

  // AI greeting
  const greeting = "Hi, thanks for calling Mike's Plumbing! Sorry we couldn't get to the phone — I'm an assistant that can help. What's going on?";
  log('💬 AI:', greeting, COLORS.cyan);
  console.log();

  // Interactive conversation loop
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (): Promise<string> =>
    new Promise((resolve) => {
      rl.question(`${COLORS.bold}You (caller): ${COLORS.reset}`, (answer) => {
        resolve(answer.trim());
      });
    });

  let turnCount = 0;
  const maxTurns = 10;
  let lastEventIndex = session.events.length; // Track which events we've displayed

  while (turnCount < maxTurns) {
    const input = await ask();
    if (!input || input.toLowerCase() === 'quit' || input.toLowerCase() === 'exit') break;

    turnCount++;
    const response = await sendMessage(session, input);
    console.log();
    log('💬 AI:', response, COLORS.cyan);
    console.log();

    // Show only NEW events since last turn
    const newEvents = session.events.slice(lastEventIndex);
    lastEventIndex = session.events.length;
    for (const event of newEvents) {
      if (event.type === 'tool_call') {
        log('🔧', `Tool called: ${event.data.name}`, COLORS.yellow);
      }
      if (event.type === 'booking') {
        log('✅', 'Appointment booked!', COLORS.green);
        if (session.brief) {
          console.log(`\n${COLORS.gray}─── CALL BRIEF ───────────────────────────${COLORS.reset}`);
          console.log(formatBriefDisplay(session.brief));
          console.log(`${COLORS.gray}──────────────────────────────────────────${COLORS.reset}\n`);
        }
      }
      if (event.type === 'notification') {
        log('📱', `SMS sent to ${event.data.type}: ${(event.data.to as string).slice(0, 6)}***`, COLORS.green);
      }
    }

    if (session.appointmentBooked && turnCount > 3) break;
  }

  // End session
  await endSession(session);
  const summary = getSessionSummary(session);

  console.log(`\n${COLORS.gray}─── SESSION SUMMARY ──────────────────────${COLORS.reset}`);
  log('📊', `Conversation turns: ${summary.totalTurns}`, COLORS.reset);
  log('🔧', `Tool calls: ${summary.toolCalls.length > 0 ? summary.toolCalls.join(', ') : 'none'}`, COLORS.reset);
  log(summary.appointmentBooked ? '✅' : '❌', `Appointment booked: ${summary.appointmentBooked}`, summary.appointmentBooked ? COLORS.green : COLORS.red);
  log(summary.emergencyEscalated ? '🚨' : '  ', `Emergency escalated: ${summary.emergencyEscalated}`, summary.emergencyEscalated ? COLORS.red : COLORS.gray);
  log(summary.briefGenerated ? '📋' : '  ', `Call brief generated: ${summary.briefGenerated}`, summary.briefGenerated ? COLORS.green : COLORS.gray);
  log('💰', `Revenue Rescued: $${summary.revenueRescued}`, COLORS.green);
  log('📝', `Events tracked: ${summary.eventsCount}`, COLORS.gray);
  console.log(`${COLORS.gray}──────────────────────────────────────────${COLORS.reset}\n`);

  rl.close();
  process.exit(0);
}

function formatBriefDisplay(brief: import('../lib/call-brief.js').CallBrief): string {
  const { formatBriefForSms } = require('../lib/call-brief.js');
  return formatBriefForSms(brief);
}

main().catch(console.error);
