# ServiceLine AI -- Security Monitoring & Alerting Design

## 1. Security Events to Monitor

### 1.1 WebSocket Authentication Failures

**Source:** `apps/voice/src/lib/ws-auth.ts` via `index.ts` line 116
**Current behavior:** `validateWsToken()` returns `{ valid: false, reason }` and the connection is closed with code 1008. A `req.log.warn` is emitted.

Events to capture:

| Event ID | Condition | Severity |
|----------|-----------|----------|
| `ws.auth.missing_token` | Token or timestamp query param absent | MEDIUM |
| `ws.auth.expired_token` | Token age > 60 s or timestamp in the future | LOW |
| `ws.auth.invalid_token` | HMAC mismatch (forged or tampered token) | HIGH |
| `ws.auth.invalid_format` | Token not valid hex, buffer length mismatch | HIGH |
| `ws.auth.server_misconfig` | `TWILIO_AUTH_TOKEN` missing at validation time | CRITICAL |

An HMAC mismatch (`invalid_token`) is the strongest signal of an attack -- expired tokens happen legitimately when Twilio retries a timed-out ConversationRelay setup.

### 1.2 WebSocket Rate Limit Rejections

**Source:** `apps/voice/src/lib/ws-rate-limit.ts` via `index.ts` line 97
**Current behavior:** In-memory per-IP tracking. Max 3 concurrent connections per IP, max 10 new connections per minute per IP. Rejection closes the socket with code 1008.

| Event ID | Condition | Severity |
|----------|-----------|----------|
| `ws.rate.concurrent_exceeded` | IP has >= 3 active WebSocket connections | MEDIUM |
| `ws.rate.minute_exceeded` | IP opened >= 10 connections in the last 60 s | HIGH |

A single IP exceeding the per-minute limit is strong evidence of scanning or DoS. Twilio media servers use a handful of IPs, so legitimate traffic will never hit 10/min from one IP.

### 1.3 HTTP Rate Limit Rejections

**Source:** `@fastify/rate-limit` in `index.ts` line 68 (100 req/min per IP)
**Current behavior:** Returns 429. Fastify emits a `preHandler` error that is logged at WARN level by default.

| Event ID | Condition | Severity |
|----------|-----------|----------|
| `http.rate.exceeded` | IP exceeds 100 requests/min | MEDIUM |

### 1.4 Twilio Signature Validation Failures

**Source:** `apps/voice/src/services/twilio-validate.ts`
**Current behavior:** Returns 403 with text body. No structured log emitted.

| Event ID | Condition | Severity |
|----------|-----------|----------|
| `twilio.sig.missing` | `X-Twilio-Signature` header absent | HIGH |
| `twilio.sig.invalid` | Signature present but `twilio.validateRequest()` returns false | CRITICAL |
| `twilio.sig.no_auth_token` | `TWILIO_AUTH_TOKEN` not set in production | CRITICAL |

A request with a present-but-invalid signature is the highest-confidence indicator of a forged webhook -- someone knows the endpoint URL and is attempting to trigger TwiML or call-status flows.

### 1.5 PIN Brute Force Attempts (Future)

When PIN authentication is added for the admin panel or client portal:

| Event ID | Condition | Severity |
|----------|-----------|----------|
| `pin.attempt.failed` | Incorrect PIN submitted | LOW (single) |
| `pin.brute.threshold` | >= 5 failed attempts for one entity within 15 min | HIGH |
| `pin.brute.lockout` | Account locked after threshold exceeded | HIGH |

Implementation note: store attempts in a `pin_attempts` table with columns `(id, entity_type, entity_id, ip, attempted_at, success)`. The alerting query is a simple windowed count.

### 1.6 Tool Abuse -- Emergency Escalation

**Source:** `apps/voice/src/ws/handler.ts` lines 16-19, 198-210
**Current behavior:** `escalate_emergency` is capped at 2 invocations per WebSocket session. When the limit is hit, the tool returns an error string to Claude but no external alert fires.

| Event ID | Condition | Severity |
|----------|-----------|----------|
| `tool.rate.hit` | Any per-session tool rate limit reached | MEDIUM |
| `tool.emergency.fired` | `escalate_emergency` successfully invoked | INFO |
| `tool.emergency.sms_failed` | Emergency SMS to owner failed to send | CRITICAL |

The `tool.emergency.sms_failed` event is critical because it means an actual emergency caller's escalation was silently dropped.

### 1.7 API Cost Anomalies

| Event ID | Condition | Severity |
|----------|-----------|----------|
| `cost.anthropic.spike` | Daily Anthropic API spend > 2x 7-day rolling average | HIGH |
| `cost.twilio.spike` | Daily Twilio spend > 2x 7-day rolling average | HIGH |
| `cost.anthropic.runaway` | Single call exceeds MAX_TOOL_ITERATIONS (5 loops) | MEDIUM |

Anthropic costs are trackable via response headers (`anthropic-ratelimit-*`) or the usage API. Twilio costs come from the usage records API. Both should be polled daily.

### 1.8 Error Rate Spikes

| Event ID | Condition | Severity |
|----------|-----------|----------|
| `error.rate.5xx` | > 5 HTTP 5xx responses in a 5-minute window | HIGH |
| `error.rate.ws_crash` | > 3 unhandled WebSocket handler errors in 5 min | HIGH |
| `error.rate.db` | > 3 database connection/query failures in 5 min | CRITICAL |
| `error.rate.anthropic` | > 5 Claude API errors (non-429) in 5 min | HIGH |
| `error.process.unhandled` | `unhandledRejection` or `uncaughtException` fired | CRITICAL |

### 1.9 Oversized WebSocket Messages

**Source:** `apps/voice/src/ws/handler.ts` lines 91-98 (64 KB limit)

| Event ID | Condition | Severity |
|----------|-----------|----------|
| `ws.message.oversized` | Message exceeds 64 KB limit | MEDIUM |

A single oversized message is noise. Multiple from the same connection indicate payload stuffing.


## 2. Alerting Rules

### 2.1 SMS Alert to Operator (Immediate Action Required)

SMS alerts should be rare -- no more than a few per week under normal operation. Each SMS costs ~$0.0079 via Twilio, so over-alerting is both annoying and wasteful.

**Trigger conditions (any one fires an SMS):**

1. **Twilio signature validation failure** (`twilio.sig.invalid`) -- >= 3 in 10 minutes from the same IP. A single failure could be a Twilio retry with a stale URL; a cluster is an attack.

2. **WebSocket auth HMAC mismatch** (`ws.auth.invalid_token`) -- >= 3 in 10 minutes. Same logic: one could be a stale retry, multiple is probing.

3. **Emergency SMS delivery failure** (`tool.emergency.sms_failed`) -- immediately on first occurrence. A real person may be in danger and the owner never received the alert.

4. **Process crash** (`error.process.unhandled`) -- immediately. The server is restarting and calls are being dropped.

5. **Database unreachable** (`error.rate.db`) -- >= 3 failures in 5 minutes. All call records, appointments, and lead data are being lost.

6. **PIN brute force lockout** (future) -- immediately on lockout. Someone is actively trying to break into a client account.

**SMS format:**
```
[ServiceLine ALERT] {event_id}
{short description}
IP: {ip or "N/A"}
Time: {ISO timestamp}
Count: {N occurrences in window}
Action: {one-line recommended action}
```

**Example:**
```
[ServiceLine ALERT] twilio.sig.invalid
Forged Twilio webhook detected
IP: 203.0.113.42
Time: 2026-03-17T14:22:03Z
Count: 5 in 10 min
Action: Check Railway logs, consider IP block
```

**SMS destination:** `ALERT_PHONE` environment variable (operator's personal phone). Sent via the platform's own Twilio account from a dedicated alerting number (not a client's number).

### 2.2 Email Alert (Review Within Hours)

Email alerts cover events that need investigation but not immediate response. Use a transactional email service (Resend, Postmark, or SendGrid free tier).

**Trigger conditions:**

1. **WebSocket rate limit exceeded** (`ws.rate.minute_exceeded`) -- daily digest of all rejected IPs with counts.

2. **HTTP rate limit exceeded** (`http.rate.exceeded`) -- daily digest.

3. **API cost spike** (`cost.anthropic.spike`, `cost.twilio.spike`) -- same day, with comparison to baseline.

4. **Error rate spike** (`error.rate.5xx`, `error.rate.anthropic`) -- within 30 minutes of first detection, then suppressed for 4 hours.

5. **Tool iteration runaway** (`cost.anthropic.runaway`) -- daily digest with callSid and iteration count.

6. **Server misconfiguration** (`ws.auth.server_misconfig`, `twilio.sig.no_auth_token`) -- immediately. This means a deploy went out without required env vars.

**Email format:** structured HTML with event table, sparkline of event frequency over the last 24h, and direct links to Railway logs filtered by the relevant time window.

### 2.3 Informational Logging Only (No Alert)

These events are captured in structured logs for forensic analysis but generate no notification:

- `ws.auth.expired_token` -- normal during Twilio retries
- `ws.auth.missing_token` -- could be a health check probe
- `ws.rate.concurrent_exceeded` -- usually a Twilio media server reconnect
- `ws.message.oversized` -- single occurrences
- `tool.rate.hit` -- per-session limits working as designed
- `tool.emergency.fired` -- informational record of escalations
- `http.rate.exceeded` -- single occurrences (below daily digest threshold)
- Individual 4xx responses (400, 403, 404)
- Call lifecycle events (setup, prompt, close)

### 2.4 Alert Suppression Rules

- **Deduplication window:** After an SMS alert fires, suppress the same `event_id` for 30 minutes.
- **Daily cap:** Max 10 SMS alerts per day. After that, switch to email-only with a single SMS: "Alert cap reached -- check email."
- **Maintenance mode:** An env var `ALERT_SUPPRESS=true` disables all SMS/email alerts (log-only). Use during planned deploys.


## 3. Log Structure

### 3.1 Structured Log Format

All security events should be emitted as structured JSON via Fastify's built-in Pino logger. This integrates with Railway's log drain and any external log aggregator.

```jsonc
{
  // Standard Pino fields (auto-populated)
  "level": 30,                    // 30=info, 40=warn, 50=error
  "time": 1710684123456,          // Unix epoch ms
  "pid": 1,
  "hostname": "voice-server-abc123",

  // Security event fields (added by application code)
  "event": "twilio.sig.invalid",  // Dot-namespaced event ID from tables above
  "severity": "CRITICAL",         // LOW | MEDIUM | HIGH | CRITICAL
  "category": "security",         // security | cost | error | lifecycle

  // Context (varies by event type)
  "ip": "203.0.113.42",
  "callSid": "CA1234567890abcdef",
  "clientId": "uuid-of-client",
  "path": "/call-status",
  "method": "POST",

  // Human-readable message
  "msg": "Twilio signature validation failed for POST /call-status"
}
```

### 3.2 What to Include

| Field | When to Include | Example |
|-------|----------------|---------|
| `event` | Always | `ws.auth.invalid_token` |
| `severity` | Always | `HIGH` |
| `ip` | All HTTP/WS events | `203.0.113.42` |
| `callSid` | When available | `CAxxx` |
| `clientId` | When a client is resolved | `uuid` |
| `path` | HTTP requests | `/call-status` |
| `method` | HTTP requests | `POST` |
| `reason` | Auth/validation failures | `Invalid token` |
| `userAgent` | HTTP requests (for bot detection) | `TwilioProxy/1.1` |
| `toolName` | Tool events | `escalate_emergency` |
| `iterationCount` | Tool loop events | `5` |
| `durationMs` | API calls, DB queries | `1234` |
| `statusCode` | HTTP responses | `403` |

### 3.3 What to Redact (Never Log)

| Data | Reason | Substitute |
|------|--------|------------|
| `TWILIO_AUTH_TOKEN` | Secret key material | Never reference |
| `ANTHROPIC_API_KEY` | Secret key material | Never reference |
| `ENCRYPTION_KEY` | AES-256 key | Never reference |
| `N8N_WEBHOOK_SECRET` | HMAC secret | Never reference |
| Full caller phone number | PII / TCPA | Use `redactPhone()` from `notifications.ts`: `+1***###4567` |
| Full owner phone number | PII | Same redaction |
| Conversation transcript content | PII, possibly PHI | Log `messageHistory.length` only |
| WebSocket token value | Replayable credential | Log `"token_present": true/false` |
| Request body of Twilio webhooks | Contains phone numbers, recording URLs | Log field names only, redact values |
| `DATABASE_URL` / connection strings | Credentials embedded | Never reference |
| Error stack traces in production | May leak file paths, DB schemas | Log `err.message` only (already done) |

### 3.4 Log Correlation

All services should propagate `callSid` as the primary correlation key. A single phone call touches:

1. **Twilio webhook** (`POST /twiml/:phone`) -- `CallSid` in POST body
2. **Call status** (`POST /call-status`) -- `CallSid` in POST body
3. **WebSocket** (`GET /ws?callSid=X`) -- `callSid` in query params
4. **WebSocket handler** -- `callSid` set from `setup` message
5. **Tool execution** -- inherit from handler scope
6. **Recording** (`POST /recording-complete`) -- `CallSid` in POST body
7. **n8n text-back webhook** -- `callSid` in JSON payload
8. **Database** (`calls.twilioCallSid`) -- stored permanently

**Implementation:** Add `callSid` to the Pino child logger at the start of each request/connection:

```typescript
// In WebSocket handler, after setup message:
const log = req.log.child({ callSid, clientId: client.id });

// In HTTP routes, after parsing body:
const log = req.log.child({ callSid: req.body.CallSid });
```

This ensures every subsequent `log.info()`, `log.warn()`, `log.error()` in that scope automatically includes the callSid.

**Cross-service correlation (Next.js web app + voice server):** Both services write to the same PostgreSQL database with `twilioCallSid` as the join key. For real-time log correlation, use the log aggregator's search (e.g., Axiom: `| where callSid == "CAxxx"`).

### 3.5 Log Retention

| Tier | Retention | Content |
|------|-----------|---------|
| Hot (searchable) | 30 days | All logs |
| Warm (archived) | 90 days | Security events only (`category == "security"`) |
| Cold (compliance) | 1 year | Aggregated daily counts per event_id |


## 4. Implementation Approach

### 4.1 Minimal Code Changes

The goal is to add monitoring without restructuring the application. The changes fall into three layers:

**Layer 1: Emit structured security events (voice server changes)**

Add a thin `security-logger.ts` module:

```typescript
// apps/voice/src/lib/security-logger.ts
import { pino } from 'pino';

const secLog = pino({ name: 'security' });

interface SecurityEvent {
  event: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ip?: string;
  callSid?: string;
  clientId?: string;
  reason?: string;
  [key: string]: unknown;
}

export function logSecurityEvent(evt: SecurityEvent): void {
  const level = evt.severity === 'CRITICAL' || evt.severity === 'HIGH' ? 'warn' : 'info';
  secLog[level]({ ...evt, category: 'security' }, `[${evt.event}] ${evt.reason || ''}`);
}
```

Then instrument existing code at the points identified in Section 1. Each instrumentation is a single function call added to an existing code path -- no control flow changes.

**Files to modify (6 files, ~30 lines added total):**

| File | Change |
|------|--------|
| `services/twilio-validate.ts` | Add `logSecurityEvent()` calls for missing/invalid signature (lines 18, 28) |
| `lib/ws-auth.ts` | Export reason codes as constants; no logging here (caller logs) |
| `index.ts` (WS route) | Replace `req.log.warn` with `logSecurityEvent()` for auth and rate limit rejections |
| `ws/handler.ts` | Add `logSecurityEvent()` when tool rate limit hit (line 253) and emergency SMS fails (line 178) |
| `ws/handler.ts` | Add `logSecurityEvent()` for oversized messages (line 96) |
| `index.ts` (process handlers) | Add `logSecurityEvent()` for unhandled rejection/exception (lines 153, 161) |

**Layer 2: Alert routing (new module, ~80 lines)**

A `security-alerter.ts` module that consumes security events and decides whether to fire SMS/email:

```typescript
// apps/voice/src/lib/security-alerter.ts
// - Maintains in-memory sliding window counters per event_id
// - Checks thresholds from Section 2.1 / 2.2
// - Calls smsToOwner() for SMS alerts
// - Queues email alerts (batched, sent via Resend API)
// - Enforces dedup window and daily cap
```

Wire it into `logSecurityEvent()` so every security event is evaluated against alert rules.

**Layer 3: External integrations (no code changes -- config only)**

Railway log drain + external monitoring service. See Section 4.2.

### 4.2 Recommended Tooling

#### Primary: Sentry (Error Tracking + Performance)

**Why:** First-class Fastify integration (`@sentry/node`), source maps, alert rules, Railway-compatible.

**Setup:**
```bash
npm install @sentry/node
```
```typescript
// Top of index.ts, before Fastify init
import * as Sentry from '@sentry/node';
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,        // 10% of transactions for perf
  beforeSend(event) {
    // Scrub PII from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(b => ({
        ...b,
        data: undefined,        // Remove request bodies
      }));
    }
    return event;
  },
});
```

**Cost:** Free tier = 5,000 errors/month, 10,000 transactions/month. More than enough for a low-traffic voice server. First paid tier is $26/month.

**Covers:** `error.rate.*`, `error.process.unhandled`, stack traces, release tracking, alert rules with Slack/email/PagerDuty.

#### Secondary: Axiom (Log Aggregation + Dashboards)

**Why:** Generous free tier (500 GB ingest/month), native Railway integration (one-click log drain), SQL-like query language, built-in dashboards.

**Setup:**
1. In Railway project settings, add Axiom as a log drain (requires Axiom API token + dataset name).
2. All `stdout` JSON from the voice server and Next.js app flows automatically.
3. No code changes needed -- Pino JSON output is parsed automatically.

**Cost:** Free tier = 500 GB/month ingest, 30-day retention. Paid starts at $25/month for longer retention.

**Covers:** Log search, correlation by `callSid`, security event dashboards, anomaly detection queries, cost monitoring (with a daily cron query against Twilio/Anthropic usage APIs).

**Key Axiom queries to create as saved views:**

```kusto
// Security events in last hour
['voice-server']
| where category == "security"
| where _time > ago(1h)
| sort by _time desc

// Top rejected IPs
['voice-server']
| where event startswith "ws.rate" or event == "twilio.sig.invalid"
| summarize count() by ip
| sort by count_ desc
| take 20

// Correlate a call across all events
['voice-server']
| where callSid == "CAxxx"
| sort by _time asc
```

#### Uptime: BetterUptime (or Railway's built-in health checks)

**Why:** Monitors `/health` endpoint externally. Detects when the server is completely down (Railway restart loop, OOM, etc.).

**Setup:**
1. Point BetterUptime at `https://voice.serviceline.ai/health`
2. Check interval: 60 seconds
3. Alert: SMS + email when 2 consecutive checks fail
4. Status page: optional public status page for transparency

**Cost:** Free tier = 10 monitors, 3-minute intervals. Paid ($20/month) = 1-minute intervals + SMS alerts.

**Alternative:** Railway has a built-in health check (configure in `railway.json`). It restarts the service on failure but does not send external alerts. Use BetterUptime for the external notification layer.

#### Cost Monitoring: Daily Cron Script

A lightweight script (runs via Railway cron or n8n scheduled workflow) that:

1. Calls Twilio Usage Records API: `GET /2010-04-01/Accounts/{sid}/Usage/Records/Daily.json`
2. Calls Anthropic usage endpoint (or parses response headers logged in Axiom)
3. Compares against 7-day rolling average stored in a `cost_tracking` table
4. Fires email alert if > 2x average

**Cost:** Zero incremental cost (uses existing Twilio account, runs on existing Railway instance).

### 4.3 Implementation Phases

**Phase A -- Foundation (1-2 hours)**
1. Create `security-logger.ts` with `logSecurityEvent()` function
2. Instrument the 6 files listed in Section 4.1
3. Add `callSid` child loggers for correlation
4. Deploy and verify events appear in Railway logs

**Phase B -- External Monitoring (30 minutes)**
1. Create Sentry project, add `@sentry/node`, configure DSN
2. Connect Axiom log drain in Railway
3. Set up BetterUptime monitor on `/health`

**Phase C -- Alerting (1-2 hours)**
1. Create `security-alerter.ts` with sliding window counters
2. Configure SMS alerting via `ALERT_PHONE` env var
3. Set up Sentry alert rules for error rate thresholds
4. Create Axiom dashboard with saved queries

**Phase D -- Cost Monitoring (1 hour)**
1. Create `cost_tracking` table (migration)
2. Write daily cost check script
3. Schedule via n8n or Railway cron

### 4.4 Cost Summary

| Service | Tier | Monthly Cost | Covers |
|---------|------|-------------|--------|
| Sentry | Free | $0 | Error tracking, performance, alerts |
| Axiom | Free | $0 | Log aggregation, dashboards, search |
| BetterUptime | Free | $0 | Uptime monitoring (3-min checks) |
| SMS alerts (Twilio) | Pay-per-use | ~$1-5 | Operator SMS alerts (~50-500/month worst case) |
| Resend (email) | Free | $0 | Email alerts (100 emails/day free) |
| **Total** | | **$1-5/month** | |

If the free tiers are outgrown:

| Service | Paid Tier | Monthly Cost |
|---------|-----------|-------------|
| Sentry | Team | $26 |
| Axiom | Personal | $25 |
| BetterUptime | Basic | $20 |
| **Total (paid)** | | **$71 + SMS** |

### 4.5 Environment Variables to Add

```bash
# Sentry
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Axiom (configured in Railway log drain, not in app)
# No env var needed

# BetterUptime (configured in their dashboard)
# No env var needed

# Alerting
ALERT_PHONE=+1234567890           # Operator phone for SMS alerts
ALERT_EMAIL=operator@example.com  # Operator email for digests
ALERT_SUPPRESS=false              # Set true during maintenance
ALERT_SMS_DAILY_CAP=10            # Max SMS alerts per day

# Cost monitoring
TWILIO_ACCOUNT_SID=               # Already exists
ANTHROPIC_API_KEY=                 # Already exists

# Email (Resend)
RESEND_API_KEY=re_xxx
```

### 4.6 What This Design Does NOT Cover

- **WAF / IP blocking:** Railway does not offer a built-in WAF. If persistent attack traffic is detected, the recommended response is to add the IP to a blocklist in a Fastify `onRequest` hook. Cloudflare proxy ($0) is the long-term solution for DDoS protection.
- **Intrusion detection on the database:** Railway PostgreSQL does not expose `pg_audit` or query logging. Database security monitoring would require migrating to a managed Postgres provider (Supabase, Neon, RDS).
- **Next.js web app monitoring:** This document covers the voice server. The web app should use the same Sentry project and Axiom log drain, with equivalent structured logging for admin panel auth events.
- **Compliance logging (SOC 2, HIPAA):** This design provides the technical foundation but does not address compliance framework requirements. If ServiceLine handles health-related calls, a HIPAA-specific review of log retention and access controls is needed.
