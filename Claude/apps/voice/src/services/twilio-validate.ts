import { FastifyRequest, FastifyReply } from 'fastify';
import twilio from 'twilio';

export async function validateTwilioWebhook(req: FastifyRequest, reply: FastifyReply) {
  // Skip validation in development
  if (process.env.NODE_ENV === 'development' || process.env.SKIP_TWILIO_VALIDATION === 'true') {
    return;
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    reply.status(500).send('Twilio auth token not configured');
    return;
  }

  const signature = req.headers['x-twilio-signature'] as string;
  if (!signature) {
    reply.status(403).send('Missing Twilio signature');
    return;
  }

  const url = `${process.env.VOICE_SERVER_URL}${req.url}`;
  const params = (req.body as Record<string, string>) || {};

  const isValid = twilio.validateRequest(authToken, signature, url, params);
  if (!isValid) {
    reply.status(403).send('Invalid Twilio signature');
    return;
  }
}
