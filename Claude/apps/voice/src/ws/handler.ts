import { WebSocket } from 'ws';
import Anthropic from '@anthropic-ai/sdk';
import { getClientByTwilioPhone, ClientConfig } from '../lib/client-config.js';
import { buildSystemPrompt } from './prompts.js';
import { voiceTools, executeTool } from './tools.js';
import { callSummaryNotification } from '../services/notifications.js';
import { db, calls, leads } from '@serviceline/db';

const MAX_HISTORY = 20;
const MAX_TOOL_ITERATIONS = 5;
const MAX_CALL_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const IDLE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes of silence

function getAnthropicClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.warn('[DEV] No ANTHROPIC_API_KEY set — voice agent will use mock responses');
    return null;
  }
  return new Anthropic();
}

// Module-level singleton — only created once
let _anthropicClient: Anthropic | null | undefined;
function getOrCreateAnthropicClient(): Anthropic | null {
  if (_anthropicClient === undefined) {
    _anthropicClient = getAnthropicClient();
  }
  return _anthropicClient;
}

interface ConversationRelaySetup {
  type: 'setup';
  callSid: string;
  from: string;
  to: string;
}

interface ConversationRelayPrompt {
  type: 'prompt';
  voicePrompt: string;
}

type ConversationRelayMessage =
  | ConversationRelaySetup
  | ConversationRelayPrompt
  | { type: string };

export async function handleWebSocket(ws: WebSocket) {
  let client: ClientConfig | null = null;
  let callSid = '';
  let callerPhone = '';
  let messageHistory: Anthropic.MessageParam[] = [];
  let systemPrompt = '';
  let appointmentBooked = false;
  let emergencyEscalated = false;
  let leadId: string | null = null;

  // Serialization mutex — ensures messages are processed one at a time
  let processing = Promise.resolve();

  // Timeouts for resource management
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  const maxTimer = setTimeout(() => {
    ws.close(1000, 'Max call duration reached');
  }, MAX_CALL_DURATION_MS);

  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      ws.close(1000, 'Idle timeout');
    }, IDLE_TIMEOUT_MS);
  }

  resetIdleTimer();

  ws.on('message', (data) => {
    resetIdleTimer();
    // Queue message processing to prevent race conditions
    processing = processing.then(() => handleMessage(data)).catch((err) => {
      console.error('Unhandled error in message handler:', err?.message || err);
    });
  });

  async function handleMessage(data: unknown) {
    let msg: ConversationRelayMessage;
    try {
      msg = JSON.parse(String(data));
    } catch {
      console.error('Invalid JSON from ConversationRelay');
      return;
    }

    if (msg.type === 'setup') {
      const setup = msg as ConversationRelaySetup;
      callSid = setup.callSid;
      callerPhone = setup.from;
      client = await getClientByTwilioPhone(setup.to);

      if (!client) {
        ws.send(
          JSON.stringify({
            type: 'text',
            token: "I'm sorry, there's a system error. Please try calling back.",
            last: true,
          }),
        );
        ws.close(1008, 'Unknown phone number');
        return;
      }

      systemPrompt = buildSystemPrompt({
        name: client.name,
        services: client.services as string[],
        serviceArea: client.serviceArea,
        customPrompt: client.aiSystemPrompt,
      });

      // Create lead record for this call
      try {
        const [lead] = await db
          .insert(leads)
          .values({
            clientId: client.id,
            contactPhone: callerPhone,
            source: 'voice',
            status: 'new',
          })
          .onConflictDoNothing({ target: [leads.clientId, leads.contactPhone] })
          .returning();
        if (lead) {
          leadId = lead.id;
        }
      } catch (err) {
        console.error('Failed to create lead:', err instanceof Error ? err.message : err);
      }
      return;
    }

    if (msg.type === 'prompt') {
      if (!client) return; // No valid client — ignore

      const prompt = msg as ConversationRelayPrompt;
      messageHistory.push({ role: 'user', content: prompt.voicePrompt });

      // Cap history to prevent memory growth
      if (messageHistory.length > MAX_HISTORY) {
        // Keep first message (context) and last MAX_HISTORY-1
        messageHistory = [messageHistory[0], ...messageHistory.slice(-(MAX_HISTORY - 1))];
      }

      const anthropic = getOrCreateAnthropicClient();
      if (!anthropic) {
        const mockResponse =
          "Thanks for calling! I'd be happy to help. Could you tell me your name and what's going on?";
        messageHistory.push({ role: 'assistant', content: mockResponse });
        ws.send(JSON.stringify({ type: 'text', token: mockResponse, last: true }));
        return;
      }

      try {
        await processWithToolLoop(anthropic, ws, client);
      } catch (err) {
        console.error('Claude API error:', err instanceof Error ? err.message : err);
        ws.send(
          JSON.stringify({
            type: 'text',
            token: "I'm having a little trouble. Could you repeat that?",
            last: true,
          }),
        );
      }
    }
  }

  /** Process Claude response, handling tool calls in a loop */
  async function processWithToolLoop(anthropic: Anthropic, ws: WebSocket, clientRef: ClientConfig) {
    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: systemPrompt,
        tools: voiceTools,
        messages: messageHistory,
      });

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );

      if (toolUseBlocks.length === 0) {
        // Pure text response — send to caller and exit loop
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('');

        messageHistory.push({ role: 'assistant', content: response.content });
        ws.send(JSON.stringify({ type: 'text', token: text, last: true }));
        return;
      }

      // Execute ALL tool calls
      messageHistory.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolBlock of toolUseBlocks) {
        let result: Record<string, unknown>;
        try {
          result = await executeTool(
            toolBlock.name,
            toolBlock.input as Record<string, string>,
            clientRef,
            leadId,
          );
          // Track state for call record
          if (toolBlock.name === 'book_appointment' && (result as { success?: boolean }).success) {
            appointmentBooked = true;
          }
          if (toolBlock.name === 'escalate_emergency' && (result as { success?: boolean }).success) {
            emergencyEscalated = true;
          }
        } catch (err) {
          console.error(`Tool ${toolBlock.name} failed:`, err instanceof Error ? err.message : err);
          result = { error: `Tool execution failed: ${err instanceof Error ? err.message : 'unknown error'}. Please let the caller know and try an alternative approach.` };
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolBlock.id,
          content: JSON.stringify(result),
        });
      }

      messageHistory.push({ role: 'user', content: toolResults });
      // Loop continues — next iteration will get Claude's response to the tool results
    }

    // If we hit MAX_TOOL_ITERATIONS, send a fallback
    ws.send(
      JSON.stringify({
        type: 'text',
        token: "Let me get you connected with someone who can help directly. One moment please.",
        last: true,
      }),
    );
  }

  ws.on('close', async () => {
    // Clean up timers
    if (idleTimer) clearTimeout(idleTimer);
    clearTimeout(maxTimer);

    if (!client || !callSid) return;

    // Wait for any in-flight message processing to complete
    await processing;

    // Save call record FIRST (before summary) — ensures we never lose the record
    try {
      await db.insert(calls).values({
        clientId: client.id,
        callerPhone,
        twilioCallSid: callSid,
        status: 'answered_ai',
        leadId,
        appointmentBooked,
        emergencyEscalated,
      });
    } catch (err) {
      console.error('Failed to save call record:', err instanceof Error ? err.message : err);
    }

    // Then attempt summary + notification (best-effort, won't lose call record if this fails)
    try {
      if (messageHistory.length > 2) {
        const anthropic = getOrCreateAnthropicClient();
        if (anthropic) {
          const historyForSummary = messageHistory.slice(0, 30);
          const res = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            system:
              'Summarize this phone call in 2-3 sentences. Include: what the caller needed, any appointment booked, and any follow-up required.',
            messages: [
              { role: 'user', content: JSON.stringify(historyForSummary) },
            ],
          });
          const textBlock = res.content.find(
            (b): b is Anthropic.TextBlock => b.type === 'text',
          );
          const summary = textBlock?.text || null;

          if (summary) {
            // Patch summary into the call record
            const { eq } = await import('drizzle-orm');
            await db
              .update(calls)
              .set({ aiSummary: summary })
              .where(eq(calls.twilioCallSid, callSid));

            await callSummaryNotification(
              client.ownerPhone,
              client.twilioPhone,
              summary,
              callerPhone,
            );
          }
        }
      }
    } catch (err) {
      console.error('Failed to generate call summary:', err instanceof Error ? err.message : err);
    }
  });
}
