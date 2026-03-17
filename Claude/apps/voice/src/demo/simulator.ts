/**
 * Call Flow Simulator
 *
 * Drives the entire ServiceLine AI call flow without Twilio or WebSocket.
 * Used for both the interactive demo CLI and automated test suites.
 *
 * Flow: setup → caller messages → AI responses → tool calls → briefing → notification
 */
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from '../ws/prompts.js';
import { voiceTools, executeTool } from '../ws/tools.js';
import { buildCallBrief, formatBriefForSms, CallBrief } from '../lib/call-brief.js';
import { resolveOnCall, OnCallResult } from '../services/on-call.js';
import { db, clients, leads, calls, appointments, eq } from '@serviceline/db';

const MAX_TOOL_ITERATIONS = 5;

export interface SimulatorConfig {
  clientId?: string;
  businessName: string;
  ownerName: string;
  ownerPhone: string;
  services: string[];
  serviceArea: string;
  callerPhone: string;
  plan?: 'starter' | 'pro';
  useRealAI?: boolean; // false = mock responses
}

export interface SimulatorEvent {
  type: 'setup' | 'ai_response' | 'tool_call' | 'tool_result' | 'booking' | 'brief' | 'notification' | 'call_record' | 'lead' | 'error';
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface SimulatorSession {
  config: SimulatorConfig;
  events: SimulatorEvent[];
  messageHistory: Anthropic.MessageParam[];
  systemPrompt: string;
  clientRecord: typeof clients.$inferSelect | null;
  leadId: string | null;
  appointmentBooked: boolean;
  emergencyEscalated: boolean;
  brief: CallBrief | null;
}

/**
 * Create a new simulator session.
 * Sets up the client in the database and prepares the AI.
 */
export async function createSession(config: SimulatorConfig): Promise<SimulatorSession> {
  const session: SimulatorSession = {
    config,
    events: [],
    messageHistory: [],
    systemPrompt: '',
    clientRecord: null,
    leadId: null,
    appointmentBooked: false,
    emergencyEscalated: false,
    brief: null,
  };

  // Build system prompt
  session.systemPrompt = buildSystemPrompt({
    name: config.businessName,
    services: config.services,
    serviceArea: config.serviceArea,
  });

  // Create or find client in DB
  try {
    const [client] = await db
      .insert(clients)
      .values({
        name: config.businessName,
        slug: `demo-${Date.now()}`,
        ownerName: config.ownerName,
        ownerPhone: config.ownerPhone,
        twilioPhone: `+1555${Math.floor(1000000 + Math.random() * 9000000)}`,
        forwardPhone: config.ownerPhone,
        businessHours: { mon: ['08:00', '17:00'], tue: ['08:00', '17:00'], wed: ['08:00', '17:00'], thu: ['08:00', '17:00'], fri: ['08:00', '17:00'] },
        services: config.services,
        serviceArea: config.serviceArea,
        plan: config.plan || 'pro',
        dashboardPin: '$2b$10$placeholder', // not used in demo
        status: 'pilot',
      })
      .returning();
    session.clientRecord = client;
    session.config.clientId = client.id;
  } catch {
    // DB might not be running — that's OK for mock mode
    session.config.clientId = 'demo-client-id';
  }

  // Create lead record
  try {
    const [lead] = await db
      .insert(leads)
      .values({
        clientId: session.config.clientId!,
        contactPhone: config.callerPhone,
        source: 'voice',
        status: 'new',
      })
      .returning();
    session.leadId = lead.id;
  } catch {
    session.leadId = 'demo-lead-id';
  }

  session.events.push({
    type: 'setup',
    data: {
      businessName: config.businessName,
      callerPhone: config.callerPhone,
      plan: config.plan || 'pro',
      clientId: session.config.clientId,
    },
    timestamp: new Date(),
  });

  return session;
}

/**
 * Send a caller message and get the AI response.
 * Handles tool calls automatically in a loop.
 */
export async function sendMessage(
  session: SimulatorSession,
  callerMessage: string,
): Promise<string> {
  session.messageHistory.push({ role: 'user', content: callerMessage });

  if (!session.config.useRealAI) {
    return handleMockResponse(session, callerMessage);
  }

  const anthropic = new Anthropic();
  return processWithToolLoop(session, anthropic);
}

async function processWithToolLoop(
  session: SimulatorSession,
  anthropic: Anthropic,
): Promise<string> {
  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: session.systemPrompt,
      tools: voiceTools,
      messages: session.messageHistory,
    });

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );

    if (toolUseBlocks.length === 0) {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      session.messageHistory.push({ role: 'assistant', content: response.content });

      session.events.push({
        type: 'ai_response',
        data: { text, iteration },
        timestamp: new Date(),
      });

      return text;
    }

    // Execute tool calls
    session.messageHistory.push({ role: 'assistant', content: response.content });
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolBlock of toolUseBlocks) {
      session.events.push({
        type: 'tool_call',
        data: { name: toolBlock.name, input: toolBlock.input },
        timestamp: new Date(),
      });

      let result: Record<string, unknown>;
      try {
        result = await executeTool(
          toolBlock.name,
          toolBlock.input as Record<string, string>,
          session.clientRecord || { id: session.config.clientId, ownerPhone: session.config.ownerPhone, twilioPhone: '+15550000000' } as any,
          session.leadId,
        );

        if (toolBlock.name === 'book_appointment' && (result as { success?: boolean }).success) {
          session.appointmentBooked = true;
          await handleBooking(session, toolBlock.input as Record<string, string>, result);
        }
        if (toolBlock.name === 'escalate_emergency' && (result as { success?: boolean }).success) {
          session.emergencyEscalated = true;
        }
      } catch (err) {
        result = { error: `Tool failed: ${err instanceof Error ? err.message : 'unknown'}` };
      }

      session.events.push({
        type: 'tool_result',
        data: { name: toolBlock.name, result },
        timestamp: new Date(),
      });

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: JSON.stringify(result),
      });
    }

    session.messageHistory.push({ role: 'user', content: toolResults });
  }

  return "Let me get you connected with someone directly.";
}

/**
 * Mock responses for demo without API key.
 * Simulates a realistic plumbing call flow.
 */
function handleMockResponse(session: SimulatorSession, callerMessage: string): string {
  const turnCount = session.messageHistory.filter((m) => m.role === 'user').length;
  const lower = callerMessage.toLowerCase();

  // Emergency detection
  if (/flood|burst|gas smell|sewage|no heat/i.test(lower)) {
    session.emergencyEscalated = true;
    session.events.push({
      type: 'tool_call',
      data: { name: 'escalate_emergency', input: { phone: session.config.callerPhone, issue: callerMessage } },
      timestamp: new Date(),
    });
    session.events.push({
      type: 'notification',
      data: { to: session.config.ownerPhone, type: 'emergency', message: callerMessage },
      timestamp: new Date(),
    });
    const response = "I'm sending an alert to the owner right now — they'll call you back immediately. Can you give me the address?";
    session.messageHistory.push({ role: 'assistant', content: response });
    return response;
  }

  let response: string;

  switch (turnCount) {
    case 1:
      response = "Got it. Can I get your name and address so we can get someone out there?";
      break;
    case 2:
      response = "Thanks. I've got Tuesday at 2 PM open — want me to book that?";
      break;
    case 3:
      // Simulate booking
      session.appointmentBooked = true;
      const brief = buildCallBrief({
        customerName: 'Demo Customer',
        customerPhone: session.config.callerPhone,
        customerAddress: 'Address from conversation',
        issue: session.messageHistory[1]?.content as string || 'Service request',
        scheduledAt: new Date(Date.now() + 86400000),
      });
      session.brief = brief;

      session.events.push({
        type: 'tool_call',
        data: { name: 'book_appointment', input: { name: 'Demo Customer', phone: session.config.callerPhone, datetime: new Date(Date.now() + 86400000).toISOString() } },
        timestamp: new Date(),
      });
      session.events.push({
        type: 'booking',
        data: { brief },
        timestamp: new Date(),
      });
      session.events.push({
        type: 'brief',
        data: { sms: formatBriefForSms(brief) },
        timestamp: new Date(),
      });
      session.events.push({
        type: 'notification',
        data: { to: session.config.ownerPhone, type: 'booking', message: formatBriefForSms(brief) },
        timestamp: new Date(),
      });

      response = `You're all set! Our tech will be out tomorrow at 2 PM. They'll call before heading over.`;
      break;
    default:
      response = "Anything else I can help with? Otherwise you're all set!";
      break;
  }

  session.messageHistory.push({ role: 'assistant', content: response });
  session.events.push({
    type: 'ai_response',
    data: { text: response, mock: true },
    timestamp: new Date(),
  });

  return response;
}

async function handleBooking(
  session: SimulatorSession,
  input: Record<string, string>,
  result: Record<string, unknown>,
): Promise<void> {
  const brief = buildCallBrief({
    customerName: input.name || 'Unknown',
    customerPhone: input.phone || session.config.callerPhone,
    customerAddress: input.address || 'Unknown',
    issue: input.issue || 'Service request',
    scheduledAt: new Date(input.datetime || Date.now() + 86400000),
    conversationNotes: input.notes ? [input.notes] : undefined,
    specialInstructions: input.special_instructions ? [input.special_instructions] : undefined,
    urgency: (input.urgency as 'normal' | 'same_day' | 'emergency') || 'normal',
  });

  session.brief = brief;

  session.events.push({
    type: 'booking',
    data: { brief, appointmentId: result.appointmentId },
    timestamp: new Date(),
  });

  session.events.push({
    type: 'brief',
    data: { sms: formatBriefForSms(brief) },
    timestamp: new Date(),
  });
}

/**
 * End the session and save the call record.
 */
export async function endSession(session: SimulatorSession): Promise<void> {
  try {
    await db.insert(calls).values({
      clientId: session.config.clientId!,
      callerPhone: session.config.callerPhone,
      twilioCallSid: `DEMO-${Date.now()}`,
      status: 'answered_ai',
      appointmentBooked: session.appointmentBooked,
      emergencyEscalated: session.emergencyEscalated,
      leadId: session.leadId,
    });
    session.events.push({
      type: 'call_record',
      data: { status: 'answered_ai', appointmentBooked: session.appointmentBooked },
      timestamp: new Date(),
    });
  } catch {
    session.events.push({
      type: 'call_record',
      data: { status: 'answered_ai', appointmentBooked: session.appointmentBooked, mock: true },
      timestamp: new Date(),
    });
  }
}

/**
 * Get a summary of the session for display.
 */
export function getSessionSummary(session: SimulatorSession): {
  totalTurns: number;
  toolCalls: string[];
  appointmentBooked: boolean;
  emergencyEscalated: boolean;
  briefGenerated: boolean;
  eventsCount: number;
  revenueRescued: number;
} {
  const toolCalls = session.events
    .filter((e) => e.type === 'tool_call')
    .map((e) => e.data.name as string);

  return {
    totalTurns: session.messageHistory.filter((m) => m.role === 'user').length,
    toolCalls,
    appointmentBooked: session.appointmentBooked,
    emergencyEscalated: session.emergencyEscalated,
    briefGenerated: session.brief !== null,
    eventsCount: session.events.length,
    revenueRescued: session.appointmentBooked ? 350 : 0,
  };
}
