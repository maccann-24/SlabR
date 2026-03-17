# ServiceLine AI — Go-To-Market Strategy

**Based on:** ExoSource AI Agency Playbook (March 2026) cross-referenced against our current product spec and build.

---

## Gap Analysis: Our Current Model vs. Playbook Recommendations

### Pricing — NEEDS ADJUSTMENT

| Playbook Says | Our Current Model | Gap | Action |
|---|---|---|---|
| Base $149/mo + $7-12/booked appointment | Flat $199/mo (Starter) + $499/mo (Pro) | We're flat-rate — no variable component tied to value delivered | **Restructure pricing** |
| Setup $249-399 (waive on annual) | $500 setup | Our setup is high vs. competitors | **Lower to $299, waive on annual** |
| Month-to-month, no mandatory annual | Month-to-month ✅ | Aligned | None |
| Auto-pay card on file | Stripe ✅ | Aligned | None |
| 7-14 day free trial, no CC required | 14-day pilot + $1K guarantee ✅ | Our pilot is STRONGER than playbook recommends | None — keep this |

**Pricing restructure:**

| Component | New Price | Rationale |
|---|---|---|
| Setup fee | $299 one-time (waived on annual) | Competitive vs. $0-199 market; lower barrier than our $500 |
| Monthly base | $149/mo | Platform access, AI call handling, dashboard. Matches playbook exactly. |
| Per booked appointment | $9/each | Variable revenue tied to value. Trackable in our system. Familiar to contractors from Angi/Thumbtack per-lead model. |
| GEO/SEO add-on | $199/mo | Keeps our differentiator but doesn't inflate the base |

**Revenue math at $149 + $9/appointment:**

| Client Size | AI Bookings/Month | Monthly Total | Annual |
|---|---|---|---|
| Solo operator | ~10 | $149 + $90 = **$239** | $2,868 |
| 3-5 tech shop | ~25 | $149 + $225 = **$374** | $4,488 |
| 8+ tech shop | ~50 | $149 + $450 = **$599** | $7,188 |
| + GEO/SEO | any | + $199 = **$438-798** | $5,256-9,576 |

This is better than our flat model because:
1. Solo operators can start at $239/mo (vs. our $199 that felt cheap or $499 that felt expensive)
2. Revenue scales automatically with value delivered
3. Per-appointment fee is transparent and dispute-resistant (the AI either booked it or didn't)
4. ROI is visible: at $300 avg job value, 25 bookings = $7,500 revenue for $374 cost = **20:1 ROI**

### Land-and-Expand — WE'RE ALIGNED BUT NEED STAGES

The playbook's 5-stage expansion model matches our product roadmap:

| Playbook Stage | Our Product | Status |
|---|---|---|
| Stage 1: AI Receptionist | Voice agent + text-back + drip + dashboard | **BUILDING NOW** |
| Stage 2: Website + GBP | Not in our plan | **GAP — add to roadmap** |
| Stage 3: Reputation/Reviews | Review harvesting + monitoring | **IN SPEC** |
| Stage 4: Google Ads/LSA | Not in our plan | **GAP — Phase 2 add** |
| Stage 5: SEO/Content | GEO/SEO automation | **IN SPEC** |

**Key insight from playbook:** "Treat AI as a wedge, not a product." Our AI receptionist is the door opener, but the real business is the full-stack relationship at $1,200-1,500/mo ARPU. We need to plan stages 2 and 4 into our roadmap even if we don't build them immediately.

### Target Client Profile — NEEDS TIGHTENING

| Playbook Says | Our Current Approach | Action |
|---|---|---|
| Target $1M+ annual revenue | No revenue qualification | **Add qualification criteria** |
| 20-100 Google reviews = sweet spot | No qualification beyond "HVAC/plumbing" | **Use review count as proxy** |
| Pre-qualify: marketing budget, answers phone, solid reviews, can handle more business | We take anyone who wants a pilot | **Add intake qualification** |
| Decline underqualified prospects | No qualification gate | **Build a scoring system** |

### Client Acquisition — NEEDS A PLAN

The playbook lays out a specific sequence we should follow:

**Month 1-2 (Cold outreach — get first 2-3 clients):**
1. Build prospect list: scrape Google Maps by ZIP for target metros, filter 15+ reviews / 3.5+ stars
2. 14-day multi-channel outreach sequence (email → phone → Facebook → Loom audit)
3. Demo: set up a live line branded with their business name, have them call it
4. Mystery shop: call their business at 7 PM, document the voicemail, present alongside demo
5. Free 14-day pilot (our existing model — stronger than playbook's)

**Month 3-6 (Build inbound engine):**
1. Case study from first 2-3 clients with specific dollar amounts
2. YouTube content: "How Much Money Are HVAC Companies Losing to Missed Calls?" (1-2 videos/week)
3. Facebook groups: HVAC Business Owners, Field Service Business Owners — answer questions, share insights
4. Referral program: $200 account credit per referral, ask at 30-60 day mark via SMS

**Month 6-12 (Compound growth):**
1. Trade association networking (PHCC, ACCA local chapters — $500-2K/year)
2. Supply house partnerships (Ferguson, Winsupply branch managers)
3. FSM software partner programs (Jobber: $300/referral, Housecall Pro: $1K/referral)
4. YouTube + inbound content generating warm leads

### Failure Prevention — CRITICAL ADDITIONS

The playbook identifies 7 failure modes. Here's our exposure:

| Failure Mode | Our Risk Level | Mitigation Needed |
|---|---|---|
| Cash flow death | LOW — auto-pay via Stripe ✅ | Lower setup fee reduces upfront friction |
| Acquisition neglect | HIGH — no outreach plan | **Block 15-20% weekly capacity for outreach** |
| Invisible ROI | LOW — Revenue Rescued dashboard ✅ | Weekly brief SMS (already planned) |
| Founder bottleneck | HIGH — solo operator | **Document SOPs from day 1** |
| Scope creep | MEDIUM | **Tiered packages with explicit deliverables** |
| Generalist trap | LOW — HVAC/plumbing only ✅ | Decline non-niche prospects |
| Wrong client size | HIGH — no qualification | **$1M+ revenue, 20+ reviews minimum** |

### AI-Specific Risks — WELL COVERED

| Risk | Playbook Says | Our Implementation |
|---|---|---|
| Hallucination/errors | Human escalation after one failed attempt | ✅ Auto-escalate after 2 failed comprehension attempts |
| AI loops trapping callers | Always offer human path | ✅ "Let me have the owner call you right back" |
| Position as supplement not replacement | "After-hours and overflow receptionist" | ✅ TwiML rings real phone first, AI is fallback |
| Win in first 5 days | GBP optimization, call tracking live | ✅ Revenue Rescued dashboard shows value immediately |
| Monitor AI daily for first 30 days | Daily interaction review | ⚠️ Need to add: admin panel call log review workflow |

---

## The Go-To-Market Plan

### Phase 0: Pre-Launch (Week 1-2 — NOW)

**Pricing update:**
- [ ] Update spec: $149/mo base + $9/booked appointment + $199/mo GEO add-on
- [ ] Update Stripe products
- [ ] Setup fee: $299 (waive on annual)
- [ ] Add per-appointment tracking to Revenue Rescued dashboard

**Prospect list build ($100-200 budget):**
- [ ] Pick 2-3 target metros (start local if possible)
- [ ] Scrape Google Maps by ZIP code: plumbers + HVAC contractors
- [ ] First-pass filter: 15+ reviews, 3.5+ stars, has website, not franchise
- [ ] Enrich with owner names + emails (state licensing boards, LinkedIn)
- [ ] Deep qualify: check for Google Ads, review velocity, GBP activity
- [ ] Target: 200-500 qualified prospects

**Sales assets:**
- [ ] Demo phone line: one pre-configured Twilio number branded as a generic HVAC company ("Southwest Heating & Cooling") for live demos
- [ ] 60-second Loom template: how to audit a prospect's GBP
- [ ] One-page PDF: "What Missed Calls Are Costing Your Plumbing Business" with the $45K-120K/year stat
- [ ] Case study template (ready to fill after first pilot)

**Client qualification scorecard:**

| Criteria | Points | Notes |
|---|---|---|
| 20+ Google reviews | 3 | Sweet spot |
| Currently running Google Ads | 2 | Has marketing budget |
| Active GBP with recent posts | 2 | Digitally engaged |
| In operation 3+ years | 1 | Established |
| Multiple service lines | 1 | Higher ticket |
| **Minimum score to pursue** | **5** | |

### Phase 1: First Clients (Month 1-2)

**Daily outreach cadence (15-20% of your time):**
- 25-50 cold calls/day (7:00-7:45 AM window)
- 50-75 cold emails/day (arrive 6-7 AM)
- 5-10 Facebook DMs/day (engage posts first, DM after 2-3 interactions)

**14-day multi-channel sequence per prospect:**

| Day | Channel | Action |
|---|---|---|
| 1 | Email | "[Business Name] — quick question about your after-hours calls" |
| 2 | Phone | 7 AM call. VM: "Hey [name], [your name] here. Got something I think could help — I'll try you later this week." |
| 3 | Facebook | Friend request or follow + like recent post |
| 5 | Email | Mini case study: "Helped a plumber in [city] capture 12 after-hours calls in week one" |
| 7 | Phone | 4-5 PM. Reference case study. |
| 9 | Email | **Loom video** — 60-second audit of their GBP or website. Point out specific fixable issues. |
| 11 | Facebook | Comment on a recent post. Soft DM. |
| 13 | Phone | "I'm the one who sent you that Google listing video..." |
| 14 | Email | **Breakup:** "Timing isn't right — no worries. Here's a free guide. If things change, I'm here." |

**The demo that converts:**
1. Before the call: set up their business name on a Twilio number (30 min)
2. On the call: "I set something up for you — call this number right now"
3. They hear: "Hi, thanks for calling [Their Business Name]! Sorry we couldn't get to the phone..."
4. They experience the AI booking an appointment in real time
5. Close: "That's what your customers hear instead of voicemail. Want to try it for 14 days free?"

**Mystery shop angle:**
1. Call their business at 7 PM on a Tuesday
2. Document: voicemail? Ring out? Generic answering service?
3. Send recording + your AI demo recording side by side
4. "This is what your customers hear at 7 PM. This is what they could hear."

**Goal: 2-3 pilot clients by end of Month 2**

### Phase 2: Prove and Document (Month 2-4)

**With first pilots running:**
- [ ] Monitor AI interactions daily for first 30 days (admin panel call log)
- [ ] Send weekly Revenue Rescued SMS: "Your AI handled X calls, booked Y appointments, rescued ~$Z this week"
- [ ] At day 10: present ROI report
- [ ] At day 13: "Your AI goes offline tomorrow. You captured $X this week."
- [ ] Convert pilots to paid ($149/mo + $9/appointment)

**Document everything:**
- [ ] First case study with specific numbers: "Mike's Plumbing: 23 calls captured, 8 appointments booked, $3,200 in rescued revenue — first two weeks"
- [ ] Screenshot Revenue Rescued dashboard (this IS the sales tool)
- [ ] Get Google review from happy client
- [ ] Get 60-second video testimonial (phone quality is fine)

**Start inbound engine:**
- [ ] YouTube channel: first 4-8 videos
  - "How Much Money Are Plumbers Losing to Missed Calls?"
  - "I Built an AI That Answers Phones for HVAC Companies"
  - "What Happens When You Call a Plumber at 7 PM (I Called 50)"
  - "Revenue Rescued: How One Plumber Found $4,000/Month He Was Losing"
- [ ] Facebook: join 3-5 groups, start answering questions about marketing
- [ ] Referral program: $200 credit per referral, ask via SMS at 30-60 day mark

### Phase 3: Scale to 10 Clients (Month 4-8)

**Continue daily outreach** (never stop):
- Cold outreach generates 1-2 new clients/month
- Case studies make each subsequent pitch easier
- Mystery shop + live demo + case study = very high close rate

**Activate partnership channels:**
- [ ] PHCC local chapter membership ($500-2K/year)
- [ ] Contact 2-3 Ferguson/Winsupply branch managers: "We help your contractor customers grow — more business for them = more purchases from you"
- [ ] Apply to Jobber partner program ($300/referral) and Housecall Pro ($1K/referral)

**Begin land-and-expand with existing clients:**
- [ ] At 60-day mark: "Your AI is working great. Want to make your Google listing match? I can optimize your GBP this week."
- [ ] Offer review management add-on ($149/mo) to clients with low review counts
- [ ] GEO/SEO add-on ($199/mo) to clients who want more calls

**Target: 10 clients, $3,500-5,000 MRR**

### Phase 4: Compound Growth (Month 8-18)

**At 10+ clients:**
- YouTube + content generating warm inbound leads
- Referrals generating 1-2 leads/month
- Trade association speaking opportunities
- Consider first hire: delivery specialist or VA

**Expand service tiers:**
- Stage 2: Website + GBP optimization ($199-399/mo)
- Stage 4: Google Ads management ($500-1,500/mo + ad spend)
- Blended ARPU climbing toward $700-1,000/mo

**Target: 25 clients, $15,000-25,000 MRR by Month 18**

---

## What to Change in Our Product RIGHT NOW

### 1. Add Per-Appointment Tracking

We already track appointments in the `appointments` table. We need:
- A monthly count of AI-booked appointments per client
- This count drives the per-appointment billing ($9/each)
- Display on Revenue Rescued dashboard: "Appointments booked: 23 × $9 = $207 performance fee"
- Stripe usage-based billing integration

### 2. Add a Demo Mode

For sales demos, we need the ability to:
- Spin up a temporary Twilio number branded with a prospect's business name
- Configure it in 5 minutes via the admin panel
- Have the prospect call it and experience the AI live
- Auto-expire after 48 hours

### 3. Add Weekly Brief SMS

Automated weekly SMS to the client (not just the owner — the decision-maker):
- "Your AI handled X calls this week. Booked Y appointments. ~$Z in rescued revenue. View dashboard: [link]"
- Sent every Monday at 8 AM
- This is the #1 retention tool — agencies that report meaningful metrics retain 40% longer

### 4. Qualification Scoring in Admin Panel

Add to client onboarding form:
- Google review count
- Years in operation
- Estimated annual revenue
- Currently running ads? (Y/N)
- Score: auto-calculated, minimum 5 to proceed

---

## Financial Projections

### Year 1 (Conservative)

| Month | Clients | Avg Monthly Rev/Client | MRR | Cumulative Setup Fees |
|---|---|---|---|---|
| 2 | 2 | $250 | $500 | $598 |
| 4 | 5 | $300 | $1,500 | $1,495 |
| 6 | 8 | $350 | $2,800 | $2,392 |
| 8 | 12 | $400 | $4,800 | $3,588 |
| 10 | 16 | $450 | $7,200 | $4,784 |
| 12 | 20 | $500 | $10,000 | $5,980 |

**Year 1 total revenue: ~$55,000-70,000**
**Costs: ~$30-40/mo infrastructure + $10/client/mo variable**

### Year 2

| Month | Clients | Blended ARPU | MRR |
|---|---|---|---|
| 15 | 28 | $700 | $19,600 |
| 18 | 35 | $900 | $31,500 |
| 24 | 50 | $1,200 | $60,000 |

**Year 2 total revenue: ~$300,000-400,000**

---

## The Three Decisions (from Playbook)

1. **AI is the wedge, not the product.** Our AI receptionist gets us in the door. The real business is the full-stack relationship. Plan the expansion stages even if we build them later.

2. **Be ruthless about client quality.** Minimum $1M revenue, 20+ Google reviews. One $400/mo client who stays 3 years is worth more than eight $250/mo clients who churn in 3 months.

3. **Never stop outreach.** Block 15-20% of every week for prospecting. The pipeline dries up 60-90 days after outreach stops.

---

## Immediate Next Steps

1. **Restructure pricing** in the spec: $149/mo + $9/appointment + $299 setup
2. **Build prospect list** for 2-3 target metros (you can start this TODAY)
3. **Set up demo phone line** (one Twilio number for live demos)
4. **Write 3 cold email templates** using the playbook's missed-call pain messaging
5. **Continue building Phase 2** of the product (we need the dashboard operational for demos)
6. **Start YouTube channel** — first video: "I Built an AI That Answers Phones for Plumbers"
