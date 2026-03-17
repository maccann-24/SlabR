import { FastifyPluginAsync } from 'fastify';
import { getClientByTwilioPhone } from '../lib/client-config.js';
import { escapeXml, isValidPhone } from '../lib/xml-utils.js';

export const twimlRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { twilioPhone: string } }>('/twiml/:twilioPhone', async (req, reply) => {
    // Validate phone format before hitting DB
    if (!isValidPhone(req.params.twilioPhone)) {
      reply.status(400).send('Invalid phone number format');
      return;
    }
    const client = await getClientByTwilioPhone(req.params.twilioPhone);
    if (!client) {
      reply.status(404).send('Unknown phone number');
      return;
    }

    const voiceServerUrl = process.env.VOICE_SERVER_URL || 'http://localhost:3001';

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial action="${escapeXml(voiceServerUrl)}/call-status" timeout="20">
    <Number>${escapeXml(client.forwardPhone)}</Number>
  </Dial>
  <Say>We're sorry, please try again later.</Say>
</Response>`;

    reply.type('text/xml').send(twiml);
  });
};
