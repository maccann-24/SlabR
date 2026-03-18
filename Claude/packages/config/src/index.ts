// ── AI Configuration ──
export const AI = {
  model: 'claude-haiku-4-5-20251001',
  voiceMaxTokens: 150,
  summaryMaxTokens: 200,
  maxHistory: 20,
  maxToolIterations: 5,
  maxSummaryHistory: 30,
} as const;

// ── Voice Stack ──
export const VOICE = {
  ttsVoice: 'en-US-Journey-F',
  ttsProvider: 'google',
  transcriptionProvider: 'deepgram',
  speechModel: 'nova-2-general',
  dialTimeoutSeconds: 20,
  maxCallDurationMs: 30 * 60 * 1000,
  idleTimeoutMs: 2 * 60 * 1000,
  maxRecordingSeconds: 120,
} as const;

// ── Rate Limits ──
export const LIMITS = {
  httpMaxPerMinute: 100,
  wsMaxConcurrentPerIp: 3,
  wsMaxNewPerMinutePerIp: 10,
  wsMaxTotalConnections: 100,
  wsTokenMaxAgeMs: 60_000,
  wsMaxMessageBytes: 64 * 1024,
  toolLimits: { escalate_emergency: 2, book_appointment: 5 } as Record<string, number>,
  maxCustomPromptLength: 500,
  maxNameLength: 200,
  maxAddressLength: 500,
  maxIssueLength: 1000,
} as const;

// ── Business ──
export const BUSINESS = {
  defaultTicketValue: 350,
  defaultAppointmentDuration: '1 hour',
  pricing: { starter: 199, pro: 499 },
  smsMaxLength: 400,
  dripDelayMs: 24 * 60 * 60 * 1000,
  sessionCookieMaxAge: 60 * 60 * 24,
} as const;

// ── Escalation SLAs ──
export const ESCALATION = {
  emergency: 5 * 60 * 1000,
  booking: 15 * 60 * 1000,
  voicemail: 30 * 60 * 1000,
} as const;

// ── Database ──
export const DB = {
  poolMax: 20,
  idleTimeoutMs: 30_000,
  connectionTimeoutMs: 5_000,
} as const;

// ── Chart Colors ──
export const COLORS = {
  revenue: '#f59e0b',
  calls: '#3b82f6',
  appointments: '#10b981',
  leads: '#6366f1',
  barFill: '#334155',
  grid: '#1e293b',
  axisText: '#64748b',
  tooltipBg: '#0f172a',
  tooltipText: '#e2e8f0',
  tooltipBorder: '#1e293b',
} as const;
