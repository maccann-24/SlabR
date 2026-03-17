import { FastifyPluginAsync } from 'fastify';
import { db, calls, leads } from '@serviceline/db';
import { getClientByTwilioPhone } from '../lib/client-config.js';
import { smsToOwner } from '../services/notifications.js';

interface RecordingBody {
  RecordingUrl?: string;
  RecordingSid?: string;
  RecordingDuration?: string;
  CallSid?: string;
  From?: string;
  To?: string;
}

export const recordingRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: RecordingBody }>('/recording-complete', async (req, reply) => {
    const { RecordingUrl, RecordingSid, RecordingDuration, CallSid, From, To } = req.body;

    app.log.info(
      { recordingSid: RecordingSid, duration: RecordingDuration },
      'Recording received',
    );

    if (CallSid && To) {
      try {
        const client = await getClientByTwilioPhone(To);
        if (client && From) {
          // Create call record for voicemail
          await db.insert(calls).values({
            clientId: client.id,
            callerPhone: From,
            twilioCallSid: CallSid,
            status: 'voicemail',
            durationSeconds: RecordingDuration ? parseInt(RecordingDuration, 10) : null,
            recordingUrl: RecordingUrl || null,
          });

          // Create lead if one doesn't exist
          await db
            .insert(leads)
            .values({
              clientId: client.id,
              contactPhone: From,
              source: 'voice',
              status: 'new',
              dripNextAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
            })
            .onConflictDoNothing();

          // Notify owner about the voicemail
          await smsToOwner(
            client.ownerPhone,
            client.twilioPhone,
            `📞 New voicemail from ${From} (${RecordingDuration || '?'}s).\nListen: ${RecordingUrl || 'recording unavailable'}`,
          );
        }
      } catch (err) {
        app.log.error(
          { err: err instanceof Error ? err.message : err },
          'Failed to save voicemail record',
        );
      }
    }

    reply.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
  });
};
