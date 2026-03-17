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

/**
 * Validates that a recording URL is a legitimate Twilio recording URL.
 * Prevents storage of arbitrary/phishing URLs in the database.
 */
function sanitizeRecordingUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    // Twilio recording URLs are always on api.twilio.com
    if (!parsed.hostname.endsWith('.twilio.com')) {
      return null;
    }
    if (parsed.protocol !== 'https:') {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export const recordingRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: RecordingBody }>('/recording-complete', async (req, reply) => {
    const { RecordingUrl: rawRecordingUrl, RecordingSid, RecordingDuration, CallSid, From, To } = req.body;
    const RecordingUrl = sanitizeRecordingUrl(rawRecordingUrl);

    app.log.info(
      { recordingSid: RecordingSid, duration: RecordingDuration },
      'Recording received',
    );

    // Validate that string fields are actually strings (defense-in-depth for dev mode without Twilio validation)
    if (CallSid && typeof CallSid !== 'string') {
      reply.status(400).send('Invalid CallSid');
      return;
    }

    if (CallSid && To) {
      try {
        const client = await getClientByTwilioPhone(To);
        if (client && From) {
          // Create or find lead
          const [lead] = await db
            .insert(leads)
            .values({
              clientId: client.id,
              contactPhone: From,
              source: 'voice',
              status: 'new',
              dripNextAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            })
            .onConflictDoNothing({ target: [leads.clientId, leads.contactPhone] })
            .returning();

          // Create call record for voicemail — link to lead if we got one
          await db.insert(calls).values({
            clientId: client.id,
            callerPhone: From,
            twilioCallSid: CallSid,
            status: 'voicemail',
            durationSeconds: RecordingDuration ? parseInt(RecordingDuration, 10) : null,
            recordingUrl: RecordingUrl || null,
            leadId: lead?.id || null,
          });

          // Notify owner about the voicemail
          try {
            await smsToOwner(
              client.ownerPhone,
              client.twilioPhone,
              `📞 New voicemail from ${From} (${RecordingDuration || '?'}s).\nListen: ${RecordingUrl || 'recording unavailable'}`,
            );
          } catch (smsErr) {
            app.log.error(
              { err: smsErr instanceof Error ? smsErr.message : smsErr },
              'Failed to send voicemail notification SMS',
            );
          }
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
