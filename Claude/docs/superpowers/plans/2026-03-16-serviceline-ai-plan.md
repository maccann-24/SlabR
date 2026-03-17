# ServiceLine AI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an AI-powered phone system + GEO/SEO automation platform for HVAC/plumbing companies, deployed on Railway.

**Architecture:** Monorepo with three services — a Fastify voice server (ConversationRelay + Claude), n8n for workflow automation, and a Next.js web app (admin panel + client dashboard). All backed by PostgreSQL on Railway. Twilio handles voice + SMS. Stripe handles billing.

**Tech Stack:** TypeScript, Fastify, @fastify/websocket, @anthropic-ai/sdk, Next.js 16 (App Router), PostgreSQL 16, Drizzle ORM, Twilio, Stripe, n8n, Railway

**Spec:** `docs/superpowers/specs/2026-03-16-serviceline-ai-design.md`

---

## Build Status (Updated 2026-03-17)

### Phase 1: Foundation — COMPLETE ✅

| Task | Status | What Was Built |
|---|---|---|
| Task 1: Project scaffolding | ✅ | Monorepo with `packages/db`, `apps/voice`, `apps/web` |
| Task 2: Database schema | ✅ | 12 tables with Drizzle ORM + 4 migrations |
| Task 3: Voice server skeleton | ✅ | Fastify + TwiML + health check + Twilio validation |
| Task 4: Call status handler | ✅ | Two-step TwiML (Pro → ConversationRelay, Starter → voicemail) |
| Task 5: WebSocket + Claude agent | ✅ | ConversationRelay handler + 3 tools + tool loop |

### Additional Features Built (beyond original plan)

| Feature | Status | Tests |
|---|---|---|
| Security hardening (13 steps, OWASP compliant) | ✅ | WebSocket HMAC auth, rate limiting, encryption, prompt sanitization |
| Anti-rambling (dispatcher tone, 35-word limit) | ✅ | 31 tests |
| Call briefing cards | ✅ | 28 tests |
| On-call routing with escalation | ✅ | 10 tests |
| Horror story defenses | ✅ | 24 tests |
| Positive outcome cross-checks | ✅ | 33 tests |
| Interrupt handling (ConversationRelay) | ✅ | 3 tests |
| **Total test count** | **172 tests across 12 files** | All passing |

### Research & Strategy Documents

| Document | Location |
|---|---|
| GTM Strategy | `docs/gtm-strategy.md` |
| Self-Serve Portal Evaluation | `docs/self-serve-evaluation.md` |
| Security Hardening (13 reports) | `.security-hardening/` |
| Infrastructure Security Design | `docs/superpowers/plans/2026-03-17-infrastructure-security-design.md` |
| Secrets Management | `docs/superpowers/plans/secrets-management.md` |
| Monitoring Design | `docs/superpowers/specs/security-monitoring-design.md` |
| Auth Architecture | `.security-hardening/08-auth-enhancement.md` |

### Remaining Phases

| Phase | Tasks | Status |
|---|---|---|
| Phase 2: Core Integrations | Tasks 6-7 + test call endpoint | **NEXT** |
| Phase 3: Lead Management + Drip | Tasks 8-12 + weekly brief SMS | Pending |
| Phase 4: Dashboard + Revenue Rescued | Tasks 13-16 | Pending |
| Phase 5: Review System | Task 17 | Pending |
| Phase 6: GEO/SEO Automation | Task 18 | Pending |
| Phase 7: Billing + Deployment | Tasks 19-21 | Pending |
| Phase 8: Self-Serve Portal | New — from blueprint | Month 4-5 |
| Phase 9: Land-and-Expand | New — from playbook | Month 6+ |

---

## File Structure

```
serviceline-ai/
├── package.json                          # Root workspace config
├── tsconfig.base.json                    # Shared TS config
├── .env.example                          # Required env vars template
├── .gitignore
├── drizzle.config.ts                     # Drizzle ORM config
│
├── packages/
│   └── db/
│       ├── package.json
│       ├── src/
│       │   ├── index.ts                  # DB client + connection
│       │   ├── schema.ts                 # All Drizzle table definitions
│       │   └── migrate.ts               # Migration runner
│       └── drizzle/
│           └── 0001_initial.sql          # Generated migration
│
├── apps/
│   ├── voice/
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   ├── src/
│   │   │   ├── index.ts                  # Fastify server entry point
│   │   │   ├── routes/
│   │   │   │   ├── twiml.ts             # GET /twiml/:twilioPhone — initial TwiML
│   │   │   │   ├── call-status.ts       # POST /call-status — dial action handler
│   │   │   │   ├── recording.ts         # POST /recording-complete — voicemail handler
│   │   │   │   └── health.ts            # GET /health
│   │   │   ├── ws/
│   │   │   │   ├── handler.ts           # WebSocket connection handler for ConversationRelay
│   │   │   │   ├── tools.ts             # Claude tool definitions + executors
│   │   │   │   └── prompts.ts           # System prompt builder
│   │   │   ├── services/
│   │   │   │   ├── calendar.ts          # Google Calendar check/book
│   │   │   │   ├── twilio-validate.ts   # Webhook signature validation middleware
│   │   │   │   └── notifications.ts     # SMS/call alerts to owner
│   │   │   └── lib/
│   │   │       └── client-config.ts     # Load client config from DB by Twilio phone
│   │   └── tests/
│   │       ├── twiml.test.ts
│   │       ├── call-status.test.ts
│   │       ├── ws-handler.test.ts
│   │       ├── tools.test.ts
│   │       └── calendar.test.ts
│   │
│   └── web/
│       ├── package.json
│       ├── Dockerfile
│       ├── next.config.js
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx                        # Landing page (Phase 7)
│       │   │   ├── admin/
│       │   │   │   ├── layout.tsx                  # Admin auth wrapper
│       │   │   │   ├── page.tsx                    # Aggregate dashboard
│       │   │   │   ├── clients/
│       │   │   │   │   ├── page.tsx                # Client list
│       │   │   │   │   ├── new/page.tsx            # Onboarding form
│       │   │   │   │   └── [id]/
│       │   │   │   │       ├── page.tsx            # Client detail + config
│       │   │   │   │       └── geo/page.tsx        # GEO audit results
│       │   │   │   └── leads/page.tsx              # Cross-client lead feed
│       │   │   ├── dashboard/
│       │   │   │   └── [slug]/
│       │   │   │       ├── page.tsx                # PIN entry
│       │   │   │       ├── overview/page.tsx       # Revenue Rescued
│       │   │   │       ├── calls/page.tsx          # Call history
│       │   │   │       ├── reviews/page.tsx        # Review velocity
│       │   │   │       └── geo/page.tsx            # GEO score (Pro)
│       │   │   └── api/
│       │   │       ├── auth/[...nextauth]/route.ts # NextAuth
│       │   │       ├── stripe/webhook/route.ts     # Stripe webhooks
│       │   │       ├── google/callback/route.ts    # OAuth callback
│       │   │       └── job-complete/route.ts       # Mark job done → triggers review
│       │   ├── lib/
│       │   │   ├── auth.ts                         # NextAuth config
│       │   │   ├── db.ts                           # Re-export from packages/db
│       │   │   └── stripe.ts                       # Stripe client + helpers
│       │   └── components/
│       │       ├── admin/
│       │       │   ├── ClientForm.tsx
│       │       │   ├── ClientList.tsx
│       │       │   ├── LeadFeed.tsx
│       │       │   └── AggregateDashboard.tsx
│       │       └── dashboard/
│       │           ├── PinLogin.tsx
│       │           ├── RevenueRescued.tsx
│       │           ├── CallHistory.tsx
│       │           ├── ReviewVelocity.tsx
│       │           └── GeoScore.tsx
│       └── tests/
│           ├── api/
│           │   └── stripe-webhook.test.ts
│           └── components/
│               └── RevenueRescued.test.ts
│
├── n8n/
│   ├── docker-compose.yml                # n8n + Postgres for local dev
│   └── workflows/
│       ├── missed-call-textback.json
│       ├── sms-auto-reply.json
│       ├── follow-up-drip.json
│       ├── review-request.json
│       ├── review-monitor.json
│       ├── geo-report.json
│       └── revenue-rollup.json
│
└── infra/
    ├── railway.toml                      # Railway service config
    └── twilio-fallback-function.js       # Twilio Function for voicemail fallback
```

---

## Phase 1: Foundation

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `.gitignore`, `.env.example`
- Create: `packages/db/package.json`, `packages/db/tsconfig.json`
- Create: `apps/voice/package.json`, `apps/voice/tsconfig.json`
- Create: `apps/web/package.json`

- [ ] **Step 1: Initialize root workspace**

```bash
cd /Users/clawdbot/Claude
npm init -y
```

Update `package.json`:
```json
{
  "name": "serviceline-ai",
  "private": true,
  "workspaces": ["packages/*", "apps/*"]
}
```

- [ ] **Step 2: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist"
  }
}
```

- [ ] **Step 3: Create .env.example**

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/serviceline

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Anthropic
ANTHROPIC_API_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App
VOICE_SERVER_URL=http://localhost:3001
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=

# Encryption
ENCRYPTION_KEY=  # 32-byte hex for AES-256 token encryption
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.env
.next/
*.tsbuildinfo
```

- [ ] **Step 5: Create packages/db**

```bash
mkdir -p packages/db/src packages/db/drizzle
```

`packages/db/package.json`:
```json
{
  "name": "@serviceline/db",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "generate": "drizzle-kit generate",
    "migrate": "tsx src/migrate.ts",
    "studio": "drizzle-kit studio"
  },
  "dependencies": {
    "drizzle-orm": "^0.38.0",
    "pg": "^8.13.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.0",
    "@types/pg": "^8.11.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 6: Create apps/voice**

```bash
mkdir -p apps/voice/src/{routes,ws,services,lib} apps/voice/tests
```

`apps/voice/package.json`:
```json
{
  "name": "@serviceline/voice",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "fastify": "^5.2.0",
    "@fastify/websocket": "^11.0.0",
    "@anthropic-ai/sdk": "^0.39.0",
    "twilio": "^5.5.0",
    "@serviceline/db": "*"
  },
  "devDependencies": {
    "vitest": "^3.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 7: Create apps/web**

```bash
cd /Users/clawdbot/Claude/apps/web
npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-import-alias --use-npm
```

Add workspace dependency in `apps/web/package.json`:
```json
"dependencies": {
  "@serviceline/db": "*"
}
```

- [ ] **Step 8: Install all dependencies**

```bash
cd /Users/clawdbot/Claude
npm install
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: project scaffolding — monorepo with voice, web, and db packages"
```

---

### Task 2: Database Schema

**Files:**
- Create: `packages/db/src/schema.ts`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/src/migrate.ts`
- Create: `drizzle.config.ts`

- [ ] **Step 1: Write schema.ts with all tables from spec**

`packages/db/src/schema.ts`:
```typescript
import {
  pgTable, uuid, text, numeric, boolean, integer,
  timestamp, date, jsonb, uniqueIndex, index
} from 'drizzle-orm/pg-core';

export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  ownerName: text('owner_name').notNull(),
  ownerPhone: text('owner_phone').notNull(),
  ownerEmail: text('owner_email'),
  twilioPhone: text('twilio_phone').unique().notNull(),
  forwardPhone: text('forward_phone').notNull(),
  businessHours: jsonb('business_hours').notNull(),
  services: text('services').array().notNull(),
  serviceArea: text('service_area').notNull(),
  avgTicketValue: numeric('avg_ticket_value').default('350'),
  googlePlaceId: text('google_place_id'),
  googleReviewLink: text('google_review_link'),
  googleCalendarId: text('google_calendar_id'),
  recordingConsentRequired: boolean('recording_consent_required').default(true),
  aiSystemPrompt: text('ai_system_prompt'),
  plan: text('plan').notNull(), // 'starter' | 'pro'
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  dashboardPin: text('dashboard_pin').notNull(), // bcrypt hash
  status: text('status').notNull().default('active'), // pilot|active|paused|churned
  pilotEndsAt: timestamp('pilot_ends_at', { withTimezone: true }),
  guaranteeActive: boolean('guarantee_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  contactName: text('contact_name'),
  contactPhone: text('contact_phone').notNull(),
  contactAddress: text('contact_address'),
  issueDescription: text('issue_description'),
  issueCategory: text('issue_category'),
  urgency: integer('urgency'),
  source: text('source').notNull(), // voice|sms|missed_call
  status: text('status').notNull().default('new'),
  dripStep: integer('drip_step').default(0),
  dripNextAt: timestamp('drip_next_at', { withTimezone: true }),
  revenueRescued: numeric('revenue_rescued'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_leads_drip').on(table.clientId, table.status, table.dripNextAt),
  index('idx_leads_client_created').on(table.clientId, table.createdAt),
]);

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  leadId: uuid('lead_id').references(() => leads.id),
  contactPhone: text('contact_phone').notNull(),
  direction: text('direction').notNull(), // inbound|outbound
  channel: text('channel').notNull(), // sms|voice
  body: text('body').notNull(),
  twilioSid: text('twilio_sid'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_conversations_lookup').on(table.clientId, table.contactPhone, table.createdAt),
]);

export const calls = pgTable('calls', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  leadId: uuid('lead_id').references(() => leads.id),
  callerPhone: text('caller_phone').notNull(),
  twilioCallSid: text('twilio_call_sid').unique().notNull(),
  status: text('status').notNull(), // answered_human|answered_ai|missed|voicemail
  durationSeconds: integer('duration_seconds'),
  aiSummary: text('ai_summary'),
  recordingUrl: text('recording_url'),
  emergencyEscalated: boolean('emergency_escalated').default(false),
  appointmentBooked: boolean('appointment_booked').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_calls_client_created').on(table.clientId, table.createdAt),
]);

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  leadId: uuid('lead_id').references(() => leads.id),
  contactName: text('contact_name').notNull(),
  contactPhone: text('contact_phone').notNull(),
  contactAddress: text('contact_address'),
  issueDescription: text('issue_description'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  googleEventId: text('google_event_id'),
  status: text('status').notNull().default('scheduled'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_appointments_client_scheduled').on(table.clientId, table.scheduledAt),
]);

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  leadId: uuid('lead_id').references(() => leads.id),
  contactPhone: text('contact_phone').notNull(),
  requestSentAt: timestamp('request_sent_at', { withTimezone: true }),
  reviewReceived: boolean('review_received').default(false),
  reviewRating: integer('review_rating'),
  reviewReplied: boolean('review_replied').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_reviews_client_created').on(table.clientId, table.createdAt),
]);

export const geoAudits = pgTable('geo_audits', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  auditType: text('audit_type').notNull(), // gbp|schema|ai_visibility|full
  score: numeric('score'),
  findings: jsonb('findings'),
  recommendations: jsonb('recommendations'),
  reportUrl: text('report_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const revenueMetrics = pgTable('revenue_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  date: date('date').notNull(),
  callsRescued: integer('calls_rescued').default(0),
  leadsCreated: integer('leads_created').default(0),
  appointmentsBooked: integer('appointments_booked').default(0),
  reviewsRequested: integer('reviews_requested').default(0),
  reviewsReceived: integer('reviews_received').default(0),
  estimatedRevenueRescued: numeric('estimated_revenue_rescued').default('0'),
}, (table) => [
  uniqueIndex('idx_revenue_metrics_unique').on(table.clientId, table.date),
  index('idx_revenue_metrics_client_date').on(table.clientId, table.date),
]);

export const googleOauthTokens = pgTable('google_oauth_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => clients.id).unique(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  tokenType: text('token_type').default('Bearer'),
  scope: text('scope').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

- [ ] **Step 2: Write db client (index.ts)**

`packages/db/src/index.ts`:
```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
export * from './schema.js';
export type DB = typeof db;
```

- [ ] **Step 3: Write migrate.ts**

`packages/db/src/migrate.ts`:
```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  await client.connect();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: './drizzle' });
  await client.end();
  console.log('Migrations complete');
}

main().catch(console.error);
```

- [ ] **Step 4: Write drizzle.config.ts**

`drizzle.config.ts` (root):
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './packages/db/src/schema.ts',
  out: './packages/db/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 5: Generate initial migration**

```bash
cd /Users/clawdbot/Claude
npx drizzle-kit generate
```

Verify a migration SQL file was created in `packages/db/drizzle/`.

- [ ] **Step 6: Commit**

```bash
git add packages/db drizzle.config.ts
git commit -m "feat: database schema — all 9 tables with indexes and Drizzle ORM"
```

---

### Task 3: Voice Server Skeleton

**Files:**
- Create: `apps/voice/src/index.ts`
- Create: `apps/voice/src/routes/health.ts`
- Create: `apps/voice/src/routes/twiml.ts`
- Create: `apps/voice/src/lib/client-config.ts`
- Create: `apps/voice/src/services/twilio-validate.ts`
- Test: `apps/voice/tests/twiml.test.ts`

- [ ] **Step 1: Write failing test for TwiML endpoint**

`apps/voice/tests/twiml.test.ts`:
```typescript
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { twimlRoutes } from '../src/routes/twiml.js';

describe('GET /twiml/:twilioPhone', () => {
  const app = Fastify();

  beforeAll(async () => {
    app.register(twimlRoutes);
    await app.ready();
  });

  afterAll(() => app.close());

  it('returns TwiML with Dial and action URL', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/twiml/+15551234567',
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/xml');
    expect(res.body).toContain('<Dial');
    expect(res.body).toContain('action=');
    expect(res.body).toContain('timeout="20"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/clawdbot/Claude/apps/voice
npx vitest run tests/twiml.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write client-config.ts**

`apps/voice/src/lib/client-config.ts`:
```typescript
import { db, clients } from '@serviceline/db';
import { eq } from 'drizzle-orm';

export type ClientConfig = typeof clients.$inferSelect;

export async function getClientByTwilioPhone(phone: string): Promise<ClientConfig | null> {
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.twilioPhone, phone))
    .limit(1);
  return client ?? null;
}
```

- [ ] **Step 4: Write twiml.ts route**

`apps/voice/src/routes/twiml.ts`:
```typescript
import { FastifyPluginAsync } from 'fastify';
import { getClientByTwilioPhone } from '../lib/client-config.js';

export const twimlRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { twilioPhone: string } }>('/twiml/:twilioPhone', async (req, reply) => {
    const client = await getClientByTwilioPhone(req.params.twilioPhone);
    if (!client) {
      reply.status(404).send('Unknown phone number');
      return;
    }

    const voiceServerUrl = process.env.VOICE_SERVER_URL || 'http://localhost:3001';

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial action="${voiceServerUrl}/call-status" timeout="20">
    <Number>${client.forwardPhone}</Number>
  </Dial>
  <Say>We're sorry, please try again later.</Say>
</Response>`;

    reply.type('text/xml').send(twiml);
  });
};
```

- [ ] **Step 5: Write health route and server entry point**

`apps/voice/src/routes/health.ts`:
```typescript
import { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({ status: 'ok', service: 'voice-server' }));
};
```

`apps/voice/src/index.ts`:
```typescript
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { healthRoutes } from './routes/health.js';
import { twimlRoutes } from './routes/twiml.js';

const app = Fastify({ logger: true });

app.register(websocket);
app.register(healthRoutes);
app.register(twimlRoutes);

const port = parseInt(process.env.PORT || '3001');
app.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});

export { app };
```

- [ ] **Step 6: Write Twilio webhook validation middleware**

`apps/voice/src/services/twilio-validate.ts`:
```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import twilio from 'twilio';

export async function validateTwilioWebhook(req: FastifyRequest, reply: FastifyReply) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    reply.status(500).send('Twilio auth token not configured');
    return;
  }

  const signature = req.headers['x-twilio-signature'] as string;
  if (!signature) {
    reply.status(403).send('Missing Twilio signature');
    return;
  }

  const url = `${process.env.VOICE_SERVER_URL}${req.url}`;
  const params = (req.body as Record<string, string>) || {};

  const isValid = twilio.validateRequest(authToken, signature, url, params);
  if (!isValid) {
    reply.status(403).send('Invalid Twilio signature');
    return;
  }
}
```

- [ ] **Step 7: Update test to mock DB, run tests**

Update `apps/voice/tests/twiml.test.ts` to mock the DB call:
```typescript
// Add at top of file:
vi.mock('../src/lib/client-config.js', () => ({
  getClientByTwilioPhone: vi.fn().mockResolvedValue({
    id: 'test-uuid',
    name: "Mike's Plumbing",
    forwardPhone: '+15559876543',
    plan: 'pro',
    status: 'active',
  }),
}));
```

Run:
```bash
npx vitest run tests/twiml.test.ts
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/voice
git commit -m "feat: voice server skeleton — TwiML endpoint, health check, Twilio validation"
```

---

### Task 4: Call Status Handler (Two-Step TwiML)

**Files:**
- Create: `apps/voice/src/routes/call-status.ts`
- Create: `apps/voice/src/routes/recording.ts`
- Test: `apps/voice/tests/call-status.test.ts`

- [ ] **Step 1: Write failing tests for call-status**

`apps/voice/tests/call-status.test.ts`:
```typescript
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { callStatusRoutes } from '../src/routes/call-status.js';

vi.mock('../src/lib/client-config.js', () => ({
  getClientByTwilioPhone: vi.fn().mockResolvedValue({
    id: 'test-uuid',
    name: "Mike's Plumbing",
    plan: 'pro',
    status: 'active',
    recordingConsentRequired: true,
  }),
}));

describe('POST /call-status', () => {
  const app = Fastify();

  beforeAll(async () => {
    app.register(callStatusRoutes);
    await app.ready();
  });

  afterAll(() => app.close());

  it('returns ConversationRelay TwiML for Pro no-answer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/call-status',
      payload: {
        DialCallStatus: 'no-answer',
        To: '+15551234567',
        From: '+15559999999',
        CallSid: 'CA123',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<ConversationRelay');
    expect(res.body).toContain('welcomeGreeting');
  });

  it('returns Hangup for completed calls', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/call-status',
      payload: {
        DialCallStatus: 'completed',
        To: '+15551234567',
        From: '+15559999999',
        CallSid: 'CA456',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('<Hangup');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/call-status.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement call-status.ts**

`apps/voice/src/routes/call-status.ts`:
```typescript
import { FastifyPluginAsync } from 'fastify';
import { getClientByTwilioPhone } from '../lib/client-config.js';

interface CallStatusBody {
  DialCallStatus: string;
  To: string;
  From: string;
  CallSid: string;
}

export const callStatusRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: CallStatusBody }>('/call-status', async (req, reply) => {
    const { DialCallStatus, To, From, CallSid } = req.body;
    const client = await getClientByTwilioPhone(To);

    if (!client) {
      reply.type('text/xml').send('<Response><Hangup/></Response>');
      return;
    }

    // Call was answered by the human — nothing to do
    if (DialCallStatus === 'completed') {
      reply.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
      return;
    }

    // No answer — route based on plan
    if (['no-answer', 'busy', 'failed'].includes(DialCallStatus)) {
      if (client.plan === 'pro' && ['active', 'pilot'].includes(client.status)) {
        // Pro: hand to AI voice agent
        const voiceServerUrl = process.env.VOICE_SERVER_URL || 'wss://localhost:3001';
        const wsUrl = voiceServerUrl.replace(/^http/, 'ws') + '/ws';
        const consentPrefix = client.recordingConsentRequired
          ? 'This call may be recorded for quality purposes. '
          : '';
        const greeting = `${consentPrefix}Hi, thanks for calling ${client.name}! Sorry we couldn't get to the phone — I'm an assistant that can help you right away. What's going on?`;

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay
      url="${wsUrl}"
      welcomeGreeting="${greeting.replace(/"/g, '&quot;')}"
      voice="en-US-Journey-F"
      ttsProvider="google"
      transcriptionProvider="deepgram"
      speechModel="nova-2-general"
    />
  </Connect>
</Response>`;
        reply.type('text/xml').send(twiml);
      } else {
        // Starter: voicemail + trigger text-back
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry we missed your call at ${client.name}. Please leave a message after the beep.</Say>
  <Record maxLength="120" action="/recording-complete" />
</Response>`;

        // Fire text-back webhook to n8n asynchronously
        const n8nUrl = process.env.N8N_TEXTBACK_WEBHOOK_URL;
        if (n8nUrl) {
          fetch(n8nUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ twilioPhone: To, callerPhone: From, callSid: CallSid, clientId: client.id }),
          }).catch((err) => app.log.error({ err }, 'Failed to trigger text-back webhook'));
        }

        reply.type('text/xml').send(twiml);
      }
      return;
    }

    // Default fallback
    reply.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
  });
};
```

- [ ] **Step 4: Implement recording.ts**

`apps/voice/src/routes/recording.ts`:
```typescript
import { FastifyPluginAsync } from 'fastify';

export const recordingRoutes: FastifyPluginAsync = async (app) => {
  app.post('/recording-complete', async (req, reply) => {
    // Twilio sends RecordingUrl, RecordingSid, RecordingDuration
    // Log for now, full implementation in Phase 2
    app.log.info({ body: req.body }, 'Recording received');
    reply.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
  });
};
```

- [ ] **Step 5: Register new routes in index.ts**

Add to `apps/voice/src/index.ts`:
```typescript
import { callStatusRoutes } from './routes/call-status.js';
import { recordingRoutes } from './routes/recording.js';

app.register(callStatusRoutes);
app.register(recordingRoutes);
```

- [ ] **Step 6: Run tests**

```bash
npx vitest run
```

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add apps/voice
git commit -m "feat: call-status handler — two-step TwiML with Pro/Starter routing"
```

---

### Task 5: WebSocket Handler for ConversationRelay

**Files:**
- Create: `apps/voice/src/ws/handler.ts`
- Create: `apps/voice/src/ws/prompts.ts`
- Create: `apps/voice/src/ws/tools.ts`
- Test: `apps/voice/tests/ws-handler.test.ts`
- Test: `apps/voice/tests/tools.test.ts`

- [ ] **Step 1: Write failing test for prompt builder**

`apps/voice/tests/tools.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../src/ws/prompts.js';
import { voiceTools } from '../src/ws/tools.js';

describe('buildSystemPrompt', () => {
  it('includes business name and services', () => {
    const prompt = buildSystemPrompt({
      name: "Mike's Plumbing",
      services: ['plumbing', 'water_heater', 'drain'],
      serviceArea: 'Austin, TX',
    });
    expect(prompt).toContain("Mike's Plumbing");
    expect(prompt).toContain('plumbing');
    expect(prompt).toContain('Austin, TX');
  });

  it('includes guardrails', () => {
    const prompt = buildSystemPrompt({
      name: 'Test Co',
      services: ['hvac'],
      serviceArea: 'Denver, CO',
    });
    expect(prompt).toContain('never quote exact prices');
    expect(prompt).toContain('emergency');
  });
});

describe('voiceTools', () => {
  it('defines 3 tools', () => {
    expect(voiceTools).toHaveLength(3);
    expect(voiceTools.map(t => t.name)).toEqual([
      'check_availability',
      'book_appointment',
      'escalate_emergency',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/tools.test.ts
```

- [ ] **Step 3: Implement prompts.ts**

`apps/voice/src/ws/prompts.ts`:
```typescript
interface PromptContext {
  name: string;
  services: string[];
  serviceArea: string;
  customPrompt?: string | null;
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const serviceList = ctx.services.join(', ');

  return `You are an AI phone assistant for ${ctx.name}, a ${serviceList} company serving ${ctx.serviceArea}.

Your job is to help callers who couldn't reach the business directly. Be friendly, professional, and efficient.

RULES:
- Always collect: caller's name, phone number (you already have it from caller ID), address, and description of the issue
- You must never quote exact prices. Say "typically ranges from..." or "the technician will provide an exact quote on-site"
- You must never diagnose problems. Say "that sounds like it could be X, but our tech will confirm when they arrive"
- For emergencies (burst pipe, gas smell, flooding, sewage backup, no heat in winter), use the escalate_emergency tool IMMEDIATELY
- Keep responses concise — this is a phone call, not a chat. 1-2 sentences per turn.
- When you have enough info, offer to book an appointment using check_availability and book_appointment tools

${ctx.customPrompt ? `ADDITIONAL INSTRUCTIONS:\n${ctx.customPrompt}` : ''}`;
}
```

- [ ] **Step 4: Implement tools.ts**

`apps/voice/src/ws/tools.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk';

export const voiceTools: Anthropic.Tool[] = [
  {
    name: 'check_availability',
    description: 'Check available appointment slots on the business calendar for a given date',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: { type: 'string', description: 'Date to check (YYYY-MM-DD)' },
        time_preference: { type: 'string', enum: ['morning', 'afternoon', 'any'], description: 'Preferred time of day' },
      },
      required: ['date'],
    },
  },
  {
    name: 'book_appointment',
    description: 'Book a service appointment for the caller',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Caller name' },
        phone: { type: 'string', description: 'Caller phone number' },
        address: { type: 'string', description: 'Service address' },
        issue: { type: 'string', description: 'Description of the issue' },
        datetime: { type: 'string', description: 'Appointment datetime in ISO 8601 format' },
      },
      required: ['name', 'phone', 'address', 'issue', 'datetime'],
    },
  },
  {
    name: 'escalate_emergency',
    description: 'Immediately alert the business owner about an emergency situation (burst pipe, gas leak, flooding, etc.)',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Caller name if known' },
        phone: { type: 'string', description: 'Caller phone number' },
        address: { type: 'string', description: 'Address of emergency if known' },
        issue: { type: 'string', description: 'Description of the emergency' },
      },
      required: ['phone', 'issue'],
    },
  },
];
```

- [ ] **Step 5: Run tool tests**

```bash
npx vitest run tests/tools.test.ts
```

Expected: PASS

- [ ] **Step 6: Implement WebSocket handler**

`apps/voice/src/ws/handler.ts`:
```typescript
import { WebSocket } from 'ws';
import Anthropic from '@anthropic-ai/sdk';
import { getClientByTwilioPhone, ClientConfig } from '../lib/client-config.js';
import { buildSystemPrompt } from './prompts.js';
import { voiceTools } from './tools.js';
import { db, calls, leads, conversations } from '@serviceline/db';

const anthropic = new Anthropic();

interface ConversationRelaySetup {
  type: 'setup';
  callSid: string;
  from: string;
  to: string;
}

interface ConversationRelayPrompt {
  type: 'prompt';
  voicePrompt: string;
}

type ConversationRelayMessage = ConversationRelaySetup | ConversationRelayPrompt | { type: string };

export async function handleWebSocket(ws: WebSocket) {
  let client: ClientConfig | null = null;
  let callSid = '';
  let callerPhone = '';
  let messageHistory: Anthropic.MessageParam[] = [];
  let systemPrompt = '';

  ws.on('message', async (data) => {
    const msg: ConversationRelayMessage = JSON.parse(data.toString());

    if (msg.type === 'setup') {
      const setup = msg as ConversationRelaySetup;
      callSid = setup.callSid;
      callerPhone = setup.from;
      client = await getClientByTwilioPhone(setup.to);

      if (!client) {
        ws.send(JSON.stringify({
          type: 'text',
          token: "I'm sorry, there's a system error. Please try calling back.",
          last: true,
        }));
        return;
      }

      systemPrompt = buildSystemPrompt({
        name: client.name,
        services: client.services as string[],
        serviceArea: client.serviceArea,
        customPrompt: client.aiSystemPrompt,
      });
      return;
    }

    if (msg.type === 'prompt') {
      const prompt = msg as ConversationRelayPrompt;
      messageHistory.push({ role: 'user', content: prompt.voicePrompt });

      try {
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: systemPrompt,
          tools: voiceTools,
          messages: messageHistory,
        });

        // Handle tool use
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const toolResult = await executeTool(block.name, block.input as Record<string, string>, client!);
            messageHistory.push({ role: 'assistant', content: response.content });
            messageHistory.push({
              role: 'user',
              content: [{ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(toolResult) }],
            });

            // Get follow-up response after tool use
            const followUp = await anthropic.messages.create({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 300,
              system: systemPrompt,
              tools: voiceTools,
              messages: messageHistory,
            });

            const text = followUp.content
              .filter((b): b is Anthropic.TextBlock => b.type === 'text')
              .map(b => b.text)
              .join('');

            messageHistory.push({ role: 'assistant', content: followUp.content });
            ws.send(JSON.stringify({ type: 'text', token: text, last: true }));
            return;
          }
        }

        // Regular text response
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('');

        messageHistory.push({ role: 'assistant', content: response.content });
        ws.send(JSON.stringify({ type: 'text', token: text, last: true }));
      } catch (err) {
        console.error('Claude API error:', err);
        ws.send(JSON.stringify({
          type: 'text',
          token: "I'm having trouble understanding. Could you repeat that?",
          last: true,
        }));
      }
    }
  });

  ws.on('close', async () => {
    if (!client || !callSid) return;

    // Save call record
    try {
      const summary = messageHistory.length > 2
        ? await generateCallSummary(messageHistory)
        : null;

      await db.insert(calls).values({
        clientId: client.id,
        callerPhone,
        twilioCallSid: callSid,
        status: 'answered_ai',
        aiSummary: summary,
      });
    } catch (err) {
      console.error('Failed to save call record:', err);
    }
  });
}

async function executeTool(
  name: string,
  input: Record<string, string>,
  client: ClientConfig,
): Promise<Record<string, unknown>> {
  switch (name) {
    case 'check_availability':
      // Phase 2: integrate with Google Calendar
      return { available_slots: ['9:00 AM', '11:00 AM', '2:00 PM'], date: input.date };

    case 'book_appointment':
      // Phase 2: create Google Calendar event + DB record
      return { success: true, datetime: input.datetime, message: 'Appointment booked' };

    case 'escalate_emergency':
      // Send immediate SMS to owner
      const twilio = (await import('twilio')).default;
      const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await twilioClient.messages.create({
        to: client.ownerPhone,
        from: client.twilioPhone,
        body: `🚨 EMERGENCY: ${input.issue}\nCaller: ${input.phone}${input.address ? `\nAddress: ${input.address}` : ''}`,
      });
      return { success: true, message: 'Owner has been notified immediately' };

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function generateCallSummary(history: Anthropic.MessageParam[]): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: 'Summarize this phone call in 2-3 sentences. Include: what the caller needed, any appointment booked, and any follow-up required.',
    messages: [{ role: 'user', content: JSON.stringify(history) }],
  });
  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  return text?.text || 'Call summary unavailable';
}
```

- [ ] **Step 7: Register WebSocket in server**

Update `apps/voice/src/index.ts` — add after the route registrations:
```typescript
import { handleWebSocket } from './ws/handler.js';

app.register(async (app) => {
  app.get('/ws', { websocket: true }, (socket) => {
    handleWebSocket(socket);
  });
});
```

- [ ] **Step 8: Run all tests**

```bash
npx vitest run
```

Expected: All PASS

- [ ] **Step 9: Commit**

```bash
git add apps/voice
git commit -m "feat: ConversationRelay WebSocket handler — Claude voice agent with tool calling"
```

---

## Phase 2: Core Integrations

### Task 6: Google Calendar Service

**Files:**
- Create: `apps/voice/src/services/calendar.ts`
- Test: `apps/voice/tests/calendar.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { checkAvailability, bookAppointment } from '../src/services/calendar.js';

// Mock googleapis
vi.mock('googleapis', () => ({
  google: {
    calendar: vi.fn().mockReturnValue({
      freebusy: {
        query: vi.fn().mockResolvedValue({
          data: { calendars: { 'cal-id': { busy: [{ start: '2026-03-17T09:00:00Z', end: '2026-03-17T10:00:00Z' }] } } },
        }),
      },
      events: {
        insert: vi.fn().mockResolvedValue({ data: { id: 'event-123' } }),
      },
    }),
    auth: { OAuth2: vi.fn().mockImplementation(() => ({ setCredentials: vi.fn() })) },
  },
}));

describe('checkAvailability', () => {
  it('returns available slots excluding busy times', async () => {
    const slots = await checkAvailability('cal-id', '2026-03-17', 'any', {
      accessToken: 'tok', refreshToken: 'ref', expiresAt: new Date(Date.now() + 3600000),
    });
    expect(Array.isArray(slots)).toBe(true);
    expect(slots.length).toBeGreaterThan(0);
  });
});

describe('bookAppointment', () => {
  it('creates a calendar event and returns event ID', async () => {
    const result = await bookAppointment('cal-id', {
      name: 'John',
      phone: '+15551234567',
      address: '123 Main St',
      issue: 'Leaky faucet',
      datetime: '2026-03-17T14:00:00Z',
    }, { accessToken: 'tok', refreshToken: 'ref', expiresAt: new Date(Date.now() + 3600000) });
    expect(result.eventId).toBe('event-123');
  });
});
```

- [ ] **Step 2: Run to verify fail, then implement calendar.ts**

`apps/voice/src/services/calendar.ts`:
```typescript
import { google } from 'googleapis';

interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

interface BookingInput {
  name: string;
  phone: string;
  address: string;
  issue: string;
  datetime: string;
}

function getAuthClient(tokens: OAuthTokens) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  auth.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiresAt.getTime(),
  });
  return auth;
}

export async function checkAvailability(
  calendarId: string,
  date: string,
  preference: string,
  tokens: OAuthTokens,
): Promise<string[]> {
  const auth = getAuthClient(tokens);
  const calendar = google.calendar({ version: 'v3', auth });

  const startOfDay = new Date(`${date}T08:00:00`);
  const endOfDay = new Date(`${date}T18:00:00`);

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      items: [{ id: calendarId }],
    },
  });

  const busy = res.data.calendars?.[calendarId]?.busy || [];
  const slots: string[] = [];

  // Generate hourly slots, skip busy ones
  for (let hour = 8; hour < 18; hour++) {
    if (preference === 'morning' && hour >= 12) continue;
    if (preference === 'afternoon' && hour < 12) continue;

    const slotStart = new Date(`${date}T${hour.toString().padStart(2, '0')}:00:00`);
    const slotEnd = new Date(slotStart.getTime() + 3600000);

    const isBusy = busy.some((b) => {
      const busyStart = new Date(b.start!);
      const busyEnd = new Date(b.end!);
      return slotStart < busyEnd && slotEnd > busyStart;
    });

    if (!isBusy) {
      slots.push(slotStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    }
  }

  return slots;
}

export async function bookAppointment(
  calendarId: string,
  input: BookingInput,
  tokens: OAuthTokens,
): Promise<{ eventId: string }> {
  const auth = getAuthClient(tokens);
  const calendar = google.calendar({ version: 'v3', auth });

  const start = new Date(input.datetime);
  const end = new Date(start.getTime() + 3600000); // 1 hour default

  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `Service Call: ${input.issue}`,
      description: `Customer: ${input.name}\nPhone: ${input.phone}\nAddress: ${input.address}\nIssue: ${input.issue}`,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    },
  });

  return { eventId: res.data.id! };
}
```

- [ ] **Step 3: Run tests, verify pass**

```bash
npx vitest run tests/calendar.test.ts
```

- [ ] **Step 4: Wire calendar into WebSocket tool executor**

Update `executeTool` in `apps/voice/src/ws/handler.ts` to call the real `checkAvailability` and `bookAppointment` functions instead of returning stubs. Also look up Google OAuth tokens from the `googleOauthTokens` table for the client.

- [ ] **Step 5: Commit**

```bash
git add apps/voice
git commit -m "feat: Google Calendar integration — availability check and appointment booking"
```

---

### Task 7: Notification Service

**Files:**
- Create: `apps/voice/src/services/notifications.ts`

- [ ] **Step 1: Implement notifications.ts**

```typescript
import twilio from 'twilio';

const getTwilioClient = () =>
  twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

export async function smsToOwner(ownerPhone: string, fromPhone: string, message: string) {
  const client = getTwilioClient();
  await client.messages.create({ to: ownerPhone, from: fromPhone, body: message });
}

export async function smsToCustomer(customerPhone: string, fromPhone: string, message: string) {
  const client = getTwilioClient();
  await client.messages.create({ to: customerPhone, from: fromPhone, body: message });
}

export async function callSummaryNotification(
  ownerPhone: string,
  fromPhone: string,
  summary: string,
  callerPhone: string,
) {
  const message = `📞 Missed call handled by AI\nCaller: ${callerPhone}\n\n${summary}`;
  await smsToOwner(ownerPhone, fromPhone, message);
}
```

- [ ] **Step 2: Wire into WebSocket close handler to send call summary to owner**

- [ ] **Step 3: Commit**

```bash
git add apps/voice
git commit -m "feat: notification service — SMS alerts to owner on call events"
```

---

## Phase 3: n8n Workflows

### Task 8: n8n Docker Setup for Local Dev

**Files:**
- Create: `n8n/docker-compose.yml`

- [ ] **Step 1: Write docker-compose.yml**

```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=n8n
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=changeme
      - WEBHOOK_URL=http://localhost:5678/
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres

  postgres:
    image: postgres:16
    environment:
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=n8n
      - POSTGRES_DB=n8n
    volumes:
      - pg_data:/var/lib/postgresql/data

volumes:
  n8n_data:
  pg_data:
```

- [ ] **Step 2: Start n8n locally**

```bash
cd /Users/clawdbot/Claude/n8n
docker compose up -d
```

Verify n8n is accessible at `http://localhost:5678`.

- [ ] **Step 3: Commit**

```bash
git add n8n/docker-compose.yml
git commit -m "feat: n8n local dev setup with PostgreSQL backend"
```

---

### Task 9: n8n Workflows — Missed-Call Text-Back (WF1)

**Files:**
- Create: `n8n/workflows/missed-call-textback.json`

- [ ] **Step 1: Build workflow in n8n UI**

Create a workflow with these nodes:
1. **Webhook** — POST `/missed-call-textback`, accepts `{ twilioPhone, callerPhone, callSid, clientId }`
2. **PostgreSQL** — query `clients` by `id = clientId`
3. **PostgreSQL** — INSERT into `leads` with `ON CONFLICT (client_id, contact_phone) WHERE status NOT IN ('completed','lost','opted_out') DO UPDATE SET updated_at = now()`
4. **Twilio Send SMS** — send text-back message to `callerPhone` from `twilioPhone`
5. **PostgreSQL** — INSERT into `conversations` (outbound SMS log)

- [ ] **Step 2: Test with curl**

```bash
curl -X POST http://localhost:5678/webhook/missed-call-textback \
  -H "Content-Type: application/json" \
  -d '{"twilioPhone":"+15551234567","callerPhone":"+15559999999","callSid":"CA123","clientId":"test-uuid"}'
```

- [ ] **Step 3: Export workflow JSON**

Download from n8n UI → Save to `n8n/workflows/missed-call-textback.json`

- [ ] **Step 4: Commit**

```bash
git add n8n/workflows/missed-call-textback.json
git commit -m "feat: n8n WF1 — missed-call text-back workflow"
```

---

### Task 10: n8n Workflows — SMS Auto-Reply (WF2)

**Files:**
- Create: `n8n/workflows/sms-auto-reply.json`

- [ ] **Step 1: Build workflow in n8n UI**

Nodes:
1. **Twilio Trigger** — On New SMS
2. **PostgreSQL** — lookup client by Twilio phone number
3. **IF** — check if body contains "STOP" (case-insensitive) → branch to opt-out handler
4. **IF** — check if body contains "HELP" → branch to help response
5. **PostgreSQL** — load last 10 conversations for this contact_phone + client_id
6. **PostgreSQL** — count AI replies in last 24h for this lead → if >= 15, branch to handoff
7. **HTTP Request** — POST to Claude Haiku API with system prompt + conversation history
8. **Twilio Send SMS** — send Claude's response
9. **PostgreSQL** — INSERT two rows into `conversations` (inbound + outbound)

Opt-out branch:
- PostgreSQL UPDATE leads SET status = 'opted_out'
- Twilio Send SMS: "You've been unsubscribed. Reply START to resume."

Help branch:
- Twilio Send SMS with business phone and STOP instructions

Handoff branch:
- Twilio Send SMS to customer: "Let me have [owner_name] reach out directly."
- Twilio Send SMS to owner with conversation summary

- [ ] **Step 2: Test with n8n's test webhook feature**

- [ ] **Step 3: Export and commit**

```bash
git add n8n/workflows/sms-auto-reply.json
git commit -m "feat: n8n WF2 — SMS auto-reply with Claude, STOP/HELP handling, conversation limits"
```

---

### Task 11: n8n Workflows — Follow-Up Drip (WF3)

**Files:**
- Create: `n8n/workflows/follow-up-drip.json`

- [ ] **Step 1: Build workflow**

Nodes:
1. **Cron** — every hour
2. **PostgreSQL** — SELECT leads + clients WHERE `status IN ('new','contacted') AND drip_next_at <= now() AND drip_step < 3`
3. **Loop** — for each lead:
   - **Switch** on `drip_step`:
     - 0 → Day 1 message template
     - 1 → Day 3 message template
     - 2 → Day 5 message template
   - **Twilio Send SMS** — send drip message
   - **PostgreSQL** — UPDATE lead: `drip_step += 1`, `drip_next_at = now() + 48h`, `status = 'in_drip'`
   - **IF** drip_step = 3 → UPDATE `status = 'lost'`
   - **PostgreSQL** — INSERT into `conversations`

- [ ] **Step 2: Test, export, commit**

```bash
git add n8n/workflows/follow-up-drip.json
git commit -m "feat: n8n WF3 — follow-up drip sequence (3-touch over 5 days)"
```

---

### Task 12: n8n Workflows — Review Request (WF4) + Revenue Rollup (WF7)

**Files:**
- Create: `n8n/workflows/review-request.json`
- Create: `n8n/workflows/revenue-rollup.json`

- [ ] **Step 1: Build WF4 — Review Request**

Nodes:
1. **Webhook** — POST `/job-complete` accepts `{ client_id, contact_phone }`
2. **PostgreSQL** — check if review request already exists for this lead → skip if so
3. **Wait** — 2 hours
4. **PostgreSQL** — lookup client's `google_review_link`
5. **Twilio Send SMS** — review request message
6. **PostgreSQL** — INSERT into `reviews`

- [ ] **Step 2: Build WF7 — Revenue Metrics Rollup**

Nodes:
1. **Cron** — daily at midnight
2. **PostgreSQL** — SELECT DISTINCT client_id FROM clients WHERE status IN ('active','pilot')
3. **Loop** — for each client:
   - **PostgreSQL** — COUNT calls WHERE status IN ('answered_ai','missed') AND created_at >= today
   - **PostgreSQL** — COUNT leads WHERE created_at >= today
   - **PostgreSQL** — COUNT appointments WHERE created_at >= today
   - **PostgreSQL** — COUNT reviews WHERE request_sent_at >= today
   - **PostgreSQL** — COUNT reviews WHERE review_received = true AND created_at >= today
   - **PostgreSQL** — UPSERT into `revenue_metrics` with calculated values

- [ ] **Step 3: Export both, commit**

```bash
git add n8n/workflows/review-request.json n8n/workflows/revenue-rollup.json
git commit -m "feat: n8n WF4 + WF7 — review request and revenue metrics rollup"
```

---

## Phase 4: Admin Panel + Client Dashboard

### Task 13: Next.js Admin Auth

**Files:**
- Create: `apps/web/src/lib/auth.ts`
- Create: `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- Create: `apps/web/src/app/admin/layout.tsx`

- [ ] **Step 1: Install NextAuth**

```bash
cd /Users/clawdbot/Claude/apps/web
npm install next-auth bcrypt
npm install -D @types/bcrypt
```

- [ ] **Step 2: Write auth config**

`apps/web/src/lib/auth.ts`:
```typescript
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Admin Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        if (credentials.email !== process.env.ADMIN_EMAIL) return null;

        const validPassword = await bcrypt.compare(
          credentials.password,
          process.env.ADMIN_PASSWORD_HASH!,
        );
        if (!validPassword) return null;

        return { id: '1', email: credentials.email, name: 'Admin' };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/admin/login' },
};
```

- [ ] **Step 3: Write route handler + admin layout with session check**

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "feat: admin auth — NextAuth with credentials provider"
```

---

### Task 14: Admin Client CRUD

**Files:**
- Create: `apps/web/src/app/admin/clients/page.tsx`
- Create: `apps/web/src/app/admin/clients/new/page.tsx`
- Create: `apps/web/src/app/admin/clients/[id]/page.tsx`
- Create: `apps/web/src/components/admin/ClientForm.tsx`
- Create: `apps/web/src/components/admin/ClientList.tsx`

- [ ] **Step 1: Build ClientList component**

Server component that queries all clients from DB, displays as a table with name, plan, status, Twilio #, and Revenue Rescued total.

- [ ] **Step 2: Build ClientForm component**

Form fields matching the `clients` table. On submit, generates a slug with random suffix, bcrypt-hashes the PIN, and inserts into DB. For Pro clients, shows "Connect Google Calendar" OAuth button.

- [ ] **Step 3: Build client detail page**

Shows client config (editable), lead feed for this client, and call log.

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "feat: admin panel — client CRUD with list, create, and detail views"
```

---

### Task 15: Admin Dashboard + Lead Feed

**Files:**
- Create: `apps/web/src/app/admin/page.tsx`
- Create: `apps/web/src/app/admin/leads/page.tsx`
- Create: `apps/web/src/components/admin/AggregateDashboard.tsx`
- Create: `apps/web/src/components/admin/LeadFeed.tsx`

- [ ] **Step 1: Build AggregateDashboard**

Server component showing:
- Total clients (active + pilot)
- Total MRR (sum of active client plans)
- Total Revenue Rescued this month (sum of all revenue_metrics)
- Calls today, leads today, appointments today

- [ ] **Step 2: Build LeadFeed**

Paginated table of all leads across all clients. Columns: client name, contact phone, issue, status, source, created_at. Filterable by client and status.

- [ ] **Step 3: Commit**

```bash
git add apps/web
git commit -m "feat: admin dashboard — aggregate metrics and cross-client lead feed"
```

---

### Task 16: Client Dashboard (PIN-Protected)

**Files:**
- Create: `apps/web/src/app/dashboard/[slug]/page.tsx`
- Create: `apps/web/src/app/dashboard/[slug]/overview/page.tsx`
- Create: `apps/web/src/components/dashboard/PinLogin.tsx`
- Create: `apps/web/src/components/dashboard/RevenueRescued.tsx`

- [ ] **Step 1: Build PinLogin component**

Client component with 4-6 digit PIN input. On submit, POST to `/api/dashboard/verify-pin` which:
- Looks up client by slug
- Compares bcrypt hash
- Rate limits: 5 attempts per 15 min per slug (use in-memory Map for now, Redis later)
- Sets an httpOnly cookie with a signed JWT containing the client_id

- [ ] **Step 2: Build RevenueRescued component**

The hero component. Shows:
- Big number: "$X,XXX Revenue Rescued This Month" in green
- Calls rescued count
- Appointments booked count
- Average response time
- 6-month trend line chart (use recharts or chart.js)

- [ ] **Step 3: Build overview page**

Combines RevenueRescued + CallHistory + ReviewVelocity components.

- [ ] **Step 4: Test PIN rate limiting**

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat: client dashboard — PIN login, Revenue Rescued visualization"
```

---

## Phase 5: Review System + GEO/SEO

### Task 17: Review Monitor Workflow (WF5)

**Files:**
- Create: `n8n/workflows/review-monitor.json`

- [ ] **Step 1: Build WF5 in n8n**

Uses Google Places API (New) to poll for reviews. Alerts owner on new reviews via SMS.

- [ ] **Step 2: Export and commit**

---

### Task 18: GEO/SEO Automation

**Files:**
- Create: `apps/web/src/app/admin/clients/[id]/geo/page.tsx`
- Create: `apps/web/src/components/dashboard/GeoScore.tsx`
- Create: `n8n/workflows/geo-report.json`

- [ ] **Step 1: Build schema markup generator**

A function that takes client config and generates JSON-LD for LocalBusiness, Service, FAQPage. Output as copy-paste snippet in the admin panel.

- [ ] **Step 2: Build GEO report generator workflow (WF6)**

Uses SerpAPI to check visibility, Claude to generate findings, Puppeteer for PDF.

- [ ] **Step 3: Build GeoScore dashboard component**

Shows composite score, search visibility results, and latest report link.

- [ ] **Step 4: Commit**

```bash
git add apps/web n8n/workflows/geo-report.json
git commit -m "feat: GEO/SEO automation — schema markup, visibility check, monthly report"
```

---

## Phase 6: Billing + Deployment

### Task 19: Stripe Integration

**Files:**
- Create: `apps/web/src/lib/stripe.ts`
- Create: `apps/web/src/app/api/stripe/webhook/route.ts`

- [ ] **Step 1: Install Stripe**

```bash
cd /Users/clawdbot/Claude/apps/web
npm install stripe
```

- [ ] **Step 2: Write Stripe webhook handler**

Handles `invoice.payment_failed` (pause client), `invoice.paid` (reactivate), `customer.subscription.deleted` (churn client).

- [ ] **Step 3: Write subscription creation helper**

Called during client onboarding — creates Stripe customer, subscription, and setup fee invoice.

- [ ] **Step 4: Write guarantee check**

At end of first paid month, check `revenue_metrics.estimated_revenue_rescued < 1000` → credit the invoice via Stripe API.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat: Stripe integration — subscriptions, webhooks, $1K guarantee auto-credit"
```

---

### Task 20: Google OAuth Flow

**Files:**
- Create: `apps/web/src/app/api/google/callback/route.ts`

- [ ] **Step 1: Implement OAuth initiation**

Admin panel "Connect Google Calendar" button redirects to Google OAuth consent screen with Calendar scope.

- [ ] **Step 2: Implement callback handler**

Exchanges code for tokens, encrypts with AES-256, stores in `google_oauth_tokens` table.

- [ ] **Step 3: Commit**

```bash
git add apps/web
git commit -m "feat: Google OAuth flow — calendar connection during client onboarding"
```

---

### Task 21: Dockerfiles + Railway Deployment

**Files:**
- Create: `apps/voice/Dockerfile`
- Create: `apps/web/Dockerfile`
- Create: `infra/railway.toml`
- Create: `infra/twilio-fallback-function.js`

- [ ] **Step 1: Write voice server Dockerfile**

```dockerfile
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
COPY packages/db ./packages/db
COPY apps/voice ./apps/voice
RUN npm ci --workspace=@serviceline/voice
WORKDIR /app/apps/voice
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Write web app Dockerfile**

Standard Next.js standalone Dockerfile.

- [ ] **Step 3: Write Railway config**

```toml
[service.voice]
builder = "dockerfile"
dockerfilePath = "apps/voice/Dockerfile"
healthcheckPath = "/health"

[service.web]
builder = "dockerfile"
dockerfilePath = "apps/web/Dockerfile"
healthcheckPath = "/api/health"
```

- [ ] **Step 4: Write Twilio fallback function**

`infra/twilio-fallback-function.js`:
```javascript
exports.handler = function(context, event, callback) {
  const twiml = new Twilio.twiml.VoiceResponse();
  twiml.say('Sorry, we are experiencing technical difficulties. Please leave a message.');
  twiml.record({ maxLength: 120 });
  callback(null, twiml);
};
```

- [ ] **Step 5: Deploy to Railway**

```bash
railway up
```

- [ ] **Step 6: Configure Twilio phone numbers to point to Railway URLs**

- [ ] **Step 7: Commit**

```bash
git add apps/voice/Dockerfile apps/web/Dockerfile infra/
git commit -m "feat: deployment — Dockerfiles, Railway config, Twilio fallback function"
```

---

## Phase 7: Pilot Lifecycle + Polish

### Task 22: Pilot Management

**Files:**
- Create: `n8n/workflows/pilot-lifecycle.json`

- [ ] **Step 1: Build pilot lifecycle workflow**

Nodes:
1. **Cron** — daily at 9 AM
2. **PostgreSQL** — SELECT clients WHERE status = 'pilot'
3. **For each pilot client:**
   - **IF** pilot_ends_at - now() <= 2 days AND pilot_ends_at - now() > 1 day → SMS to operator: "Pilot for [name] ends in 2 days"
   - **IF** pilot_ends_at <= now() → UPDATE status = 'paused', SMS to client with Revenue Rescued total

- [ ] **Step 2: Export and commit**

```bash
git add n8n/workflows/pilot-lifecycle.json
git commit -m "feat: pilot lifecycle — auto-reminder at day 12, auto-pause at day 14"
```

---

### Task 23: End-to-End Test

- [ ] **Step 1: Set up a test client in the admin panel**

Create a client with your own phone number as `forward_phone` and a Twilio test number.

- [ ] **Step 2: Call the Twilio number, let it ring, verify:**
- AI voice agent picks up and greets correctly
- You can have a conversation about a plumbing issue
- AI offers to book an appointment
- Call summary is sent to owner phone via SMS

- [ ] **Step 3: Send an SMS to the Twilio number, verify:**
- AI replies contextually
- STOP handling works
- HELP response works

- [ ] **Step 4: Verify Revenue Rescued dashboard updates**

- [ ] **Step 5: Document any bugs, fix, commit**

---

---

## Phase 8: Self-Serve Portal (Month 4-5)

Per the Self-Serve Portal Blueprint (`Self_Serve_Portal_Blueprint.md`), build after 10 assisted clients prove the product.

### Task 24: Public Signup + Google Places Autocomplete

**Files:**
- Create: `apps/web/src/app/signup/page.tsx`
- Create: `apps/web/src/app/signup/steps/` (7 step components)
- Create: `apps/web/src/app/api/signup/route.ts`

- [ ] **Step 1:** Build 7-step signup wizard as Next.js pages
- [ ] **Step 2:** Integrate Google Places API (New) for business autocomplete
- [ ] **Step 3:** Auto-populate business name, phone, address, hours, website from Google
- [ ] **Step 4:** Trade-specific service checklists (plumbing + HVAC dropdown menus)
- [ ] **Step 5:** Commit

### Task 25: Auto Test Call + Voice Selection

- [ ] **Step 1:** Build voice selection UI with audio sample previews
- [ ] **Step 2:** Build `POST /api/test-call` endpoint — Twilio `calls.create()` → ConversationRelay
- [ ] **Step 3:** Auto-trigger test call after voice + greeting confirmed (the activation moment)
- [ ] **Step 4:** Commit

### Task 26: Auto Phone Provisioning + Forwarding Verification

- [ ] **Step 1:** Auto-provision Twilio number via API in signup flow
- [ ] **Step 2:** Carrier-specific call forwarding guides (Verizon, AT&T, T-Mobile)
- [ ] **Step 3:** "Verify My Setup" button — automated test call confirms forwarding works
- [ ] **Step 4:** Commit

### Task 27: Self-Serve Payment + Go-Live

- [ ] **Step 1:** Stripe Checkout in signup flow (setup fee + first month)
- [ ] **Step 2:** Auto-create client record in DB after payment
- [ ] **Step 3:** AI goes live immediately — no manual approval
- [ ] **Step 4:** Welcome email sequence (Day 1/3/7)
- [ ] **Step 5:** Commit

---

## Phase 9: Land-and-Expand (Month 6+)

Per the GTM Strategy (`docs/gtm-strategy.md`), expand each client into higher-ARPU services.

### Task 28: Website + GBP Optimization Service

- [ ] **Step 1:** GBP audit tool (analyze listing completeness, category, photos, posts)
- [ ] **Step 2:** Website audit with recommendations
- [ ] **Step 3:** Service page generator (Claude creates location-specific landing pages)
- [ ] **Step 4:** Monthly performance tracking in dashboard

### Task 29: Referral Program

- [ ] **Step 1:** Referral link generation per client
- [ ] **Step 2:** $200 account credit on successful referral conversion
- [ ] **Step 3:** Ask via SMS at 30-60 day mark
- [ ] **Step 4:** Track referral source in client record

### Task 30: FSM Integrations

- [ ] **Step 1:** Jobber API integration (create leads/jobs from AI bookings)
- [ ] **Step 2:** Housecall Pro API integration
- [ ] **Step 3:** Webhook-based fallback for other FSM tools

---

## Checkpoint Summary

| Phase | Tasks | Status | What's Shippable After |
|---|---|---|---|
| Phase 1 | Tasks 1-5 | **COMPLETE ✅** | Voice server answers calls with AI, 172 tests |
| Phase 2 | Tasks 6-7 | **NEXT** | Full phone system with calendar + test call endpoint |
| Phase 3 | Tasks 8-12 | Pending | n8n workflows: text-back, SMS, drip, reviews, metrics |
| Phase 4 | Tasks 13-16 | Pending | Admin panel + dashboard with Revenue Rescued |
| Phase 5 | Tasks 17-18 | Pending | Review monitoring + GEO/SEO automation |
| Phase 6 | Tasks 19-21 | Pending | Stripe billing + Railway deployment |
| Phase 7 | Tasks 22-23 | Pending | Pilot lifecycle + E2E verification |
| Phase 8 | Tasks 24-27 | Month 4-5 | Self-serve portal (signup → test call → payment → live) |
| Phase 9 | Tasks 28-30 | Month 6+ | Land-and-expand (website, GBP, referrals, FSM) |

**Start selling pilots after Phase 2.** Build dashboard and billing while pilots run. Build self-serve portal after 10 assisted clients prove the product.
