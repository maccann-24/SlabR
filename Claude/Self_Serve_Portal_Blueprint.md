# Self-Serve Onboarding Portal Blueprint
## Getting Plumbers and HVAC Contractors Live in Under 15 Minutes

**ExoSource · March 2026**

---

## The Core Idea

A plumbing or HVAC contractor should be able to go from landing on your signup page to having a live, working AI receptionist answering their business calls — with zero involvement from you. No emails back and forth. No setup calls. No manual configuration. They register, the system builds their AI, they go live.

This is achievable. The technology exists. The challenge is not what to build — it's designing the experience so that a non-technical contractor on a smartphone completes the flow without calling for help.

The single most important design principle: **deliver a test call within the first 3 minutes.** Everything before that moment is friction. The moment a contractor hears their own AI receptionist answer the phone and say *"Thank you for calling [their business name], how can I help you today?"* — that's when they're sold. Everything after is just configuration.

---

## Why Self-Serve Changes the Business

The traditional agency model is a bottleneck. Every new client requires your time: onboarding calls, manual setup, handholding through call forwarding. This caps how many clients you can handle and makes growth a function of your hours, not your marketing.

A self-serve portal inverts this. Growth becomes a function of how many people reach your signup page. You could wake up to five new paying clients who went live overnight while you slept. The portal handles intake, configuration, payment, provisioning, and activation — all automatically.

It also changes what a $149/month price point means. At that price, a manually-onboarded client may not be worth the time investment. With full automation, a $149/month client is pure margin. You can profitably serve clients at a price point your competitors can't match without losing money.

---

## The Seven-Step Onboarding Flow

### Step 1 — Signup and Business Identification
*Target time: 2 minutes*

The contractor enters their name, email, and starts typing their business name. A live autocomplete dropdown appears showing matching businesses pulled from Google's public business data. They tap their business.

The system immediately pulls everything that's publicly available: business name, phone number, address, hours of operation, website URL, and business category. These fields fill in automatically. The contractor sees a pre-populated form and only needs to confirm or make small corrections.

For the roughly one-third of small contractors who don't have a Google Business listing, the form falls back to manual entry with trade-specific dropdowns — service type checkboxes like "drain cleaning," "water heater installation," "AC repair," "furnace service" — rather than blank text fields. This is faster and produces cleaner data.

**What auto-fills:** Business name, phone, address, hours (~60% of contractors have complete hours in Google), website URL.

**What still needs input:** Owner name, preferred AI name, emergency contact number.

---

### Step 2 — AI Auto-Training from Website
*Target time: 30 seconds (runs in the background)*

If a website URL was found in Step 1, the system crawls it automatically while the contractor moves to the next step. It extracts structured information: services offered, service areas, common FAQs, pricing language, company story, and emergency availability.

An AI layer then structures this into 10–30 individual FAQ entries — the knowledge base your AI receptionist will draw from when answering calls. "Do you offer same-day service?" "What areas do you serve?" "How much does a water heater installation cost?" These are answered in the contractor's own language, using information from their own website.

This all happens in the background. By the time the contractor finishes Step 3, their AI already knows their business.

For contractors without a website (about 27% of HVAC businesses and 39% of plumbers), the system generates a solid baseline knowledge base from the Google listing data plus a library of industry-standard plumbing and HVAC FAQ templates. It won't be as personalized, but it's functional on day one.

**Realistic auto-fill rate:** About 50–60% of the AI's knowledge base is populated automatically. The rest is filled in during Step 5.

---

### Step 3 — Voice Selection and Greeting Preview
*Target time: 1 minute*

The contractor picks a voice from a visual menu. Options are presented with names and descriptors ("Sarah — Friendly and Warm," "Alex — Professional and Direct") and short audio samples they can play before choosing.

A greeting is automatically generated using their business name: *"Thank you for calling [Business Name], this is Sarah. How can I help you today?"* The contractor can edit it or accept as-is.

Then — the activation moment: **a live test call fires automatically.** The contractor's phone rings. They pick up and hear their AI receptionist introduce itself and walk through a sample inquiry. This is the moment that converts skeptics. Hearing it work is worth more than any sales copy.

This is currently one of the biggest differentiators available. Most competitors skip this step. The ones that do it (Jobber's AI Receptionist does a preview call during setup) consistently report higher activation and lower early churn.

---

### Step 4 — Phone Number and Call Routing
*Target time: 2 minutes*

The system automatically provisions a local phone number for the contractor's area code. This number is their AI receptionist's line.

Two options are presented clearly:

**Option A — Use the new number as your business number.** The contractor updates their Google listing, website, and business cards with this number. It goes directly to the AI receptionist. Simple, clean, no technical setup required.

**Option B — Forward your existing number to this number.** The contractor keeps their current number and forwards calls to the AI. Two sub-options: always-forward (all calls go to AI first) or conditional-forward (AI picks up only when the contractor doesn't answer after 3–4 rings). Conditional forwarding is recommended — the contractor stays the primary point of contact during business hours, and the AI handles everything they miss.

For Option B, the portal shows carrier-specific visual instructions with the exact steps. A "Verify My Setup" button triggers an automated test — the system calls the contractor's existing business number, and if the AI answers, setup is confirmed with a green checkmark.

**Honest expectation:** About 60–70% of contractors on standard mobile carriers successfully complete conditional forwarding without help. For the rest, an in-portal chat button or "Book a 10-minute setup call" escape hatch prevents abandonment.

---

### Step 5 — Service Configuration and FAQ Review
*Target time: 3–5 minutes*

The auto-generated FAQ entries from Step 2 are displayed as an editable list. The contractor reviews, edits, and adds anything missing.

Pre-built trade-specific templates fill the most common gaps:

**Emergency handling rules.** Keywords like "flooding," "gas smell," "no heat," or "pipe burst" trigger immediate transfer to the contractor's cell phone — bypassing the AI for situations that need a human immediately. The contractor can add their own emergency keywords.

**After-hours behavior.** Does the AI offer emergency dispatch for an additional fee after hours, or does it take a message and promise a morning callback? This is a checkbox, not a configuration file.

**Pricing language.** The AI is pre-configured to respond to pricing questions with: *"We'd need to assess the situation first to give you an accurate quote — can I schedule a technician to take a look?"* The contractor can customize this or keep the default.

**Service area.** The contractor enters their coverage zip codes or describes their area. The AI uses this to qualify callers: *"We currently serve the greater Phoenix area. Are you located within our service area?"*

This is the most important step for call quality — and the one most contractors spend the most time on. Build it to feel like a conversation, not a form. Use progressive disclosure: show the most important settings first, hide advanced options behind "More settings" links.

---

### Step 6 — Calendar Connection and Booking
*Target time: 2 minutes*

The AI receptionist can either schedule appointments directly or collect information and notify the contractor to confirm.

**Direct booking** requires connecting a calendar. A single-click authorization button handles Google Calendar — the most common option for small businesses. The AI gains read access to check availability and write access to create appointments. No technical configuration required.

For contractors using Jobber, a similar one-click connection is offered. The AI can create new leads and requests directly in their existing field service software.

**Notification-based booking** — the simpler fallback — doesn't require any calendar integration. The AI collects the caller's name, number, and requested service, then texts the contractor: *"New appointment request: John Smith, leaky faucet, Tuesday 2pm. Reply YES to confirm or NO to decline."* The contractor responds from their phone. This approach works well for Phase 1 and is actually preferred by some contractors who want to personally vet every booking.

Recommend offering both options and letting the contractor choose. Many will start with notification-based and upgrade to direct booking once they trust the system.

---

### Step 7 — Payment and Go-Live
*Target time: 1 minute*

A clean payment screen collects the setup fee and first month's subscription in a single transaction. Card on file is required, with auto-renewal clearly stated. Annual plan option is offered with an incentive (waived setup fee or reduced monthly rate).

After payment processes, the contractor sees a confirmation screen with:
- Their AI receptionist's phone number
- A summary of what was configured
- A link to their dashboard
- A "Make a test call" button

The AI goes live immediately. No waiting for manual approval or configuration from your end.

A welcome email sequence triggers automatically: Day 1 confirms setup, Day 3 shows their first call stats, Day 7 presents an ROI summary of calls handled.

---

## Auto-Population: What You Can Pull, What You Can't

Understanding the limits of auto-population prevents overpromising to contractors.

| Data Point | Auto-Fill Rate | Source |
|---|---|---|
| Business name | ~95% | Google Business Profile |
| Phone number | ~95% | Google Business Profile |
| Address | ~85% | Google Business Profile |
| Business hours | ~60% | Google Business Profile |
| Website URL | ~61% (plumbers), ~73% (HVAC) | Google Business Profile |
| Services offered | ~50–60% | Website scraping |
| Service area | ~40–50% | Website scraping |
| Emergency protocols | 0% | Always manual |
| Pricing language | 0% | Always manual |
| Booking preferences | 0% | Always manual |

The realistic headline: **about 50–60% of onboarding is completed automatically.** The remaining 40–50% is quick because the portal uses smart defaults, industry templates, and conditional logic to minimize blank-field fatigue.

The most important gap is services. Google's public data returns only business category ("Plumber," "HVAC Contractor") — not the detailed service list the contractor may have added to their profile. Website scraping fills this gap for the majority who have a site with content. For those who don't, the trade-specific checkbox menus in Step 1 provide a clean fallback.

---

## The Biggest Drop-Off Risk: Call Forwarding

Call forwarding is where onboarding flows go to die. There is no technical solution to this — carriers do not expose an API for programmatically enabling forwarding. The contractor must do it manually.

**Design principles to reduce drop-off:**

Make Option A (use the new number directly) the default and the path of least resistance. Lead with it. Many contractors are fine updating their Google listing with a new number. Frame this as an upgrade: *"Most contractors prefer to start fresh with a dedicated AI line — it's cleaner and takes 30 seconds to update your Google listing."*

For Option B (forwarding existing number), reduce friction with carrier detection. Ask the contractor *"Who is your phone carrier?"* and show only the relevant instructions. Four major carriers cover most small businesses. A QR code that auto-dials the forwarding code when scanned from their phone eliminates the need to manually type star codes.

Build verification into the flow. Don't ask the contractor to trust that it worked — prove it. The automated verification call closes the loop and gives them immediate confidence.

**Realistic completion rates for call forwarding:**
- Standard mobile carriers (Verizon, AT&T, T-Mobile): 60–70% self-service success
- VoIP/business phone systems (RingCentral, Nextiva, etc.): lower, requires provider-specific guidance
- Landlines: not recommended for self-serve; offer assisted setup

The escape hatch — "Need help? Book a 10-minute setup call" — should always be visible during this step. Don't let call forwarding be the reason someone abandons a $149/month subscription.

---

## What the Best Competitors Do Well

Understanding what works in the market shapes what you should build.

**Rosie AI** sets the standard for auto-training. They scan the contractor's website in about 30 seconds and auto-populate the AI's knowledge base with services, hours, FAQs, and business details. Contractors report that setup literally takes minutes. Their weakness is no test call during onboarding and no native CRM integrations — everything connects through third-party automation tools.

**Jobber's AI Receptionist** is the gold standard for onboarding experience. Because it lives inside Jobber, it pre-populates everything from existing company data — zero data entry required. They offer a live preview call during setup ("Click Play preview to have your Receptionist call your number") and have processed over 200,000 conversations. Their weakness is the requirement to already be a Jobber customer and the lack of customization depth.

**Goodcall** has the fastest account creation but weak onboarding guidance. Users consistently report confusion about how to configure the AI for their specific business and difficulty getting help when stuck.

**Smith.ai** achieves the highest satisfaction scores through human-assisted onboarding — dedicated specialists walk every client through setup. This is the benchmark for quality but not for scale.

**The gap your portal fills:** Rosie's auto-training depth + Jobber's test call activation + Smith.ai's guided experience — packaged as a fully self-serve flow that doesn't require existing software, a specialist's time, or a Jobber subscription.

---

## Onboarding Completion: Benchmarks and Targets

The industry numbers are sobering. Average SaaS onboarding completion is just **19.2%** — meaning most people who start a signup flow never finish it. The median is even lower, around 10%. The biggest drop-off happens after the first screen: **38% of users abandon immediately** if the first step feels like too much work.

Products that survive this with strong completion rates share three characteristics:

1. **Fast time to first value.** The test call in Step 3 is your answer to this. The contractor hears the AI working before they've finished setup. The activation moment arrives early.

2. **Auto-population that removes blank-field anxiety.** A form that's already 60% filled in feels approachable. A blank form feels like homework.

3. **Trade-specific language throughout.** *"drain cleaning"* and *"service area"* feel native to a plumber. *"knowledge base configuration"* and *"webhook endpoint"* do not.

**Realistic targets for your portal:**
- Overall completion (signup to live): 35–45%
- Time to first test call: under 3 minutes
- Time to full setup: under 15 minutes
- Activation within 24 hours (first real call handled): 70%+ of completions

A hybrid support model — self-serve primary with an escape hatch to a 10-minute setup call — achieves **73% satisfaction** versus 41% for digital-only. Don't remove the human option. Make it available but not the default path.

---

## Phased Launch Plan

### Phase 1 — Launch (Weeks 1–4)
Get to market fast with a functional but minimal portal.

The flow covers: business identification with Google auto-fill → voice selection and test call → phone number provisioning → basic service configuration using templates → payment → go-live with SMS-based booking notifications (no calendar integration required).

**What you skip for now:** Website scraping for auto-training (use templates instead), calendar OAuth integration, call forwarding verification automation, advanced FAQ customization.

**Target:** First paying self-serve client within 30 days of portal launch.

---

### Phase 2 — Optimize (Weeks 5–8)
Add the features that increase completion rate and activation quality.

- Website auto-scraping for AI knowledge base training
- Google Calendar OAuth integration for direct booking
- Automated call forwarding verification (test call confirms forwarding works)
- Carrier-specific forwarding guides with QR codes
- In-portal progress tracking ("Your AI has answered 12 calls this week")
- Welcome email sequence with Day 1/3/7 touchpoints

**Target:** Onboarding completion rate above 40%.

---

### Phase 3 — Scale (Months 3–6)
Build the features that increase ARPU and reduce churn.

- Jobber and Housecall Pro integrations for direct job creation
- Metered per-appointment billing that auto-charges monthly
- Seasonal AI script templates (AC tune-up reminders, winter freeze prep)
- Emergency escalation rule library with common trigger phrases
- Mobile-optimized dashboard showing calls handled, appointments booked, estimated revenue captured
- Referral program built into the portal: *"Refer another contractor and get one month free"*

**Target:** 50 self-serve clients generating $35,000–50,000 MRR without any manual onboarding effort.

---

## The Economics of Self-Serve

The traditional onboarding model caps you. Every hour spent onboarding a $149/month client is an hour not spent closing higher-ARPU clients or building the business. At any meaningful scale, manual onboarding becomes the constraint on growth.

The self-serve portal removes the constraint. Consider the math:

| Model | Onboarding time per client | Clients you can onboard per week | Revenue ceiling (1 person) |
|---|---|---|---|
| Manual | 2–3 hours | 5–8 | ~$10,000 MRR |
| Assisted (optional call) | 30 min | 15–20 | ~$25,000 MRR |
| **Fully self-serve** | **0 hours** | **Unlimited** | **No ceiling** |

The portal also changes your marketing economics. With manual onboarding, a cold outreach campaign that generates 50 trial signups creates 50 individual tasks. With a self-serve portal, those 50 signups become 50 automated onboarding sequences. You wake up the next morning to activation data, not a to-do list.

The goal isn't to eliminate human contact entirely — some clients will still want a setup call, and high-value clients deserve white-glove treatment. The goal is to make self-serve the default path so that your time and attention scales to where they create the most value.

---

## The One Thing That Makes or Breaks This

Everything in this blueprint is buildable. The onboarding flow, the auto-population, the payment handling, the phone provisioning — all of it is standard engineering work with off-the-shelf components.

The one thing that determines whether contractors complete the flow or abandon it is **the test call in Step 3**.

When a plumber hears their AI receptionist say *"Thank you for calling Mike's Plumbing, this is Sarah. Are you calling about an emergency or would you like to schedule a service?"* — in a natural voice, with their actual business name, before they've even entered their credit card — you've already won.

Everything else is paperwork.

Build the test call first. If it works and it sounds good, the rest of the flow is just details.

---

*ExoSource · March 2026 · Confidential*
