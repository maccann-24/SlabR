# Step 5: Backend Security Hardening

## Controls Already In Place (verified)
- Twilio webhook signature validation (fail-closed)
- WebSocket HMAC-SHA256 auth with timing-safe comparison
- WebSocket per-IP rate limiting (3 concurrent, 10/min)
- Fastify helmet + CORS + rate limiting
- OAuth token encryption (AES-256-GCM) with token service API
- Prompt injection sanitization (regex + truncation + delimiter)
- PII log redaction (redactPhone)
- E.164 phone validation on tool inputs
- Per-tool session rate limits (2 emergency, 5 booking)
- Message processing serialization mutex
- Idle + max call duration timeouts
- Graceful shutdown (SIGTERM/SIGINT)
- DB pool with SSL in production + connection timeout
- Env var validation at startup (5 required vars + ENCRYPTION_KEY)

## New Controls Added in This Step
- WebSocket message size guard (64KB max)
- Recording URL domain validation (Twilio-only allowlist)
- Route parameter validation before DB queries
- Tool input field length limits
- Date format validation on check_availability
- Sanitized tool error messages (no raw err.message to LLM)
- Process-level unhandledRejection/uncaughtException handlers
- DB pool error message scrubbing
- Webhook body field type validation

## Remaining Gaps (acceptable for current phase)
- No Row-Level Security in PostgreSQL (single DB user for all services)
- No per-service DB credentials (all services share one connection)
- No request body schema validation (Fastify JSON Schema)
- No audit logging of data access patterns
- Dashboard PIN auth not implemented (web app is scaffolding)
