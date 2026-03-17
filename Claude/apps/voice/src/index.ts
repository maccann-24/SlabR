import Fastify from 'fastify';
import formbody from '@fastify/formbody';
import websocket from '@fastify/websocket';
import { healthRoutes } from './routes/health.js';
import { twimlRoutes } from './routes/twiml.js';
import { callStatusRoutes } from './routes/call-status.js';
import { recordingRoutes } from './routes/recording.js';
import { handleWebSocket } from './ws/handler.js';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty' }
        : undefined,
  },
});

// Parse Twilio form-encoded webhooks
app.register(formbody);
app.register(websocket);

// HTTP routes
app.register(healthRoutes);
app.register(twimlRoutes);
app.register(callStatusRoutes);
app.register(recordingRoutes);

// WebSocket route for ConversationRelay
app.register(async (app) => {
  app.get('/ws', { websocket: true }, (socket) => {
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

export { app };
