import { FastifyPluginAsync } from 'fastify';

export const recordingRoutes: FastifyPluginAsync = async (app) => {
  app.post('/recording-complete', async (req, reply) => {
    // Twilio sends RecordingUrl, RecordingSid, RecordingDuration
    app.log.info({ body: req.body }, 'Recording received');
    reply.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
  });
};
