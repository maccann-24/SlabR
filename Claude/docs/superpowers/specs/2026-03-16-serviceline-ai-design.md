# ServiceLine AI — Product Spec

## Overview

ServiceLine AI is a productized AI phone system and GEO/SEO automation platform for HVAC and plumbing companies. It answers missed calls with an AI voice agent, books appointments, follows up on leads via SMS, harvests Google reviews, automates local search optimization, and quantifies revenue impact through a "Revenue Rescued" dashboard.

**Business model:** Light-touch productized service. The operator (us) onboards each client in ~30 minutes via an admin panel. Clients never see the backend — they get a phone number, a booking link, and a monthly dashboard.

**Target vertical:** HVAC and plumbing companies (1-20 trucks). These businesses are cash-rich, tech-poor, lose ~27% of inbound calls, and their average service call is $250-500.

---

## Pricing

| Plan | Price | Features |
|---|---|---|
| **Starter** | $199/mo | Missed-call text-back, SMS auto-reply (AI), 3-touch follow-up drip, review harvesting, Revenue Rescued dashboard |
| **Pro** | $499/mo | Everything in Starter + AI voice agent with appointment booking + emergency triage + GEO/SEO automation + monthly visibility report |
| **Setup fee** | $500 one-time | Phone number provisioning, calendar integration, Google Business Profile audit, schema markup, AI training on client's business |

### Unit Economics

| Item | Cost/Client/Month | Notes |
|---|---|---|
| Twilio phone number | $1.00 | |
| Voice (~50 calls × 3 min) | ~$2.50 | Includes ConversationRelay + recording storage |
| SMS (~200 messages) | ~$1.60 | |
| Claude Haiku API | ~$0.50 | Voice (~$0.17) + SMS (~$0.33) |
| GEO tooling | ~$2.00 | SerpAPI or Google Custom Search for visibility checks |
| Railway infra (amortized) | ~$3.00 | $20-40/mo total ÷ client count; decreases with scale |
| **Total cost per client** | **~$10.60** | At 10 clients; drops to ~$7 at 30+ |
| **Starter margin** | $188.40 (95%) | |
| **Pro margin** | $488.40 (98%) | |

---

## Features

### F1: AI Voice Agent (Pro tier)

**Trigger:** Incoming call to client's Twilio number rings their real phone for 20 seconds. If unanswered, Twilio ConversationRelay connects the caller to our AI voice agent via WebSocket.

**Behavior:**
- Greets caller with client's business name
- Identifies the issue (AC not cooling, pipe leaking, water heater out, etc.)
- Asks qualifying questions (address, urgency, preferred time)
- Uses tool calling to:
  - `check_availability(date, time_range)` — queries Google Calendar for open slots
  - `book_appointment(name, phone, address, issue, datetime)` — creates calendar event + confirms with caller
  - `escalate_emergency(name, phone, address, issue)` — immediately texts/calls the business owner for emergencies (burst pipe, gas leak, no heat in winter)
- Ends call with confirmation summary
- Sends call summary + recording link to business owner via SMS

**Voice:** Google TTS via ConversationRelay (`en-US-Journey-F` or similar natural voice). Transcription via Deepgram `nova-2-general`.

**AI model:** Claude Haiku for speed (sub-second response generation). System prompt is per-client, loaded from the database, containing business name, services offered, service area, pricing guidance, and personality notes.

**Recording consent:** If `client.recording_consent_required` is true, the ConversationRelay `welcomeGreeting` prepends: *"This call may be recorded for quality purposes."* Default is true (covers two-party consent states like California, Florida, etc.). The operator can disable for one-party consent states if desired.

**Conversation guardrails:**
- Never quote exact prices (says "typically ranges from..." or "the tech will provide an exact quote on-site")
- Never diagnose (says "that sounds like it could be X, but our tech will confirm")
- Always captures: name, phone, address, issue description
- Escalation keywords: "emergency", "flooding", "gas smell", "no heat", "burst", "sewage"

### F2: Missed-Call Text-Back (both tiers)

**Trigger:** Twilio `DialCallStatus=no-answer` fires HTTP POST to the voice server's `/call-status` action endpoint.

**Behavior depends on client plan:**
- **Pro tier:** The `/call-status` endpoint returns `<Connect><ConversationRelay>` TwiML, handing the caller to the AI voice agent (F1). Text-back is **suppressed** — the voice agent handles the lead. Text-back only fires if the caller hangs up before the AI greeting finishes (detected via ConversationRelay `disconnect` event with `duration < 5s`).
- **Starter tier:** The `/call-status` endpoint returns `<Say>` with a voicemail prompt + `<Record>`, and simultaneously triggers the n8n text-back webhook.

**Text-back action (within 10 seconds):**
1. n8n receives webhook with caller's phone number
2. Looks up which client owns this Twilio number
3. Sends SMS via Twilio: *"Hey! Sorry we missed your call at [Business Name]. Need help with heating, cooling, or plumbing? Reply here or book a time: [booking_link]"*
4. Creates a lead record in the database (status: `new`, `drip_next_at: now() + 24h`)

**If caller replies via SMS:** Routes to F3 (SMS Auto-Reply).

### F3: SMS Auto-Reply with AI (both tiers)

**Trigger:** Incoming SMS to any client's Twilio number → n8n Twilio Trigger node.

**Action:**
1. Look up client config by Twilio number
2. Load conversation history for this phone number (last 10 messages)
3. Send to Claude Haiku with client's system prompt + conversation history
4. Claude generates a contextual reply (qualifying the lead, answering questions, offering to book)
5. Send reply via Twilio SMS
6. Store message in conversation history

**Conversation context:** Messages are stored in PostgreSQL with `client_id`, `contact_phone`, `direction` (inbound/outbound), `body`, `created_at`. Claude sees the last 10 messages for continuity.

**Conversation limits:** Max 15 AI replies per lead per 24-hour window. After the limit, send: *"I'd love to keep helping — let me have [owner_name] reach out to you directly."* Then SMS the owner with the conversation summary. This prevents runaway API costs and infinite bot conversations that never convert.

**HELP keyword:** If the message body contains "HELP" (case-insensitive), reply with: *"[Business Name] — call us at [forward_phone] or reply to this text. To stop messages, reply STOP."* This is required by 10DLC compliance.

### F4: Follow-Up Drip (both tiers)

**Trigger:** Lead record exists with status `new` or `contacted` and no appointment booked after 24 hours.

**Sequence (managed by n8n cron + workflow):**
- **Day 1** (24h after first contact): *"Still need help with [issue]? [Business Name] has openings this week — reply to book!"*
- **Day 3**: *"Just checking in — [Business Name] can usually get to you same-day. Want us to send someone out?"*
- **Day 5**: *"Last note from us! Reply anytime if you still need [service_type] service. We're always here."*

**Exit conditions:**
- Lead replies to any drip message → exits drip, enters live AI conversation (F3)
- Lead books appointment → exits drip, status updated to `booked`
- Lead texts STOP → exits drip, marked as `opted_out`, no further messages

**Personalization:** `[issue]` and `[service_type]` are pulled from the original call/text context stored in the lead record.

### F5: Review Harvesting (both tiers)

**Trigger:** Operator marks a job as complete via admin panel (or SMS command: texts "done [contact_phone]" to a designated admin number).

**Action:**
1. 2-hour delay (n8n wait node — gives customer time to settle)
2. SMS to customer: *"Thanks for choosing [Business Name]! If we did a good job, a quick Google review means a lot to us: [google_review_link]"*
3. If customer leaves a 4-5 star review (detected via Google Business Profile API polling): auto-reply with thanks
4. If 1-3 stars: alert operator via SMS for personal intervention

**Google review link:** Stored per client in config. Generated from their Google Place ID: `https://search.google.com/local/writereview?placeid=[PLACE_ID]`

### F6: Revenue Rescued Dashboard (both tiers)

**What it shows:**
- **Calls rescued this month** — count of missed calls handled by AI voice agent or text-back
- **Estimated revenue rescued** — calls rescued × client's average ticket (configurable, default $350). "Calls rescued" = any missed call where the system made contact (AI answered, text-back sent, or SMS conversation started). This is deliberately broader than "appointments booked" — it represents revenue that would have been lost entirely without the system.
- **Appointments booked** — count of appointments created by the system
- **Leads in pipeline** — active leads in drip sequence
- **Reviews collected** — review requests sent vs reviews received this month
- **Response time** — average time from missed call to first contact (target: <10 seconds)
- **Monthly trend** — line chart of rescued revenue over last 6 months

**For Pro tier, also shows:**
- **GEO/SEO score** — composite visibility score (see F7)
- **Local search impressions** — from Google Business Profile Insights API
- **AI search mentions** — estimated visibility in AI search results

**Access:** Each client gets a unique URL (`dashboard.servicelineai.com/[client_slug]`) with PIN login (no account creation). The dashboard is a read-only view — no configuration, no complexity.

**PIN security:**
- Slugs include a random suffix (e.g., `mikes-plumbing-a7x2`) to prevent URL enumeration
- Rate limit: 5 PIN attempts per 15 minutes per slug, then 30-minute lockout
- PIN is bcrypt-hashed in the database (never stored plaintext)
- Future upgrade path: replace PIN with magic link sent via SMS to owner's phone

**Operator view:** Admin panel shows all clients' Revenue Rescued data in aggregate — total revenue rescued across all clients, average per client, top performers.

### F7: GEO/SEO Automation (Pro tier)

**F7.1: Google Business Profile Optimization**
- On setup: audit the client's GBP listing against best practices
- Generate optimized business description, service list, Q&A entries using Claude
- Suggest optimal categories and attributes
- Deliverable: PDF audit report + recommended changes (client applies them or gives us GBP access)

**F7.2: Schema Markup Generation**
- Generate JSON-LD structured data for the client's website:
  - `LocalBusiness` (with `@type: Plumber` or `HVACBusiness`)
  - `Service` (for each service offered)
  - `FAQPage` (common questions for their trade)
  - `AggregateRating` (from Google reviews)
  - `OpeningHoursSpecification`
- Output: copy-paste snippet or direct injection if we have site access

**F7.3: AI Search Visibility**
- Generate `llms.txt` file for the client's website
- Create content structured for AI citation (clear headings, factual claims, source attribution)
- Monitor: periodic checks of AI search results for "[service] in [city]" queries

**F7.4: Service Page Generation**
- Claude generates location-specific landing page content:
  - "Emergency Plumber in [City]"
  - "AC Repair [Neighborhood] — Same Day Service"
  - "Water Heater Installation [City] — Licensed & Insured"
- Output: HTML/markdown content ready for the client's website
- Keyword targeting based on local search volume data

**F7.5: Monthly GEO Report**
- Automated PDF report delivered to client email:
  - GBP performance (views, clicks, calls, direction requests)
  - Review velocity vs local competitors
  - Schema markup status
  - AI search visibility score
  - Recommended actions for next month

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                       TWILIO                             │
│  1 phone number per client                               │
│  Voice webhook ──→ TwiML (ring real phone, fallback AI)  │
│  SMS webhook ──→ n8n                                     │
│  Status callback ──→ n8n (missed call detection)         │
└────────┬───────────────────────────┬─────────────────────┘
         │ Voice (WebSocket)         │ SMS + Status (HTTP)
         ▼                          ▼
┌──────────────────────┐    ┌───────────────────────────┐
│  Voice Server         │    │  n8n                       │
│  (Fastify + WS)       │    │                           │
│                       │    │  Workflows:               │
│  • ConversationRelay  │    │  • missed-call-textback   │
│  • Claude Haiku       │    │  • sms-auto-reply         │
│  • Tool calling:      │    │  • follow-up-drip         │
│    - check_availability│   │  • review-request         │
│    - book_appointment  │   │  • review-monitor         │
│    - escalate_emergency│   │  • geo-report-generator   │
│                       │    │                           │
│  Loads client config  │    │  Loads client config      │
│  from PostgreSQL      │    │  from PostgreSQL          │
└──────────┬───────────┘    └─────────┬─────────────────┘
           │                          │
           ▼                          ▼
┌────────────────────────────────────────────────────────┐
│                    PostgreSQL (Railway)                  │
│                                                        │
│  Tables:                                               │
│  • clients          — business config, Twilio #, plan  │
│  • leads            — contact info, status, source     │
│  • conversations    — SMS message history              │
│  • calls            — call records, duration, outcome  │
│  • appointments     — booked jobs                      │
│  • reviews          — review requests sent + received  │
│  • geo_audits       — GBP audit results, scores       │
│  • revenue_metrics  — daily rescued revenue rollups    │
└────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────┐    ┌──────────────────┐
│  Admin Panel (Next.js)    │    │  Client Dashboard │
│                          │    │  (Next.js)        │
│  • Client CRUD + config  │    │                   │
│  • Lead feed (all clients)│   │  • Revenue Rescued│
│  • Revenue Rescued agg   │    │  • Calls/leads    │
│  • Stripe billing status │    │  • Reviews        │
│  • GEO audit triggers    │    │  • GEO score      │
│  • Job completion toggle │    │  (read-only, PIN) │
└──────────────────────────┘    └──────────────────┘
```

### Service Topology on Railway

| Service | Runtime | Resource |
|---|---|---|
| `voice-server` | Node.js (Fastify + WebSocket) | Railway service |
| `n8n` | n8n Docker image | Railway service + volume |
| `web` | Next.js (admin panel + client dashboard) | Railway service |
| `postgres` | PostgreSQL 16 | Railway addon |

All services share the same Railway project and private network. Voice server and n8n communicate with Postgres directly. The Next.js app serves both admin and client dashboard routes.

---

## Data Model

### `clients`
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- "Mike's Plumbing"
  slug TEXT UNIQUE NOT NULL,             -- "mikes-plumbing" (for dashboard URL)
  owner_name TEXT NOT NULL,              -- "Mike Johnson"
  owner_phone TEXT NOT NULL,             -- owner's personal phone
  owner_email TEXT,
  twilio_phone TEXT UNIQUE NOT NULL,     -- Twilio number assigned
  forward_phone TEXT NOT NULL,           -- ring this first before AI picks up
  business_hours JSONB NOT NULL,         -- {"mon": ["08:00","17:00"], ...}
  services TEXT[] NOT NULL,              -- ["plumbing","water_heater","drain"]
  service_area TEXT NOT NULL,            -- "Austin, TX and surrounding areas"
  avg_ticket_value NUMERIC DEFAULT 350,  -- for Revenue Rescued calculation
  google_place_id TEXT,                  -- for review link + GBP API
  google_review_link TEXT,
  google_calendar_id TEXT,               -- calendar to book into
  recording_consent_required BOOLEAN DEFAULT true, -- two-party consent states
  ai_system_prompt TEXT,                 -- custom personality/instructions
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  dashboard_pin TEXT NOT NULL,           -- bcrypt-hashed 4-6 digit PIN
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','churned')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `leads`
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  contact_name TEXT,
  contact_phone TEXT NOT NULL,
  contact_address TEXT,
  issue_description TEXT,
  issue_category TEXT,                   -- "plumbing", "hvac", "water_heater", etc.
  urgency INTEGER CHECK (urgency BETWEEN 1 AND 5),
  source TEXT NOT NULL CHECK (source IN ('voice','sms','missed_call')),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','in_drip','booked','completed','opted_out','lost')),
  drip_step INTEGER DEFAULT 0,          -- 0=not started, 1-3=drip messages sent
  drip_next_at TIMESTAMPTZ,
  revenue_rescued NUMERIC,              -- set to avg_ticket_value when booked
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `conversations`
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  lead_id UUID REFERENCES leads(id),
  contact_phone TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'voice')),
  body TEXT NOT NULL,
  twilio_sid TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_conversations_lookup
  ON conversations(client_id, contact_phone, created_at DESC);
```

### `calls`
```sql
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  lead_id UUID REFERENCES leads(id),
  caller_phone TEXT NOT NULL,
  twilio_call_sid TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('answered_human','answered_ai','missed','voicemail')),
  duration_seconds INTEGER,
  ai_summary TEXT,                       -- Claude's summary of the call
  recording_url TEXT,
  emergency_escalated BOOLEAN DEFAULT false,
  appointment_booked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `appointments`
```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  lead_id UUID REFERENCES leads(id),
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_address TEXT,
  issue_description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  google_event_id TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `reviews`
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  lead_id UUID REFERENCES leads(id),
  contact_phone TEXT NOT NULL,
  request_sent_at TIMESTAMPTZ,
  review_received BOOLEAN DEFAULT false,
  review_rating INTEGER,
  review_replied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `geo_audits`
```sql
CREATE TABLE geo_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  audit_type TEXT NOT NULL CHECK (audit_type IN ('gbp','schema','ai_visibility','full')),
  score NUMERIC,
  findings JSONB,                        -- structured audit results
  recommendations JSONB,                 -- action items
  report_url TEXT,                       -- link to generated PDF
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `revenue_metrics`
```sql
CREATE TABLE revenue_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  date DATE NOT NULL,
  calls_rescued INTEGER DEFAULT 0,
  leads_created INTEGER DEFAULT 0,
  appointments_booked INTEGER DEFAULT 0,
  reviews_requested INTEGER DEFAULT 0,
  reviews_received INTEGER DEFAULT 0,
  estimated_revenue_rescued NUMERIC DEFAULT 0,
  UNIQUE(client_id, date)
);
```

### `google_oauth_tokens`
```sql
CREATE TABLE google_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Google Calendar auth approach:** Each client completes a one-time OAuth2 consent flow during onboarding. The admin panel presents a "Connect Google Calendar" button that initiates the OAuth flow. Tokens are stored encrypted at rest (AES-256, key in environment variable). The voice server and n8n refresh tokens automatically when expired. If a refresh fails, the operator is alerted and the client's booking feature degrades gracefully (AI tells caller "I can take your info and have someone call you back to schedule").

### Additional Indexes
```sql
CREATE INDEX idx_leads_drip ON leads(client_id, status, drip_next_at) WHERE drip_step < 3;
CREATE INDEX idx_leads_client_created ON leads(client_id, created_at DESC);
CREATE INDEX idx_calls_client_created ON calls(client_id, created_at DESC);
CREATE INDEX idx_appointments_client_scheduled ON appointments(client_id, scheduled_at);
CREATE INDEX idx_reviews_client_created ON reviews(client_id, created_at DESC);
CREATE INDEX idx_revenue_metrics_client_date ON revenue_metrics(client_id, date DESC);
CREATE UNIQUE INDEX idx_leads_dedup ON leads(client_id, contact_phone)
  WHERE status NOT IN ('completed', 'lost', 'opted_out');
```

**Lead deduplication:** The partial unique index on `(client_id, contact_phone)` prevents duplicate active leads for the same caller. If a caller calls again after their previous lead was completed/lost, a new lead is created. The voice server and text-back workflow use `INSERT ... ON CONFLICT DO UPDATE` to merge into existing active leads rather than creating duplicates.

### Webhook Security

All inbound Twilio webhooks (voice server and n8n) must validate the `X-Twilio-Signature` header using Twilio's request validation. This prevents spoofed webhook calls. Implementation: use `twilio.validateRequest()` middleware in Fastify, and a custom n8n Code node that validates before processing.

### n8n Configuration

- **Backend database:** PostgreSQL (shared with app data but separate schema `n8n`), NOT SQLite. This survives container restarts and enables future worker mode.
- **UI access:** n8n web UI is restricted to Railway's private network (no public URL). Access via Railway's port forwarding when needed.
- **Wait node resilience:** n8n with PostgreSQL backend persists wait node state across restarts. The 2-hour wait in WF4 survives redeployments.

### Monitoring and Alerting

- **Structured logging:** All services log JSON to stdout (Railway captures this).
- **Health checks:** Each Railway service has a `/health` endpoint. Railway restarts unhealthy services automatically.
- **Alert channels:** Critical alerts (voice server down, Twilio auth failure, emergency escalation failure) → SMS to operator via Twilio. Non-critical (daily metrics, review alerts) → email.
- **Uptime monitoring:** Free tier of BetterUptime or similar pings `/health` endpoints every 60 seconds.

---

## Voice Server Detail

### Technology
- **Runtime:** Node.js with Fastify
- **WebSocket:** @fastify/websocket
- **AI:** @anthropic-ai/sdk (Claude Haiku)
- **Reference:** Twilio ConversationRelay bridge pattern

### Request Flow

**Important:** Twilio's TwiML execution model means that when `<Dial>` has an `action` URL, Twilio calls that URL and executes the returned TwiML — it does NOT fall through to subsequent verbs in the original document. The voice server uses a two-step TwiML pattern:

**Step 1 — Initial TwiML** (`GET /twiml/:twilioPhone`):
```xml
<Response>
  <Dial action="https://voice.servicelineai.com/call-status" timeout="20">
    <Number>+1XXXXXXXXXX</Number>  <!-- client's real phone -->
  </Dial>
  <!-- This is fallback only if action URL is unreachable -->
  <Say>We're sorry, please try again later.</Say>
</Response>
```

**Step 2 — Action handler** (`POST /call-status`):

The `/call-status` endpoint inspects `DialCallStatus` and returns different TwiML:

- **`completed`** (client answered and hung up): return `<Hangup/>`. No further action.
- **`no-answer`** (Pro tier): return ConversationRelay TwiML to hand caller to AI:
  ```xml
  <Response>
    <Connect>
      <ConversationRelay
        url="wss://voice.servicelineai.com/ws"
        welcomeGreeting="Hi, thanks for calling [Business Name]..."
        voice="en-US-Journey-F"
        ttsProvider="google"
        transcriptionProvider="deepgram"
        speechModel="nova-2-general"
      />
    </Connect>
  </Response>
  ```
- **`no-answer`** (Starter tier): return voicemail prompt + fire text-back webhook to n8n:
  ```xml
  <Response>
    <Say>Sorry we missed your call. Please leave a message after the beep.</Say>
    <Record maxLength="120" action="/recording-complete" />
  </Response>
  ```
  The endpoint also sends an async HTTP POST to n8n's missed-call-textback webhook.

- **`busy` / `failed`**: same as `no-answer` for the client's plan.

**Fallback TwiML:** Each Twilio phone number is configured with a Fallback URL pointing to a Twilio Function (serverless, separate from Railway) that returns a basic voicemail TwiML. This ensures calls are handled even if the voice server is down.

### WebSocket Protocol

1. Twilio opens WSS connection to `/ws`
2. Server receives `setup` event with call metadata (From, To, CallSid)
3. Server loads client config from DB using the `To` number
4. Server builds Claude system prompt with client context
5. Conversation loop:
   - Receive `prompt` event (transcribed caller speech)
   - Send to Claude Haiku with tools + conversation history
   - If Claude calls a tool → execute it, send result back to Claude
   - Stream Claude's text response back as `text` events
   - Send `end_of_turn` when response is complete
6. On `disconnect` → save call record, generate summary, notify owner

### Claude Tools for Voice Agent

```typescript
const tools = [
  {
    name: "check_availability",
    description: "Check available appointment slots on the calendar",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date to check (YYYY-MM-DD)" },
        time_preference: { type: "string", enum: ["morning", "afternoon", "any"] }
      },
      required: ["date"]
    }
  },
  {
    name: "book_appointment",
    description: "Book an appointment for the caller",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
        address: { type: "string" },
        issue: { type: "string" },
        datetime: { type: "string", description: "ISO 8601 datetime" }
      },
      required: ["name", "phone", "address", "issue", "datetime"]
    }
  },
  {
    name: "escalate_emergency",
    description: "Immediately alert the business owner about an emergency",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
        address: { type: "string" },
        issue: { type: "string" }
      },
      required: ["phone", "issue"]
    }
  }
];
```

---

## n8n Workflows

### WF1: Missed-Call Text-Back
- **Trigger:** Webhook node (`POST /call-status`)
- **Filter:** IF `DialCallStatus === "no-answer"`
- **Lookup:** PostgreSQL node — find client by Twilio number
- **Create lead:** PostgreSQL node — insert into `leads` (source: `missed_call`)
- **Send SMS:** Twilio node — personalized text with booking link
- **Log:** PostgreSQL node — insert into `conversations`

### WF2: SMS Auto-Reply
- **Trigger:** Twilio Trigger node (On New SMS)
- **Lookup:** PostgreSQL node — find client + load conversation history (last 10 messages)
- **Check drip:** IF lead is in drip → exit drip sequence, update lead status
- **Check opt-out:** IF body contains STOP → update lead status to `opted_out`, send confirmation, end
- **AI reply:** HTTP Request node → Claude Haiku API with system prompt + history
- **Send reply:** Twilio node — send Claude's response
- **Log:** PostgreSQL node — insert both inbound and outbound into `conversations`

### WF3: Follow-Up Drip
- **Trigger:** Cron node (every hour)
- **Query:** PostgreSQL — select leads where `status IN ('new','contacted')` AND `drip_next_at <= now()` AND `drip_step < 3`
- **Loop:** For each lead:
  - Generate drip message (template with `[issue]`, `[business_name]` substitution)
  - Send SMS via Twilio
  - Update lead: increment `drip_step`, set `drip_next_at` (+48h for step 2, +48h for step 3)
  - If `drip_step = 3` → update status to `lost`
- **Log:** Insert outbound messages into `conversations`

### WF4: Review Request
- **Trigger:** Webhook node (`POST /job-complete`)
- **Input:** `{ client_id, contact_phone }`
- **Dedup:** Check if a review request already exists for this `(client_id, lead_id)` — skip if so
- **Wait:** Wait node (2 hours)
- **Lookup:** PostgreSQL — find client's Google review link
- **Send SMS:** Twilio — review request message
- **Log:** Insert into `reviews` table

### WF5: Review Monitor
- **Trigger:** Cron node (daily at 9 AM)
- **For each active client with Google Place ID:**
  - Poll Google Places API (New) for recent reviews using `places/{place_id}/reviews`
  - Compare against last known review count in `reviews` table
  - If new reviews detected → SMS alert to owner with star rating and snippet
  - Auto-reply to reviews is **deferred** — GBP Review Management API requires partner-level access. For v1, we alert the owner to reply manually. Auto-reply can be added if/when we get GBP API partner status.
  - Update `reviews` table

### WF6: GEO Report Generator (Pro tier)
- **Trigger:** Cron node (1st of each month)
- **For each Pro client:**
  - Pull review velocity from `reviews` table
  - Run AI search visibility check via SerpAPI ($50/mo for 5,000 searches — ~10 queries/client/month is well within budget): search `[service] in [city]` on Google, extract whether client appears in local pack, map pack, or organic results
  - Claude generates structured findings + recommendations as JSON
  - PDF generated using **Puppeteer** rendering an HTML template (hosted in the Next.js app at `/api/report/[client_id]`). Puppeteer runs as a one-shot via n8n's Execute Command node or HTTP Request to a `/api/generate-report` endpoint that returns a PDF buffer.
  - PDF stored in Railway volume at `/data/reports/[client_id]/[date].pdf`, served via a signed URL
  - Email report to client via Resend or SendGrid (transactional email)
  - Store metadata in `geo_audits`

**Note:** Google Business Profile Insights API (Performance API) requires OAuth from the business owner (same tokens used for Calendar). If the client hasn't connected their Google account, the report omits GBP metrics and notes "Connect Google to see detailed insights."

### WF7: Revenue Metrics Rollup
- **Trigger:** Cron node (daily at midnight)
- **For each active client:**
  - Count calls rescued (AI-answered + text-back sent), leads created, appointments booked, reviews for the day
  - Calculate estimated revenue rescued = calls_rescued × avg_ticket_value (broader than just booked appointments — represents total potential revenue saved from missed calls)
  - Upsert into `revenue_metrics`

---

## Admin Panel (Next.js)

### Routes

| Route | Purpose |
|---|---|
| `/admin` | Dashboard — aggregate Revenue Rescued, total clients, MRR |
| `/admin/clients` | Client list with status badges |
| `/admin/clients/new` | Onboarding form (provisions Twilio #, creates config) |
| `/admin/clients/[id]` | Client detail — config editor, lead feed, call log |
| `/admin/clients/[id]/geo` | GEO audit results + trigger new audit |
| `/admin/leads` | Cross-client lead feed (filterable by client, status) |

### Client Dashboard Routes (public, PIN-protected)

| Route | Purpose |
|---|---|
| `/dashboard/[slug]` | PIN entry |
| `/dashboard/[slug]/overview` | Revenue Rescued + key metrics |
| `/dashboard/[slug]/calls` | Call history with AI summaries |
| `/dashboard/[slug]/reviews` | Review velocity + recent reviews |
| `/dashboard/[slug]/geo` | GEO score + visibility report (Pro only) |

### Auth
- **Admin:** Simple email/password auth (NextAuth.js with credentials provider). Single operator account — no multi-user needed.
- **Client dashboard:** PIN-based access per client slug. PIN stored hashed in `clients` table.

---

## 10DLC Compliance

Before sending any SMS, we must register with The Campaign Registry (TCR) through Twilio:

1. **Brand Registration** — $4 one-time (low-volume standard)
2. **Campaign Registration** — $15 one-time + $1.50-10/mo
   - Use case: "Appointment reminders, missed call follow-ups, and review requests for HVAC/plumbing service companies"
   - Sample messages required
3. **STOP/HELP handling** — must be implemented in every SMS workflow
   - STOP → opt out, confirm, cease all messages
   - HELP → reply with support contact info
4. **Opt-in documentation** — the missed call itself constitutes implicit opt-in for service-related follow-up; explicit opt-in language in initial text-back message

---

## External Accounts Required

| Service | Purpose | Setup |
|---|---|---|
| **Twilio** | Voice + SMS | New account, add payment, register 10DLC |
| **Anthropic** | Claude Haiku API | API key |
| **Google Cloud** | Calendar API + GBP API | Service account + OAuth |
| **Stripe** | Client billing | Already have account |
| **Railway** | Hosting all services | New project |
| **Domain** | servicelineai.com (or similar) | Register + point DNS to Railway |

---

## Development Phases

### Phase 1: Foundation (Week 1)
- Project scaffolding (monorepo: `apps/voice`, `apps/web`, `packages/db`)
- PostgreSQL schema + migrations
- Railway project setup (Postgres, services)
- Twilio account + first test phone number
- Basic Fastify voice server with ConversationRelay "hello world"

### Phase 2: Core Phone System (Week 2)
- AI voice agent with Claude Haiku + tool calling
- Missed-call text-back (n8n workflow)
- SMS auto-reply with AI (n8n workflow)
- Google Calendar integration (check + book)
- Call recording + summary generation

### Phase 3: Lead Management + Drip (Week 3)
- Lead tracking (create, update, status transitions)
- Follow-up drip workflow (n8n)
- STOP/HELP handling
- Emergency escalation flow
- Admin panel: client CRUD, lead feed, call log

### Phase 4: Revenue Rescued + Dashboard (Week 3-4)
- Revenue metrics rollup workflow
- Client dashboard (PIN-protected)
- Revenue Rescued visualization
- Call history with AI summaries
- Admin aggregate dashboard

### Phase 5: Review System (Week 4)
- Review request workflow
- Google Business Profile API integration
- Review monitoring + auto-reply
- Review velocity tracking in dashboard

### Phase 6: GEO/SEO Automation (Week 4-5)
- GBP audit tool
- Schema markup generator
- Service page content generator
- Monthly GEO report generator
- AI search visibility checker

### Phase 7: Billing + Polish (Week 5)
- Stripe subscription integration
- Client onboarding flow (admin panel)
- Twilio number provisioning via API
- Domain + SSL + production deployment
- Landing page for ServiceLine AI itself

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Twilio ConversationRelay latency | Caller hears awkward pauses | Use Claude Haiku (fastest), stream tokens, keep system prompts concise |
| ConversationRelay beta status | Feature could change or be removed | ConversationRelay is in public beta as of March 2026. Twilio has published official tutorials and reference repos for it. Fallback plan: switch to Twilio Media Streams + Deepgram + Google TTS manually (more code, same result). Monitor Twilio changelog for GA announcement. |
| 10DLC registration delays | Can't send SMS | Register immediately in Phase 1, use toll-free as fallback |
| Google Calendar API quota | Can't book appointments | Low volume per client, well within free tier limits |
| Client's real phone is a landline | Can't receive SMS alerts | Offer email alerts as fallback |
| AI says something inappropriate | Reputation damage | Strict system prompt guardrails, log all conversations, periodic review |
| Railway downtime | Missed calls not handled | Twilio fallback TwiML (voicemail) if voice server is unreachable |

---

## Stripe Integration

- **Subscription products:** Two Stripe Products — "Starter" ($199/mo) and "Pro" ($499/mo)
- **Setup fee:** One-time Stripe invoice for $500 created during onboarding
- **Webhook handling:** Listen for `invoice.payment_failed` → pause client's service (set status to `paused`, AI greets callers with "this number is temporarily unavailable") and alert operator. Listen for `invoice.paid` → reactivate.
- **Cancellation:** `customer.subscription.deleted` → set status to `churned`, stop all workflows for that client, retain data for 90 days
- **No trials** at launch. Can add a 7-day free trial later once we have testimonials.

---

## Scaling Boundaries

This architecture is designed for **1-30 clients**. At that scale:
- Single voice server instance handles ~30 concurrent WebSocket connections comfortably
- n8n community edition handles all cron workflows without overlap
- Railway Postgres handles the query load easily

**At 30+ clients**, evaluate:
- Voice server: add Railway instance scaling (horizontal, with session affinity for WebSockets)
- n8n: consider n8n Enterprise (queue mode with workers) or migrate high-volume workflows to custom Node.js services
- Postgres: still fine up to hundreds of clients at this data volume

**This is a good problem to have.** Don't over-engineer for scale before you have 10 paying clients.

---

## Success Criteria

1. **Voice agent answers a missed call and books an appointment** end-to-end in under 60 seconds
2. **Missed-call text-back fires within 10 seconds** of a no-answer
3. **Revenue Rescued dashboard shows accurate data** matching call/lead/appointment records
4. **First paying client onboarded** within 2 weeks of Phase 4 completion
5. **5 paying clients** within 30 days of launch
6. **< 2% SMS delivery failure rate** (10DLC compliant)
7. **Admin can onboard a new client in under 30 minutes** using the admin panel
