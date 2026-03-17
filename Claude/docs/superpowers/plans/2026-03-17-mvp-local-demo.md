# Local MVP Demo Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get the full ServiceLine AI MVP running locally in a browser — admin panel, client dashboard, Revenue Rescued, call simulation — zero external accounts, zero money spent.

**Architecture:** Local Postgres via Docker (already running), Next.js web app (already built but has module resolution errors), voice server (already built). Fix the wiring issues, seed demo data, and verify everything works end-to-end in the browser.

**Tech Stack:** Next.js 16, PostgreSQL 16, Drizzle ORM, Docker, Tailwind CSS, Recharts

---

## Current State Assessment

**What's ALREADY BUILT (52 source files):**
- Admin panel: dashboard KPIs, client list, client detail (calls/leads/appointments), lead feed
- Client dashboard: PIN login, Revenue Rescued overview with 6-month chart, call history, reviews
- Simulate Call API: generates demo data (calls, leads, appointments, revenue metrics)
- SimulateCallButton: trigger demo calls from client detail page
- Landing page with feature cards
- Voice server: complete with 418 tests
- Database: 12 tables, 4 migrations, all deployed to local Postgres

**What's BROKEN:**
1. `@serviceline/db/schema` subpath not exported — Next.js can't resolve the import
2. No demo seed data — empty database means empty dashboards
3. No client creation form — can't add clients from the admin panel
4. Next.js `next.config.ts` may need `transpilePackages` for the workspace dependency

**What's NEEDED for a convincing MVP demo:**
1. Fix module resolution (5 min)
2. Seed script with demo client + 30 days of realistic data (15 min)
3. Client creation form in admin panel (20 min)
4. Verify all pages render correctly (10 min)
5. End-to-end walkthrough validation (10 min)

---

## File Structure

```
Changes needed:
├── packages/db/
│   └── package.json                    # Add "exports" for schema subpath
│
├── apps/web/
│   ├── next.config.ts                  # Add transpilePackages
│   ├── src/lib/db.ts                   # May need import path fix
│   ├── src/app/admin/clients/
│   │   └── new/page.tsx                # CREATE: Client onboarding form
│   └── src/app/admin/layout.tsx        # May need nav link to /admin/clients/new
│
├── scripts/
│   └── seed-demo.ts                    # CREATE: Seed realistic demo data
│
└── package.json                        # Add seed script
```

---

## Task 1: Fix Module Resolution

**Files:**
- Modify: `packages/db/package.json`
- Modify: `apps/web/next.config.ts`
- Possibly modify: `apps/web/src/lib/db.ts`

- [ ] **Step 1: Check current db package.json exports**

```bash
cat packages/db/package.json
```

- [ ] **Step 2: Add schema subpath export to packages/db/package.json**

The web app imports `@serviceline/db/schema`. The package needs an `exports` field that maps this:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema.ts"
  }
}
```

- [ ] **Step 3: Add transpilePackages to next.config.ts**

Next.js needs to know to compile the workspace package:

```typescript
const nextConfig = {
  transpilePackages: ['@serviceline/db'],
  // ... existing config
};
```

- [ ] **Step 4: Verify the web app starts without errors**

```bash
cd apps/web
DATABASE_URL="postgresql://serviceline:serviceline@localhost:5432/serviceline" npm run dev
```

Then check: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin`
Expected: 200 (may show empty data, that's fine)

- [ ] **Step 5: Commit**

```bash
git add packages/db/package.json apps/web/next.config.ts
git commit -m "fix: module resolution — add schema subpath export + transpilePackages"
```

---

## Task 2: Seed Demo Data

**Files:**
- Create: `scripts/seed-demo.ts`
- Modify: `package.json` (root — add seed script)

- [ ] **Step 1: Write seed script**

`scripts/seed-demo.ts` should create:
1. **One demo client** — "Mike's Plumbing", Austin TX, Pro plan, pilot status
2. **30 days of calls** — mix of answered_ai, missed, voicemail (3-5 per day)
3. **30 days of leads** — matching calls, various statuses (new, contacted, booked, completed)
4. **15 appointments** — spread across the month, various statuses
5. **30 days of revenue_metrics** — realistic daily rollups (2-5 calls rescued, $700-1750/day)
6. **10 review requests** — 7 received (4-5 star ratings)
7. **Dashboard PIN** — set to "123456" (bcrypt hashed) for demo access

The data should look realistic:
- Calls happen between 7 AM and 9 PM
- More calls on weekdays
- Issues from a realistic list: "leaky faucet", "clogged drain", "water heater not working", "running toilet", "low water pressure", "garbage disposal broken"
- Customer names from a realistic list
- Revenue rescued should total ~$8,000-12,000 for the month

- [ ] **Step 2: Add seed script to root package.json**

```json
{
  "scripts": {
    "seed": "DATABASE_URL='postgresql://serviceline:serviceline@localhost:5432/serviceline' tsx scripts/seed-demo.ts"
  }
}
```

- [ ] **Step 3: Run the seed script**

```bash
npm run seed
```

Expected: "Seeded: 1 client, X calls, X leads, X appointments, X revenue_metrics, X reviews"

- [ ] **Step 4: Verify data in admin panel**

Start the web app and check:
- `/admin` — should show 1 client, MRR, revenue rescued
- `/admin/clients` — should show "Mike's Plumbing" with revenue data
- `/admin/clients/[id]` — should show recent calls, leads, appointments
- `/admin/leads` — should show 50 leads

- [ ] **Step 5: Verify client dashboard**

- `/dashboard/mikes-plumbing-[slug]` — PIN entry
- Enter "123456"
- `/dashboard/.../overview` — Revenue Rescued chart should show 30 days of data
- `/dashboard/.../calls` — should show call history with AI summaries
- `/dashboard/.../reviews` — should show review stats

- [ ] **Step 6: Commit**

```bash
git add scripts/seed-demo.ts package.json
git commit -m "feat: demo seed script — 30 days of realistic plumbing business data"
```

---

## Task 3: Client Creation Form

**Files:**
- Create: `apps/web/src/app/admin/clients/new/page.tsx`
- Modify: `apps/web/src/app/admin/layout.tsx` (add nav link)

- [ ] **Step 1: Build the client creation form**

Server action form that creates a new client. Fields:
- Business name (required)
- Owner name (required)
- Owner phone (required)
- Services (checkboxes: plumbing, drain, water_heater, sewer, gas_line, hvac, fixture_install)
- Service area (text)
- Plan (starter/pro radio)
- Dashboard PIN (auto-generated 6-digit, shown once after creation)

On submit:
- Generate slug from business name + random 4-char suffix
- Bcrypt hash the PIN
- Generate a fake Twilio number (for demo mode: +1555XXXXXXX)
- Insert into clients table
- Redirect to `/admin/clients/[id]` with success message

- [ ] **Step 2: Add "New Client" link to admin sidebar**

In `apps/web/src/app/admin/layout.tsx`, add a nav item linking to `/admin/clients/new`.

- [ ] **Step 3: Verify the form works**

- Navigate to `/admin/clients/new`
- Fill in form
- Submit
- Should redirect to client detail page
- New client should appear in `/admin/clients` list
- Client dashboard should be accessible via slug + PIN

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/admin/clients/new/ apps/web/src/app/admin/layout.tsx
git commit -m "feat: client creation form — add new clients from admin panel"
```

---

## Task 4: Polish and Verify End-to-End

- [ ] **Step 1: Start all services**

```bash
docker compose up -d                    # Postgres
npm run seed                            # Demo data (if not already seeded)
cd apps/web && DATABASE_URL="..." npm run dev   # Web app on :3000
cd apps/voice && DATABASE_URL="..." npm run dev  # Voice server on :3001
```

- [ ] **Step 2: Walk through the admin panel**

1. Open http://localhost:3000 — landing page
2. Click "Admin" → `/admin` — KPI dashboard
3. Click "Clients" → see Mike's Plumbing with revenue data
4. Click Mike's Plumbing → see calls, leads, appointments
5. Click "Simulate Call" → watch revenue rescued increment
6. Click "New Client" → create a test client
7. Click "Leads" → see all leads across clients

- [ ] **Step 3: Walk through the client dashboard**

1. Open http://localhost:3000/dashboard/[mikes-slug]
2. Enter PIN "123456"
3. Overview tab: Revenue Rescued hero number, 6-month chart, stat cards
4. Calls tab: call history with AI summaries
5. Reviews tab: review stats and velocity

- [ ] **Step 4: Test the simulate call button**

1. Go to `/admin/clients/[id]`
2. Click "Simulate Call" multiple times
3. Watch the call count and revenue rescued update
4. Refresh dashboard — numbers should reflect new calls

- [ ] **Step 5: Screenshot the demo for sales materials**

Capture:
- Revenue Rescued hero card ($X,XXX)
- Admin dashboard with KPIs
- Client detail page with call log
- Call briefing card (if displayed)

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: MVP polish — end-to-end verification fixes"
```

---

## Checkpoint Summary

| Task | Effort | What It Unlocks |
|---|---|---|
| Task 1: Fix module resolution | 5 min | Web app starts without errors |
| Task 2: Seed demo data | 15 min | Dashboards show convincing realistic data |
| Task 3: Client creation form | 20 min | Can add new clients from the UI |
| Task 4: Polish and verify | 15 min | Full end-to-end demo works in browser |

**Total: ~1 hour to a fully functional local MVP demo.**

After this, you can:
1. Open the app in a browser and see the complete product
2. Show it to anyone as a proof of concept
3. Decide if it's worth $2 in Twilio credits to make it real
