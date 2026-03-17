import Fastify from 'fastify';
import formbody from '@fastify/formbody';
import websocket from '@fastify/websocket';
import { healthRoutes } from './routes/health.js';
import { twimlRoutes } from './routes/twiml.js';
import { callStatusRoutes } from './routes/call-status.js';
import { recordingRoutes } from './routes/recording.js';
import { handleWebSocket } from './ws/handler.js';
import { validateTwilioWebhook } from './services/twilio-validate.js';

// Validate critical env vars at startup
const requiredInProduction = ['DATABASE_URL'];
if (process.env.NODE_ENV === 'production') {
  const missing = requiredInProduction.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (process.env.SKIP_TWILIO_VALIDATION === 'true') {
    console.error('SKIP_TWILIO_VALIDATION=true is not allowed in production');
    process.exit(1);
  }
}

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Parse Twilio form-encoded webhooks
app.register(formbody);
app.register(websocket);

// Health check (no auth needed)
app.register(healthRoutes);

// Twilio webhook routes (with validation)
app.register(async (instance) => {
  // Apply Twilio signature validation to all routes in this scope
  instance.addHook('preHandler', validateTwilioWebhook);
  instance.register(twimlRoutes);
  instance.register(callStatusRoutes);
  instance.register(recordingRoutes);
});

// WebSocket route for ConversationRelay
app.register(async (instance) => {
  instance.get('/ws', { websocket: true }, (socket, req) => {
    // In production, validate that the connection comes from Twilio
    // ConversationRelay connections include call metadata in the setup message,
    // which is validated against the DB (unknown phone → connection closed)
    handleWebSocket(socket);
  });
});

const port = parseInt(process.env.PORT || '3001');
app.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Voice server listening on port ${port}`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  app.log.info(`${signal} received — shutting down gracefully`);
  await app.close(); // closes HTTP listener + WebSocket connections
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
