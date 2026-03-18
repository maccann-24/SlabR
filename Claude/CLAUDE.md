# CLAUDE.md — ServiceLine AI

## Non-Negotiable Rules

### Tests Are Sacred
- **NO test may EVER be skipped, deleted, or weakened to make code pass.**
- If a test fails, the CODE is wrong — not the test.
- The only valid reason to modify a test is when the PRODUCT REQUIREMENTS change (e.g., a new industry template changes emergency keywords). Even then, the test is updated to match the new requirement — never removed.
- All 888+ tests must pass before any commit reaches main.
- Run `cd apps/voice && npx vitest run` before every push. Zero failures allowed.

### Test Coverage by Industry
- Plumbing: 215 tests (scenario-100, scenario-advanced, scenario-voice-suite)
- HVAC: 106 tests (scenario-hvac)
- Pest Control: 71 tests (scenario-pest)
- Lawn Care: 108 tests (scenario-lawn)
- Painting: 91 tests (scenario-painting)
- Electrical: 94 tests (scenario-electrical)
- Core: 203 tests (anti-rambling, call-brief, handler, edge-cases, horror-stories, positive-outcomes, notifications, on-call, tools, twiml, call-status, twilio-validate, demo-flow)

## Project Structure

- `apps/voice/` — Fastify voice server (Twilio ConversationRelay + Claude Haiku)
- `apps/web/` — Next.js admin panel + client dashboard
- `packages/db/` — Drizzle ORM schema (12 tables)
- `packages/templates/` — Industry-specific prompt templates (6 industries)
- `scripts/seed-demo.ts` — Seeds 3 demo clients across industries
- `docs/` — Specs, plans, GTM strategy, security hardening

## Key Architecture Decisions

- Voice responses: under 35 words, under 2 sentences, dispatcher tone
- Emergency triage: defined per industry template, never hardcoded
- On-call routing: schedule-based with timed escalation to owner
- Call briefing cards: structured JSON on every booking
- Security: HMAC WebSocket auth, AES-256-GCM token encryption, OWASP compliant
- Database: PostgreSQL via Drizzle ORM, Railway for production
- Dark theme UI: amber/gold for revenue, emerald for positive metrics

## Git Rules

- Never commit .env
- Never force-push main
- Never --no-verify
- Always new commits, not amend
- Run tests before every push
