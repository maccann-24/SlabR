import { WebSocket } from 'ws';
import Anthropic from '@anthropic-ai/sdk';
import { getClientByTwilioPhone, ClientConfig } from '../lib/client-config.js';
import { buildSystemPrompt } from './prompts.js';
import { voiceTools, executeTool } from './tools.js';
import { callSummaryNotification } from '../services/notifications.js';
import { db, calls } from '@serviceline/db';

const getAnthropicClient = () => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.warn('[DEV] No ANTHROPIC_API_KEY set — voice agent will use mock responses');
    return null;
  }
  return new Anthropic();
};

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

  ws.on('message', async (data) => {
    let msg: ConversationRelayMessage;
    try {
      msg = JSON.parse(data.toString());
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
        return;
      }

      systemPrompt = buildSystemPrompt({
        name: client.name,
        services: client.services as string[],
        serviceArea: client.serviceArea,
        customPrompt: client.aiSystemPrompt,
      });
      return;
    }

    if (msg.type === 'prompt') {
      const prompt = msg as ConversationRelayPrompt;
      messageHistory.push({ role: 'user', content: prompt.voicePrompt });

      const anthropic = getAnthropicClient();
      if (!anthropic) {
        // Dev mock response
        const mockResponse =
          "Thanks for calling! I'd be happy to help. Could you tell me your name and what's going on?";
        messageHistory.push({ role: 'assistant', content: mockResponse });
        ws.send(JSON.stringify({ type: 'text', token: mockResponse, last: true }));
        return;
      }

      try {
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: systemPrompt,
          tools: voiceTools,
          messages: messageHistory,
        });

        // Handle tool use
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const toolResult = await executeTool(
              block.name,
              block.input as Record<string, string>,
              client!,
            );
            messageHistory.push({ role: 'assistant', content: response.content });
            messageHistory.push({
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: JSON.stringify(toolResult),
                },
              ],
            });

            // Get follow-up response after tool use
            const followUp = await anthropic.messages.create({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 300,
              system: systemPrompt,
              tools: voiceTools,
              messages: messageHistory,
            });

            const text = followUp.content
              .filter((b): b is Anthropic.TextBlock => b.type === 'text')
              .map((b) => b.text)
              .join('');

            messageHistory.push({ role: 'assistant', content: followUp.content });
            ws.send(JSON.stringify({ type: 'text', token: text, last: true }));
            return;
          }
        }

        // Regular text response
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('');

        messageHistory.push({ role: 'assistant', content: response.content });
        ws.send(JSON.stringify({ type: 'text', token: text, last: true }));
      } catch (err) {
        console.error('Claude API error:', err);
        ws.send(
          JSON.stringify({
            type: 'text',
            token: "I'm having a little trouble. Could you repeat that?",
            last: true,
          }),
        );
      }
    }
  });

  ws.on('close', async () => {
    if (!client || !callSid) return;

    try {
      // Generate call summary
      let summary: string | null = null;
      if (messageHistory.length > 2) {
        const anthropic = getAnthropicClient();
        if (anthropic) {
          const res = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            system:
              'Summarize this phone call in 2-3 sentences. Include: what the caller needed, any appointment booked, and any follow-up required.',
            messages: [
              { role: 'user', content: JSON.stringify(messageHistory) },
            ],
          });
          const textBlock = res.content.find(
            (b): b is Anthropic.TextBlock => b.type === 'text',
          );
          summary = textBlock?.text || null;
        }
      }

      // Save call record
      await db.insert(calls).values({
        clientId: client.id,
        callerPhone,
        twilioCallSid: callSid,
        status: 'answered_ai',
        aiSummary: summary,
      });

      // Notify owner
      if (summary) {
        await callSummaryNotification(
          client.ownerPhone,
          client.twilioPhone,
          summary,
          callerPhone,
        );
      }
    } catch (err) {
      console.error('Failed to save call record:', err);
    }
  });
}
