import { FastifyPluginAsync } from 'fastify';
import { createHmac } from 'crypto';
import { getClientByTwilioPhone } from '../lib/client-config.js';
import { escapeXml } from '../lib/xml-utils.js';
import { generateWsToken } from '../lib/ws-auth.js';

interface CallStatusBody {
  DialCallStatus: string;
  To: string;
  From: string;
  CallSid: string;
}

export const callStatusRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: CallStatusBody }>('/call-status', async (req, reply) => {
    const { DialCallStatus, To, From, CallSid } = req.body;

    // Validate required fields are present and are strings
    if (
      typeof DialCallStatus !== 'string' ||
      typeof To !== 'string' ||
      typeof From !== 'string' ||
      typeof CallSid !== 'string'
    ) {
      reply.status(400).send('Missing or invalid required fields');
      return;
    }

    const client = await getClientByTwilioPhone(To);

    if (!client) {
      reply.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
      return;
    }

    // Call was answered by the human — nothing to do
    if (DialCallStatus === 'completed') {
      reply.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
      return;
    }

    // No answer — route based on plan
    if (['no-answer', 'busy', 'failed'].includes(DialCallStatus)) {
      if (client.plan === 'pro' && ['active', 'pilot'].includes(client.status)) {
        // Pro: hand to AI voice agent via ConversationRelay
        const voiceServerUrl = process.env.VOICE_SERVER_URL || 'ws://localhost:3001';
        const wsUrl = voiceServerUrl.replace(/^http/, 'ws') + '/ws';

        // Generate HMAC auth token for WebSocket connection
        const { token, ts } = generateWsToken(CallSid);
        const authenticatedWsUrl = `${wsUrl}?token=${token}&ts=${ts}&callSid=${CallSid}`;

        const consentPrefix = client.recordingConsentRequired
          ? 'This call may be recorded for quality purposes. '
          : '';
        const greeting = `${consentPrefix}Hi, thanks for calling ${client.name}! Sorry we couldn't get to the phone — I'm an assistant that can help you right away. What's going on?`;

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay
      url="${escapeXml(authenticatedWsUrl)}"
      welcomeGreeting="${escapeXml(greeting)}"
      voice="en-US-Journey-F"
      ttsProvider="google"
      transcriptionProvider="deepgram"
      speechModel="nova-2-general"
    />
  </Connect>
</Response>`;
        reply.type('text/xml').send(twiml);
      } else {
        // Starter: voicemail + trigger text-back
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry we missed your call at ${escapeXml(client.name)}. Please leave a message after the beep.</Say>
  <Record maxLength="120" action="/recording-complete" />
</Response>`;

        // Fire text-back webhook to n8n asynchronously with HMAC signature
        const n8nUrl = process.env.N8N_TEXTBACK_WEBHOOK_URL;
        if (n8nUrl) {
          const payload = JSON.stringify({
            twilioPhone: To,
            callerPhone: From,
            callSid: CallSid,
            clientId: client.id,
          });

          const n8nSecret = process.env.N8N_WEBHOOK_SECRET;
          if (!n8nSecret) {
            app.log.error('N8N_WEBHOOK_SECRET not set — skipping text-back webhook (refusing to sign with default secret)');
          } else {
            const sig = createHmac('sha256', n8nSecret).update(payload).digest('hex');

            fetch(n8nUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': sig,
              },
              body: payload,
            }).catch((err) => app.log.error({ err }, 'Failed to trigger text-back webhook'));
          }
        }

        reply.type('text/xml').send(twiml);
      }
      return;
    }

    // Default fallback
    reply.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
  });
};
