# 🎨 Painting AI Voice Assistant Test Suite (Full)

Comprehensive dataset and evaluation framework for a painting services
AI voice assistant.

------------------------------------------------------------------------

# 📊 CSV Dataset (Expanded Sample)

test_id,utterance,intent,urgency,expected_slots,ideal_response_traits
1,"I need my living room painted","service_request","P3","project_area,
interior_exterior","confirm scope, schedule estimate" 2,"How much to
paint a 3-bedroom house?","pricing","P4","project_size,
interior_exterior","range estimate, avoid certainty" 3,"Can you come
this week for a quote?","scheduling","P3","availability","offer slots,
confirm time" 4,"Exterior paint is peeling
badly","repair","P2","surface_condition","triage severity, schedule
inspection" 5,"Do you paint cabinets and
trim?","info","P4","none","confirm services, upsell bundle"

------------------------------------------------------------------------

# 🧪 100 Core Utterances

## 🚨 Urgent / Time-Sensitive (P1--P2)

-   I need this painted before move-in this weekend
-   HOA deadline---need exterior painted ASAP
-   Paint is peeling and wood is exposed
-   Water damage stains on ceiling need fixing now
-   Listing my house---need painting fast
-   Tenants moving in next week, unit needs paint
-   Paint is bubbling everywhere
-   Mold-looking spots under paint
-   Emergency touch-ups before inspection
-   Exterior trim cracking badly

## 🏠 Service Requests (P3)

-   Paint my bedroom
-   Paint entire house interior
-   Paint kitchen and bathroom
-   Repaint cabinets
-   Accent wall only
-   Paint trim and baseboards
-   Exterior painting
-   Paint fence/deck
-   Garage repaint
-   Turnover repaint between tenants

## 💰 Pricing (P4)

-   Cost to paint a room?
-   Price per square foot?
-   Cabinet painting cost?
-   Free estimates?
-   If I supply paint is it cheaper?
-   Exterior painting cost?
-   Extra for prep?
-   Remove wallpaper + paint cost?
-   Rough quote over phone?
-   Package pricing?

## 📅 Scheduling (P3)

-   Estimate tomorrow?
-   Availability this week?
-   Done before end of month?
-   Book next Friday?
-   Earliest opening?
-   Weekend work?
-   Call before arrival?
-   How long does job take?
-   Reschedule appointment?
-   Same-day estimates?

## 🎨 Preferences / Details (P4)

-   Help choosing colors?
-   Do you match existing paint?
-   Low-VOC paints?
-   Safe for pets/kids?
-   What brands do you use?
-   Matte vs satin?
-   Primer included?
-   Surface prep included?
-   Do you cover furniture?
-   Cleanup included?

------------------------------------------------------------------------

# 🎯 Expected AI Behavior

## Core Flow

1.  Acknowledge request
2.  Identify scope (room, house, cabinets, exterior)
3.  Ask key clarifier (size, surfaces, timeline)
4.  Offer estimate or scheduling
5.  Confirm next step

------------------------------------------------------------------------

# 🧠 Slot Extraction

-   project_area (room, house, cabinets, exterior)
-   project_size (sq ft, rooms)
-   interior_exterior
-   surface_condition (peeling, damaged)
-   paint_type (if specified)
-   timeline_preference
-   budget_range
-   occupancy_status (occupied/vacant)

------------------------------------------------------------------------

# 🧪 Evaluation Rubric (0--2 each)

-   Intent Recognition
-   Urgency Handling
-   Helpfulness
-   Information Gathering
-   Tone
-   Accuracy / Safety
-   Efficiency
-   Recovery Handling

Max Score: 16

------------------------------------------------------------------------

# 📋 Evaluation Template

Test Case ID: Utterance: Expected Intent: Expected Priority: Assistant
Response:

Scores: - Intent: - Urgency: - Helpfulness: - Info Gathering: - Tone: -
Safety: - Efficiency: - Recovery:

Notes: - Strengths: - Weaknesses: - Improvements:

------------------------------------------------------------------------

# ⚠️ Failure Modes

-   Overpromising timelines
-   Hallucinating pricing
-   Not clarifying project scope
-   Ignoring prep work needs
-   Missing urgency (move-in deadlines)
-   Not offering estimate scheduling

------------------------------------------------------------------------

# 🔬 Stress Testing

-   Noisy input
-   Interruptions
-   Vague descriptions
-   Emotional tone
-   Mixed intents (price + schedule)

------------------------------------------------------------------------

# 🚀 Usage

Use this dataset for: - Intent training - Voice agent QA - Automated
scoring pipelines
