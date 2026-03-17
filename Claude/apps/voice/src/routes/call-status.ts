import { FastifyPluginAsync } from 'fastify';
import { getClientByTwilioPhone } from '../lib/client-config.js';
import { escapeXml } from '../lib/xml-utils.js';

interface CallStatusBody {
  DialCallStatus: string;
  To: string;
  From: string;
  CallSid: string;
}

export const callStatusRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: CallStatusBody }>('/call-status', async (req, reply) => {
    const { DialCallStatus, To, From, CallSid } = req.body;
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
        const consentPrefix = client.recordingConsentRequired
          ? 'This call may be recorded for quality purposes. '
          : '';
        const greeting = `${consentPrefix}Hi, thanks for calling ${client.name}! Sorry we couldn't get to the phone — I'm an assistant that can help you right away. What's going on?`;

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay
      url="${wsUrl}"
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

        // Fire text-back webhook to n8n asynchronously
        const n8nUrl = process.env.N8N_TEXTBACK_WEBHOOK_URL;
        if (n8nUrl) {
          fetch(n8nUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              twilioPhone: To,
              callerPhone: From,
              callSid: CallSid,
              clientId: client.id,
            }),
          }).catch((err) => app.log.error({ err }, 'Failed to trigger text-back webhook'));
        }

        reply.type('text/xml').send(twiml);
      }
      return;
    }

    // Default fallback
    reply.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
  });
};

