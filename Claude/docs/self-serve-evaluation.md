# Self-Serve Portal Evaluation

**Question:** Should we build self-serve onboarding into ServiceLine AI?

**Answer:** Yes — but phased. The blueprint's core insight is correct: at $149/mo, manual onboarding kills your margins. But we should launch with assisted (current model) and build self-serve as Phase 2.

---

## How Our Current Build Maps to the 7-Step Flow

| Blueprint Step | What We Have | Gap | Effort to Close |
|---|---|---|---|
| **Step 1: Signup + Business ID** | Admin panel client CRUD (for operator) | No self-serve signup. No Google Places autocomplete. | MEDIUM — new Next.js public route + Google Places API |
| **Step 2: AI Auto-Training from Website** | Static `ai_system_prompt` per client | No website scraping. No auto-generated FAQ. | HIGH — need web crawler + Claude extraction pipeline |
| **Step 3: Voice + Test Call** | ConversationRelay with voice selection in TwiML | No self-serve voice picker. No auto test call. | MEDIUM — UI + Twilio API call trigger |
| **Step 4: Phone Number + Routing** | Twilio number provisioned manually | No auto-provisioning. No call forwarding verification. | MEDIUM — Twilio API for number purchase + verification call |
| **Step 5: Service Config + FAQ** | `services` array + `ai_system_prompt` | No editable FAQ UI. No trade-specific templates. | MEDIUM — Next.js form + FAQ template library |
| **Step 6: Calendar Connection** | Google OAuth flow designed (not built) | OAuth flow not implemented yet | Already planned for Phase 2 |
| **Step 7: Payment + Go-Live** | Stripe integration designed (not built) | Not implemented yet | Already planned for Phase 6-7 |

**Bottom line:** We have the backend for all of this. What's missing is the self-serve UI and the automation glue (auto-provisioning, auto-training, test call trigger).

---

## What Changes in Our Architecture

### Current Model (B — Light-Touch)
```
Operator finds prospect → demo call → 30-min manual setup → pilot runs
```

### Self-Serve Model (A — from blueprint)
```
Contractor finds landing page → self-serve signup → AI auto-configured → test call → payment → live
```

### Recommended: Hybrid — Both Paths
```
Path A (self-serve): Landing page → 7-step flow → live in 15 min → $149/mo + $9/appt
Path B (assisted): Outbound sales → demo → operator sets up → pilot → $149/mo + $9/appt
```

Path A is for scale (inbound marketing, YouTube, referral links).
Path B is for high-value prospects (targeted outreach, partnerships, higher ARPU).

Both paths use the same backend. The only difference is who fills in the admin panel.

---

## What to Build and When

### Now: Keep Building the Product (Current Plan)
Our Phase 1-7 implementation plan is correct. We need the voice server, n8n workflows, admin panel, dashboard, and billing working before self-serve matters. You can't self-serve into a product that isn't built.

### Month 2-3: Launch with Assisted (Path B)
First 5-10 clients come through outbound sales. Operator does 30-min setup via admin panel. This validates the product works and generates case studies.

### Month 4-6: Build Self-Serve Portal (Path A)
Once the product is proven with 10+ clients:

**Phase 1 (2 weeks):**
- Public signup page with Google Places autocomplete
- Auto-provision Twilio number via API
- Auto-generate system prompt from services checklist
- Test call trigger (Twilio API → call the contractor's phone)
- Stripe Checkout for payment
- Go-live immediately after payment

**Phase 2 (2 weeks):**
- Website scraping → Claude extraction → auto-FAQ generation
- Carrier-specific call forwarding guides
- Auto-verification call for forwarding
- Welcome email sequence (Day 1/3/7)

**Phase 3 (ongoing):**
- Seasonal script templates
- Jobber/Housecall Pro integrations
- In-portal analytics ("Your AI handled 12 calls this week")

---

## The Test Call: Our Killer Feature

The blueprint says this is "the one thing that makes or breaks it." We're already 90% there:

**What we have:**
- ConversationRelay voice agent with business name greeting ✅
- Call briefing cards with structured data ✅
- Twilio phone number provisioning (designed, not auto) ⚠️

**What we need for the auto test call:**
1. After contractor picks voice + confirms greeting in the signup flow
2. System calls their phone via Twilio REST API
3. ConversationRelay connects them to their own AI
4. They hear: "Hi, thanks for calling [Business Name]! Sorry we couldn't get to the phone..."
5. They have a 60-second sample conversation
6. They're sold

**This is ~50 lines of code.** The Twilio `calls.create()` API can initiate an outbound call that connects to our ConversationRelay. We already have the handler.

---

## Impact on Our GTM Strategy

The self-serve portal doesn't replace our outbound sales — it amplifies it.

| Channel | Model | Volume |
|---|---|---|
| Cold outreach (email + phone + FB) | Assisted (Path B) | 1-2 clients/month |
| YouTube / content inbound | **Self-serve (Path A)** | Scales with traffic |
| Referral program | **Self-serve (Path A)** | "Send this link to a friend" |
| Trade association events | Assisted (Path B) | 1-2 clients/event |
| Partner programs (Jobber, supply houses) | **Self-serve (Path A)** | Scales with partnerships |
| Google Ads (once we're ready) | **Self-serve (Path A)** | Scales with spend |

The self-serve portal turns every inbound channel into a conversion machine that doesn't require your time.

---

## Revenue Impact

| Scenario | Manual Only | With Self-Serve |
|---|---|---|
| Month 6 clients | 8-10 | 15-25 |
| Month 12 clients | 20 | 40-60 |
| Month 18 clients | 35 | 80-120 |
| Onboarding time/client | 30 min | 0 min (self-serve) / 10 min (assisted) |
| Revenue ceiling (solo) | ~$10K MRR | **No ceiling** |

The blueprint's target of "50 self-serve clients generating $35K-50K MRR without manual onboarding" is realistic at Month 12-18 IF the portal is built well and inbound channels are producing traffic.

---

## Specific Product Changes Needed

### 1. Public Signup Route
`/signup` — new Next.js page, no auth required. The 7-step wizard.

### 2. Google Places Autocomplete
Use Google Places API (New) for business identification. Auto-populate name, phone, address, hours, website, category.

### 3. Twilio Number Auto-Provisioning
```typescript
// Already have this designed — just needs to be automated
const number = await twilioClient.incomingPhoneNumbers.create({
  areaCode: contractor.areaCode,
  voiceUrl: `${VOICE_SERVER_URL}/twiml/${newNumber}`,
  voiceFallbackUrl: TWILIO_FALLBACK_URL,
});
```

### 4. Test Call Trigger
```typescript
// New endpoint: POST /api/test-call
await twilioClient.calls.create({
  to: contractor.phone,
  from: provisionedNumber,
  twiml: `<Response><Connect><ConversationRelay ...></Connect></Response>`,
});
```

### 5. Trade-Specific Service Templates
Pre-built service checklists for:
- Plumbing: drain cleaning, water heater, pipe repair, sewer, fixture install, emergency
- HVAC: AC repair, furnace repair, installation, maintenance, duct cleaning, emergency

### 6. Self-Serve Client Record Creation
The signup flow creates the same `clients` table record that the admin panel does — just automated. No schema changes needed.

---

## What NOT to Build for Self-Serve (Keep It Simple)

- ❌ Custom voice cloning — too complex, use preset voices
- ❌ Advanced conversation flow editor — use templates + simple customization
- ❌ Multi-location setup — handle in admin panel, not self-serve
- ❌ API integrations wizard — add Jobber/Housecall Pro later
- ❌ Custom hold music — nobody cares at $149/mo

---

## Decision

**Build self-serve portal starting Month 4 (after 10 assisted clients prove the product).**

Until then, the admin panel + operator-assisted onboarding gets us to market faster. The self-serve portal is an accelerator, not a prerequisite.

The blueprint's phased plan aligns perfectly:
- Their Phase 1 (Weeks 1-4) maps to our Month 4-5
- Their Phase 2 (Weeks 5-8) maps to our Month 5-6
- Their Phase 3 (Months 3-6) maps to our Month 6-9
