# ServiceLine AI

AI-powered phone answering service for home service contractors (plumbing, HVAC, pest control, electrical, painting, lawn care). Answers missed calls, books appointments, triages emergencies, and sends technicians a briefing card via SMS.

## Local Setup

```bash
# Prerequisites: Node.js 20+, PostgreSQL 15+, npm 10+

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in DATABASE_URL, ANTHROPIC_API_KEY, TWILIO_* credentials

# 3. Create database and run migrations
createdb serviceline
npx drizzle-kit push

# 4. Seed demo data
npm run seed

# 5. Start both servers (in separate terminals)
cd apps/voice && npm run dev    # Fastify + WebSocket on :3001
cd apps/web && npm run dev      # Next.js on :3000
```

## Folder Structure

```
apps/
  voice/       Fastify server — Twilio WebSocket handler, AI voice agent, on-call routing
  web/         Next.js app — landing page, client dashboards, admin panel
packages/
  db/          Drizzle ORM schema, migrations, encryption utilities
  config/      Shared constants (AI model, pricing, limits)
  templates/   SMS/notification templates
scripts/
  seed-demo.ts Demo data seeder
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Yes* | Claude API key (*voice agent uses mock mode without it) |
| `TWILIO_ACCOUNT_SID` | Yes | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Yes | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Yes | Twilio phone number for outbound SMS |
| `ENCRYPTION_KEY` | Yes | 32-byte hex key for token encryption |
| `VOICE_SERVER_URL` | No | Voice server URL (default: `http://localhost:3001`) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth for calendar integration |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth secret |
| `STRIPE_SECRET_KEY` | No | Stripe billing |
| `NEXTAUTH_SECRET` | No | Session signing key |
| `ADMIN_EMAIL` | No | Admin login email |

## Running Tests

```bash
# Voice server tests (unit + scenario)
cd apps/voice && npm test

# Run a specific test file
cd apps/voice && npx vitest run tests/handler.test.ts

# Interactive demo CLI (no Twilio needed)
cd apps/voice && npm run demo
```

## Seeding Demo Data

```bash
# Creates a demo client ("Mike's Plumbing & Drain") with calls, leads,
# appointments, and revenue metrics for the past 30 days.
npm run seed

# The seed script uses DATABASE_URL from the environment.
# The dashboard is visible at: http://localhost:3000/dashboard/mikes-plumbing-demo/overview
```
