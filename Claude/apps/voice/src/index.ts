import Fastify from 'fastify';
import formbody from '@fastify/formbody';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { healthRoutes } from './routes/health.js';
import { twimlRoutes } from './routes/twiml.js';
import { callStatusRoutes } from './routes/call-status.js';
import { recordingRoutes } from './routes/recording.js';
import { handleWebSocket } from './ws/handler.js';
import { validateTwilioWebhook } from './services/twilio-validate.js';
import { validateWsToken } from './lib/ws-auth.js';
import { canAcceptWsConnection, trackWsConnect, trackWsDisconnect } from './lib/ws-rate-limit.js';

// Validate critical env vars at startup
const requiredInProduction = [
  'DATABASE_URL',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'ANTHROPIC_API_KEY',
  'VOICE_SERVER_URL',
];
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
  // Validate ENCRYPTION_KEY — must be a 64-character hex string (32 bytes for AES-256-GCM)
  const encKey = process.env.ENCRYPTION_KEY;
  if (!encKey || encKey.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(encKey)) {
    console.error(
      'ENCRYPTION_KEY must be a 64-character hex string in production. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
    process.exit(1);
  }
}

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Security headers
app.register(helmet, {
  contentSecurityPolicy: false, // TwiML responses are XML, not HTML
});

// CORS — restrict to Twilio domains + own domain
app.register(cors, {
  origin: [
    /\.twilio\.com$/,
    process.env.VOICE_SERVER_URL || 'http://localhost:3001',
    process.env.WEB_APP_URL || 'http://localhost:3000',
  ],
  methods: ['GET', 'POST'],
  credentials: false,
});

// Global rate limiting — 100 req/min per IP
app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (req) => {
    return req.ip;
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
    // --- Rate limiting ---
    const clientIp = req.ip;
    const rateCheck = canAcceptWsConnection(clientIp);
    if (!rateCheck.allowed) {
      req.log.warn({ ip: clientIp }, `WebSocket rejected: ${rateCheck.reason}`);
      socket.close(1008, rateCheck.reason || 'Rate limited');
      return;
    }

    // --- Token authentication ---
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const token = url.searchParams.get('token');
    const ts = url.searchParams.get('ts');
    const callSid = url.searchParams.get('callSid');

    // In development without TWILIO_AUTH_TOKEN, skip WS auth
    const skipAuth =
      process.env.NODE_ENV === 'development' || process.env.SKIP_TWILIO_VALIDATION === 'true';

    if (!skipAuth) {
      const validation = validateWsToken(token || undefined, ts || undefined, callSid || undefined);
      if (!validation.valid) {
        req.log.warn({ reason: validation.reason }, 'WebSocket auth failed');
        socket.close(1008, validation.reason || 'Authentication failed');
        return;
      }
    }

    // Track connection
    trackWsConnect(clientIp);
    socket.on('close', () => {
      trackWsDisconnect(clientIp);
    });

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

// Catch unhandled rejections/exceptions — log and exit cleanly rather than crashing silently
process.on('unhandledRejection', (reason) => {
  app.log.error({ err: reason instanceof Error ? reason.message : String(reason) }, 'Unhandled promise rejection');
  // In production, exit to let the process manager restart cleanly
  if (process.env.NODE_ENV === 'production') {
    shutdown('unhandledRejection');
  }
});

process.on('uncaughtException', (err) => {
  app.log.error({ err: err.message }, 'Uncaught exception — shutting down');
  shutdown('uncaughtException');
});

export { app };
