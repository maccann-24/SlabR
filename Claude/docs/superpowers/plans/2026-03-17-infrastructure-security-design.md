# ServiceLine AI — Infrastructure Security Design

**Status:** DESIGN ONLY — not implemented
**Date:** 2026-03-17
**Scope:** Railway deployment, network security, monitoring, backup/DR, Twilio failover

---

## System Overview

| Service | Runtime | Public? | Port | Purpose |
|---------|---------|---------|------|---------|
| Voice Server | Fastify 5 (Node) | YES | 3001 | Twilio webhooks (TwiML, call-status, recording) + WebSocket for ConversationRelay |
| Web App | Next.js 16 (Node) | YES | 3000 | Operator dashboard, admin panel, Google OAuth callback, Stripe webhooks |
| n8n | Docker (self-hosted) | NO | 5678 | Workflow automation (missed-call textback, etc.) |
| PostgreSQL 16 | Railway addon | NO | 5432 | Primary datastore |

External dependencies: Twilio (webhooks + API), Anthropic Claude, Google APIs, Stripe.

---

## 1. Railway Deployment Architecture

### 1.1 Project Structure

Create a single Railway **project** with four services:

```
Railway Project: serviceline-production
  ├── Service: voice-server    (from repo, /apps/voice)
  ├── Service: web             (from repo, /apps/web)
  ├── Service: n8n             (Docker image: n8nio/n8n:latest)
  └── Plugin:  PostgreSQL 16   (Railway managed addon)
```

A separate `serviceline-staging` project mirrors this for pre-deploy validation.

### 1.2 Private Networking

Railway assigns each service an internal DNS name on a shared private network within a project. All inter-service communication should use these internal addresses to avoid public internet traversal.

| Connection | URL Pattern |
|------------|-------------|
| Voice -> Postgres | `${{Postgres.DATABASE_PRIVATE_URL}}` (Railway reference variable) |
| Web -> Postgres | `${{Postgres.DATABASE_PRIVATE_URL}}` |
| n8n -> Postgres | `${{Postgres.DATABASE_PRIVATE_URL}}` |
| Web -> Voice (internal health) | `http://voice-server.railway.internal:3001` |
| Voice -> n8n (webhook trigger) | `http://n8n.railway.internal:5678/webhook/missed-call-textback` |

Key rule: The `N8N_TEXTBACK_WEBHOOK_URL` env var must point to the **internal** n8n address, never a public URL. This ensures n8n workflow triggers never leave Railway's private network.

### 1.3 Custom Domains and SSL

| Service | Domain | SSL |
|---------|--------|-----|
| Voice Server | `voice.servicelineai.com` | Railway auto-provisions via Let's Encrypt; add CNAME to Railway-provided target |
| Web App | `app.servicelineai.com` | Same — Railway auto-SSL |
| n8n | No custom domain | No public endpoint |

Twilio webhook URLs configured in Twilio Console must use the voice server's public domain:
- Voice URL: `https://voice.servicelineai.com/twiml/{twilioPhone}`
- Status Callback: `https://voice.servicelineai.com/call-status`
- Recording Callback: `https://voice.servicelineai.com/recording`
- ConversationRelay WS: `wss://voice.servicelineai.com/ws`

### 1.4 Health Check Configuration

Configure in each service's Railway settings:

| Service | Health Endpoint | Path | Interval | Timeout | Restart Policy |
|---------|-----------------|------|----------|---------|----------------|
| Voice Server | HTTP GET | `/health` | 30s | 5s | Restart on 3 consecutive failures |
| Web App | HTTP GET | `/api/health` (Next.js API route) | 30s | 5s | Restart on 3 consecutive failures |
| n8n | HTTP GET | `/healthz` | 60s | 10s | Restart on 3 consecutive failures |

The voice server `/health` endpoint already exists and returns `{ status: 'ok', service: 'voice-server' }`. The web app needs an equivalent `/api/health` route added.

### 1.5 Environment Variable Management

**Railway's env var system** is the source of truth for production secrets. Never commit secrets to the repo.

| Variable | Service(s) | Notes |
|----------|------------|-------|
| `DATABASE_URL` | voice, web, n8n | Use `${{Postgres.DATABASE_PRIVATE_URL}}` Railway reference |
| `TWILIO_ACCOUNT_SID` | voice | Shared variable across project |
| `TWILIO_AUTH_TOKEN` | voice | Shared variable across project |
| `TWILIO_PHONE_NUMBER` | voice | |
| `ANTHROPIC_API_KEY` | voice | |
| `GOOGLE_CLIENT_ID` | web | |
| `GOOGLE_CLIENT_SECRET` | web | |
| `STRIPE_SECRET_KEY` | web | |
| `STRIPE_WEBHOOK_SECRET` | web | |
| `ENCRYPTION_KEY` | voice | 64-char hex (AES-256-GCM). Generate once, never rotate without re-encrypting existing data |
| `NEXTAUTH_SECRET` | web | Minimum 32 chars, cryptographically random |
| `VOICE_SERVER_URL` | voice, web | `https://voice.servicelineai.com` (public, for Twilio callback URLs in TwiML) |
| `WEB_APP_URL` | voice, web | `https://app.servicelineai.com` |
| `N8N_TEXTBACK_WEBHOOK_URL` | voice | `http://n8n.railway.internal:5678/webhook/missed-call-textback` (PRIVATE) |
| `NODE_ENV` | voice, web | `production` |

**Rotation policy:**
- `TWILIO_AUTH_TOKEN`: rotate in Twilio Console, update Railway var, redeploy voice server. Twilio supports secondary auth tokens for zero-downtime rotation.
- `ENCRYPTION_KEY`: never rotate without a data migration script that re-encrypts all encrypted columns.
- `ANTHROPIC_API_KEY`: rotate in Anthropic Console, update Railway var, redeploy.

---

## 2. Network Security

### 2.1 Public Endpoint Exposure

| Service | Public? | Justification |
|---------|---------|---------------|
| Voice Server | YES | Twilio must reach webhook endpoints over public internet; browser clients need WSS |
| Web App | YES | Operator-facing dashboard |
| n8n | NO | Triggered only by voice server via private network. No external access needed |
| PostgreSQL | NO | Accessed only via Railway private network. No public TCP exposure |

### 2.2 Restricting n8n to Private Network

Railway services are private by default -- they only get a public URL when you explicitly generate one or attach a custom domain. For n8n:

1. **Do not** generate a public Railway domain for the n8n service.
2. **Do not** attach a custom domain.
3. n8n is reachable only at `n8n.railway.internal:5678` from other services in the same Railway project.
4. Set `N8N_EDITOR_ENABLED=false` in production (or `N8N_EDITOR_BASE_URL` to localhost-only). If editor access is needed for debugging, temporarily generate a public URL, access it, then remove it.
5. Set n8n basic auth: `N8N_BASIC_AUTH_ACTIVE=true`, `N8N_BASIC_AUTH_USER`, `N8N_BASIC_AUTH_PASSWORD` as defense-in-depth even though the service is private.
6. n8n webhook paths should use a secret suffix (e.g., `/webhook/{uuid}/missed-call-textback`) rather than guessable names.

### 2.3 Voice Server Hardening (Already Implemented)

The codebase already includes several critical controls:

- **Twilio webhook signature validation** (`validateTwilioWebhook` preHandler hook on all webhook routes) -- rejects requests not signed by Twilio. Enforced in production by blocking `SKIP_TWILIO_VALIDATION=true`.
- **WebSocket token authentication** (`validateWsToken`) -- HMAC-based token with timestamp and callSid, preventing unauthorized WS connections.
- **WebSocket rate limiting** (`canAcceptWsConnection`) -- per-IP connection limits.
- **Global HTTP rate limiting** -- 100 req/min per IP via `@fastify/rate-limit`.
- **Helmet security headers** -- standard hardening.
- **CORS restricted** to Twilio domains, own voice server URL, and web app URL.

### 2.4 DDoS Protection Strategy

**Layer 1 -- Cloudflare (recommended):**

Place Cloudflare in front of both public services by proxying DNS (orange cloud) for `voice.servicelineai.com` and `app.servicelineai.com`.

Configuration:
- **SSL mode:** Full (Strict) -- Cloudflare terminates TLS, re-encrypts to Railway origin.
- **Web Application Firewall (WAF):** Enable managed ruleset. Add custom rule to allow Twilio IP ranges (published at https://www.twilio.com/docs/sip-trunking/ip-addresses) on voice server webhook paths.
- **Rate limiting rule:** 200 req/min per IP on `/twiml/*`, `/call-status`, `/recording` paths (above Fastify's 100/min app-level limit to avoid false positives on legitimate Twilio bursts).
- **Bot fight mode:** Enabled for web app; disabled for voice server (Twilio requests would be blocked).
- **WebSocket support:** Enabled (required for `/ws` endpoint). Cloudflare supports WSS proxying on Pro plan and above.
- **Cache:** Bypass for all API routes (Cache-Control: no-store). Only cache static assets from web app.

**Layer 2 -- Application-level (already in place):**

Fastify rate limiting (100 req/min/IP) and WebSocket connection limiting act as the second defense layer if Cloudflare is bypassed or misconfigured.

**Layer 3 -- Railway:**

Railway provides basic infrastructure-level protection. No additional configuration needed, but note that Railway does not offer configurable WAF or IP allowlisting at the infrastructure level.

**Twilio IP allowlisting (optional, high-security):**

If Cloudflare is in place, create a WAF rule that only allows Twilio's published IP ranges to reach `/twiml/*`, `/call-status`, and `/recording` endpoints. This prevents any non-Twilio HTTP client from reaching webhook routes, even with a forged request. The signature validation is the primary control; IP allowlisting is defense-in-depth.

### 2.5 Database Security

- PostgreSQL is accessible only via Railway private network. No public TCP endpoint.
- Connection string uses `DATABASE_PRIVATE_URL` (internal DNS, no internet traversal).
- Application connects with a single service-role user. If Railway supports multiple PG users in the future, create read-only users for reporting queries.
- Enable `log_connections` and `log_disconnections` in PG config if Railway allows custom parameters.

---

## 3. Monitoring and Alerting

### 3.1 What to Monitor

| Category | Metric | Source | Threshold |
|----------|--------|--------|-----------|
| **Uptime** | Voice server reachable | BetterUptime / UptimeRobot | Alert on 1 failure (30s check) |
| **Uptime** | Web app reachable | BetterUptime / UptimeRobot | Alert on 1 failure (30s check) |
| **Error rate** | HTTP 5xx responses | Sentry + Railway logs | > 5 per minute |
| **Error rate** | WebSocket connection failures | Application logs (structured) | > 10 per minute |
| **Latency** | Webhook response time | Twilio Console debugger + Sentry | p95 > 2s |
| **API costs** | Anthropic token usage | Anthropic Console / monthly check | > $X/day budget |
| **API costs** | Twilio monthly spend | Twilio Console alerts | > $X/month budget |
| **Security** | Failed Twilio signature validations | Application logs | Any occurrence (possible attack) |
| **Security** | Failed WebSocket auth attempts | Application logs | > 20 per hour |
| **Database** | Connection count | Railway metrics | > 80% of max_connections |
| **Database** | Disk usage | Railway metrics | > 80% of allocated storage |
| **Resources** | Memory usage per service | Railway metrics | > 90% of allocated |
| **Resources** | CPU usage per service | Railway metrics | Sustained > 80% for 5 min |

### 3.2 Alerting Channels

| Severity | Channel | Examples |
|----------|---------|----------|
| **Critical (P1)** | SMS to operator + Slack/Discord | Voice server down, DB unreachable, security event |
| **Warning (P2)** | Email + Slack/Discord | High error rate, API cost spike, disk 80% |
| **Info (P3)** | Slack/Discord only | Deploy completed, scheduled backup ran |

Implementation: Use **BetterUptime** (or UptimeRobot) for external uptime monitoring with SMS escalation. Use **Sentry** for error tracking with email/Slack alerting.

### 3.3 Recommended Tooling

| Tool | Purpose | Cost |
|------|---------|------|
| **Sentry** | Error tracking, performance monitoring, release tracking | Free tier sufficient for early stage |
| **BetterUptime** (or UptimeRobot) | External uptime checks, status page, SMS alerts | Free tier for basic; ~$20/mo for SMS |
| **Railway built-in** | Logs, metrics (CPU/memory/network), deploy notifications | Included |
| **Twilio Console Debugger** | Webhook delivery failures, error codes | Included |
| **Anthropic Console** | API usage, rate limit monitoring | Included |

Sentry integration: Add `@sentry/node` to voice server and `@sentry/nextjs` to web app. Initialize with DSN from env var `SENTRY_DSN`. Capture all unhandled exceptions (the voice server's existing `uncaughtException` and `unhandledRejection` handlers should forward to Sentry before exiting).

### 3.4 Log Retention

- **Railway:** Retains stdout/stderr logs for 7 days on Pro plan. This is sufficient for debugging but not for compliance.
- **Recommendation:** For audit trail requirements, ship structured JSON logs to a log aggregator (Axiom, Datadog, or Logtail -- all have Railway integrations). Retain for 90 days minimum.
- **Sensitive data in logs:** Never log full call recordings, transcripts, or PII. Log callSid, timestamps, and status codes only. The voice server's Fastify logger already uses structured JSON format which is compatible with log aggregators.

---

## 4. Backup and Disaster Recovery

### 4.1 PostgreSQL Backup Strategy

**Railway automatic backups:**
- Railway's managed PostgreSQL takes automatic daily snapshots.
- Retention: 7 days (Pro plan).
- Recovery: point-in-time restore available via Railway dashboard.

**Manual backup layer (recommended):**

Add a scheduled job (Railway cron service or external cron) that runs `pg_dump` daily and uploads to an external location:

```
Schedule: Daily at 04:00 UTC
Command:  pg_dump $DATABASE_URL --format=custom --compress=9 | aws s3 cp - s3://serviceline-backups/pg/$(date +%Y%m%d).dump
Retention: 30 days in S3 (lifecycle policy)
```

Alternative if AWS is not in scope: upload to Google Cloud Storage or Backblaze B2.

This provides an independent backup outside Railway's infrastructure.

### 4.2 RTO and RPO Targets

| Scenario | RPO (max data loss) | RTO (max downtime) |
|----------|--------------------|--------------------|
| Single service crash | 0 (Railway auto-restarts) | < 2 minutes |
| Bad deploy | 0 (rollback to previous) | < 5 minutes |
| Database corruption | 24 hours (daily backup) | < 1 hour (restore from snapshot) |
| Railway region outage | 24 hours | 4-8 hours (redeploy to new provider) |
| Full Railway platform failure | 24 hours | 8-24 hours (rebuild on Render/Fly.io) |

### 4.3 Railway Outage Failover Strategy

Railway is a single-provider dependency. Full platform failure is unlikely but possible. Mitigation:

1. **External backups** (Section 4.1) ensure data survives a Railway failure.
2. **Twilio fallback function** (Section 5) ensures incoming calls still get answered with voicemail even when the entire Railway deployment is unreachable.
3. **Infrastructure-as-code readiness:** The repo contains Dockerfiles and a `docker-compose.yml`. If Railway becomes unavailable for an extended period, redeploy to Render, Fly.io, or a VPS provider using the same Docker images. The only Railway-specific dependency is the managed PostgreSQL; replace with any Postgres 16 instance.
4. **DNS failover:** If using Cloudflare, configure a failover origin (e.g., a standby on Render) that Cloudflare switches to if the primary origin health check fails. This is a Cloudflare Load Balancing feature (~$5/mo per origin).

### 4.4 What to Back Up Beyond the Database

| Asset | Location | Backup Method |
|-------|----------|---------------|
| Database | Railway PostgreSQL | Automatic + manual pg_dump to S3 |
| Environment variables | Railway dashboard | Export and store in encrypted password manager (1Password/Bitwarden vault) |
| Twilio configuration | Twilio Console | Document phone numbers, webhook URLs, SIP config in a runbook |
| n8n workflows | n8n internal DB (shares Railway PG) | Included in PG backup; also export JSON via n8n CLI |
| DNS records | Cloudflare / registrar | Document in runbook |
| Source code | GitHub | Git is inherently distributed; ensure at least 2 team members have local clones |

---

## 5. Twilio Fallback Function (Voicemail)

### 5.1 Purpose

If the voice server on Railway is unreachable (outage, deploy, crash), Twilio needs a fallback that:
1. Answers the call with a professional message
2. Records a voicemail
3. Sends an SMS notification to the operator
4. Stores the recording URL for later retrieval

This runs on **Twilio Functions** (Twilio's serverless runtime), completely independent of Railway.

### 5.2 Twilio Console Configuration

In Twilio Console, for each phone number:
- **Voice Configuration > A call comes in:** Webhook to `https://voice.servicelineai.com/twiml/{phone}`
- **Voice Configuration > Primary Handler Fails:** TwiML App or Function URL pointing to the fallback function
- **Fallback URL:** `https://serviceline-XXXX.twil.io/voicemail-fallback`

Twilio automatically invokes the fallback URL when the primary webhook returns an error (5xx, timeout > 15s, or connection refused).

### 5.3 Fallback Function: `/voicemail-fallback`

```javascript
// Twilio Function: /voicemail-fallback
// Runtime: Node.js 18 on Twilio Serverless
// Environment Variables (set in Twilio Console > Functions > Environment Variables):
//   OPERATOR_PHONE: +1XXXXXXXXXX (operator's mobile for SMS notification)
//   BUSINESS_NAME: "ServiceLine AI" (or client-specific)
//   RECORDING_STATUS_CALLBACK: https://serviceline-XXXX.twil.io/recording-notify

exports.handler = function (context, event, callback) {
  const twiml = new Twilio.twiml.VoiceResponse();

  twiml.say(
    { voice: 'Polly.Joanna', language: 'en-US' },
    `Thank you for calling ${context.BUSINESS_NAME}. ` +
    `We are unable to take your call right now. ` +
    `Please leave a message after the tone and we will return your call as soon as possible.`
  );

  twiml.record({
    maxLength: 120,           // 2 minutes max
    timeout: 5,               // 5s silence = end of message
    transcribe: false,        // Do not use Twilio's transcription (we use Claude)
    recordingStatusCallback: context.RECORDING_STATUS_CALLBACK,
    recordingStatusCallbackMethod: 'POST',
    action: '/voicemail-goodbye',
  });

  // If caller doesn't leave a message (hangs up during beep)
  twiml.say('We did not receive a message. Goodbye.');

  return callback(null, twiml);
};
```

### 5.4 Goodbye Handler: `/voicemail-goodbye`

```javascript
// Twilio Function: /voicemail-goodbye
exports.handler = function (context, event, callback) {
  const twiml = new Twilio.twiml.VoiceResponse();
  twiml.say(
    { voice: 'Polly.Joanna' },
    'Thank you. Your message has been recorded. Goodbye.'
  );
  twiml.hangup();
  return callback(null, twiml);
};
```

### 5.5 Recording Notification: `/recording-notify`

```javascript
// Twilio Function: /recording-notify
// Called by Twilio when recording is ready
exports.handler = function (context, event, callback) {
  const client = context.getTwilioClient();

  const from = event.From || 'Unknown';
  const recordingUrl = event.RecordingUrl;
  const callSid = event.CallSid;
  const duration = event.RecordingDuration;

  // Send SMS to operator
  client.messages
    .create({
      to: context.OPERATOR_PHONE,
      from: context.TWILIO_PHONE_NUMBER || event.To,
      body:
        `Voicemail received (fallback mode)\n` +
        `From: ${from}\n` +
        `Duration: ${duration}s\n` +
        `Recording: ${recordingUrl}.mp3\n` +
        `CallSid: ${callSid}`,
    })
    .then(() => callback(null, 'OK'))
    .catch((err) => {
      console.error('SMS notification failed:', err);
      // Still return 200 — recording is saved by Twilio regardless
      callback(null, 'SMS failed but recording saved');
    });
};
```

### 5.6 Fallback Function Deployment

1. In Twilio Console, go to **Functions and Assets > Services**.
2. Create a new service named `serviceline-fallback`.
3. Add the three functions above as separate routes.
4. Set environment variables: `OPERATOR_PHONE`, `BUSINESS_NAME`, `RECORDING_STATUS_CALLBACK`.
5. **Enable "Check for valid Twilio signature"** on the service (Twilio Functions support this natively -- it rejects non-Twilio requests).
6. Deploy.
7. Configure each Twilio phone number's fallback URL to point to the deployed `/voicemail-fallback` function.

### 5.7 Testing the Fallback

1. Stop the voice server locally or on Railway.
2. Call the Twilio number.
3. Verify: fallback greeting plays, recording is captured, SMS arrives at operator phone.
4. Restart voice server. Verify subsequent calls route to the primary handler normally.

---

## 6. Security Checklist (Pre-Launch)

| # | Item | Status |
|---|------|--------|
| 1 | All env vars set in Railway (none hardcoded in repo) | |
| 2 | `NODE_ENV=production` on all services | |
| 3 | `SKIP_TWILIO_VALIDATION` is NOT set (or set to `false`) | |
| 4 | `ENCRYPTION_KEY` is a 64-char hex string, stored only in Railway | |
| 5 | `NEXTAUTH_SECRET` is cryptographically random, >= 32 chars | |
| 6 | n8n has NO public domain attached | |
| 7 | n8n basic auth enabled (`N8N_BASIC_AUTH_ACTIVE=true`) | |
| 8 | PostgreSQL uses `DATABASE_PRIVATE_URL` (not public) | |
| 9 | Cloudflare proxy enabled (orange cloud) on public domains | |
| 10 | Twilio fallback URL configured on all phone numbers | |
| 11 | Sentry DSN configured, errors flowing | |
| 12 | BetterUptime monitors active for `/health` endpoints | |
| 13 | Manual PG backup tested (pg_dump + restore) | |
| 14 | CORS origins updated to production domains | |
| 15 | Railway health checks configured per Section 1.4 | |
| 16 | Google OAuth redirect URI updated to production domain | |
| 17 | Stripe webhook endpoint registered with production URL | |
| 18 | `.env.example` does NOT contain real secrets | |

---

## 7. Cost Estimates (Monthly)

| Item | Estimated Cost |
|------|---------------|
| Railway (3 services + PG, Pro plan) | $20-50 |
| Cloudflare (Pro plan for WSS + WAF) | $20 |
| BetterUptime (SMS alerts) | $0-20 |
| Sentry (free tier) | $0 |
| External backup storage (S3/B2) | $1-5 |
| Twilio Functions (fallback, low volume) | < $1 |
| **Total infrastructure overhead** | **~$40-100/mo** |

This does not include Twilio voice/SMS usage, Anthropic API costs, or Google API costs, which scale with call volume.
