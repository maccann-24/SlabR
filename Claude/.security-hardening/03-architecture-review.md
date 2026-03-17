# ServiceLine AI — Architecture Security Review

**Date:** 2026-03-17

## Critical Architecture Gaps

### 1. Flat Trust Model
All 3 services (voice, web, n8n) share one PostgreSQL user with full read/write on all tables. No privilege separation. One compromised service = total data access.

**Fix:** Per-service DB users with minimum required privileges.

### 2. Unauthenticated WebSocket (CRITICAL)
`/ws` endpoint accepts any connection. No origin check, no token, no callSid validation. The entire voice→Claude→tool chain is triggerable by anyone on the internet.

**Fix:** HMAC-signed token in WebSocket URL, or callSid verification against Twilio API.

### 3. No Service-to-Service Auth
Voice server → n8n webhook call has no authentication. Railway private network provides network isolation but no identity verification.

**Fix:** HMAC signature header on all inter-service calls.

## Data Classification Matrix

| Data | Sensitivity | Encrypted at Rest | Encrypted in Transit | Exposure Points |
|------|------------|-------------------|---------------------|-----------------|
| Google OAuth tokens | CRITICAL | NO ⚠️ | Yes (TLS) | DB compromise |
| Caller phones/names/addresses | HIGH | No | Yes | Logs, Anthropic API, Twilio, SMS |
| Voice recordings | HIGH | N/A (Twilio-hosted) | Yes | SMS notifications, dashboard |
| AI call summaries | HIGH | No | Yes | Contains PII in free text |
| Conversation transcripts | HIGH | No | Yes | Anthropic API |
| Stripe IDs | HIGH | No | Yes | DB compromise |
| Dashboard PINs | MEDIUM | Bcrypt hash ✓ | Yes | Brute-forceable |
| Business config | LOW | No | Yes | Minimal risk |

## Zero-Trust Recommendations

1. **Verify every service identity** — per-service DB credentials, HMAC-signed webhooks
2. **Encrypt sensitive data at rest** — AES-256-GCM for OAuth tokens, consider column encryption for PII
3. **Authenticate every request** — WebSocket tokens, n8n webhook secrets, dashboard auth upgrade
4. **Minimize blast radius** — per-service DB users, read replicas for dashboard
5. **Log without leaking** — PII redaction in all log output, minimum retention

## Twilio → Voice Server → Claude API Chain Risks

1. Unauthenticated entry bypasses Twilio entirely (CRITICAL)
2. No per-tool rate limiting (SMS flood via escalate_emergency)
3. Call summary propagates PII to 3 locations (Anthropic, DB, SMS)

**Fix:** Authenticate WebSocket, add per-tool rate limits (2 emergency/session, 3 bookings/session), add PII filter to summarization.
