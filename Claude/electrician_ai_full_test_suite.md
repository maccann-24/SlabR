# ⚡ Electrician AI Voice Assistant Test Suite (Full)

Comprehensive dataset and evaluation framework for an electrician
services AI voice assistant.

------------------------------------------------------------------------

# 📊 CSV Dataset (Sample)

test_id,utterance,intent,urgency,expected_slots,ideal_response_traits
1,"My power just went out in half the house","emergency","P1","location,
panel_status","urgent triage, safety guidance, dispatch" 2,"How much to
install new outlets?","pricing","P4","project_scope","range estimate,
avoid certainty, offer quote" 3,"Can you come tomorrow
morning?","scheduling","P3","availability","offer slots, confirm time"
4,"My breaker keeps tripping","repair","P2","panel_status,
load_details","clarify load, schedule service" 5,"Do you install EV
chargers?","installation","P4","none","confirm service, offer estimate"

------------------------------------------------------------------------

# 🧪 100 Core Utterances

## 🚨 Emergency (P1)

-   I smell burning from an outlet
-   There are sparks coming from a socket
-   My panel is buzzing loudly
-   Power went out after a pop sound
-   Lights are flickering across the house
-   I got shocked touching a switch
-   Wires look exposed in the wall
-   The breaker won't reset at all
-   There's smoke near the panel
-   My generator isn't kicking in

## 🔧 Repair / Issues (P2--P3)

-   Breaker keeps tripping when I use the microwave
-   One room has no power
-   Light switch doesn't work
-   Outlet is loose
-   Lights dim when AC turns on
-   GFCI won't reset
-   Ceiling fan stopped working
-   Doorbell not working
-   Outdoor outlet dead
-   Circuit overloaded

## 🏗 Installation / Upgrades (P3--P4)

-   Install new outlets
-   Add recessed lighting
-   Upgrade electrical panel
-   Install EV charger
-   Add dedicated circuit
-   Install ceiling fan
-   Replace old wiring
-   Install smart switches
-   Add outdoor lighting
-   Wire a new addition

## 💰 Pricing (P4)

-   Cost to upgrade panel?
-   Price per outlet install?
-   Do you charge for diagnostics?
-   Free estimates?
-   Cost for EV charger install?
-   Weekend rates?
-   Rough quote over phone?
-   Cost to rewire a house?
-   Is aluminum wiring upgrade expensive?
-   Service fee?

## 📅 Scheduling (P3)

-   Can you come today?
-   Availability this week?
-   Book next Monday?
-   Earliest opening?
-   Weekend work?
-   Call before arrival?
-   How long does job take?
-   Reschedule appointment?
-   Same-day service?
-   Evening appointments?

## 🔍 Info / Safety (P4)

-   Is this safe to use?
-   What causes breakers to trip?
-   Do I need a panel upgrade?
-   What size panel do I need?
-   Can I DIY this?
-   Are permits required?
-   Is this up to code?
-   Do you work with inspections?
-   How long do installs take?
-   Do you offer warranties?

------------------------------------------------------------------------

# 🎯 Expected AI Behavior

## Core Flow

1.  Acknowledge issue
2.  Identify urgency (electrical safety first)
3.  Ask key clarifying question (panel, circuit, symptoms)
4.  Provide safe guidance (no risky DIY)
5.  Offer dispatch or estimate
6.  Confirm next step

## Example

**User:** My breaker keeps tripping

**Strong Response:** "I can help with that. Breakers trip to protect the
system. Does it happen when a specific appliance is running? I can also
schedule an electrician to take a look."

------------------------------------------------------------------------

# 🧠 Slot Extraction

-   issue_type (outage, tripping, install, upgrade)
-   location (room, whole house)
-   panel_status
-   circuit_details
-   urgency_level (P1--P4)
-   property_type
-   install_vs_repair
-   timeline_preference
-   safety_risk_flag

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

-   Giving unsafe electrical advice
-   Missing emergency signals (burning smell, sparks)
-   Hallucinating pricing
-   Not asking about panel/circuit context
-   Over-diagnosing instead of scheduling
-   Ignoring code/permit considerations

------------------------------------------------------------------------

# 🔬 Stress Testing

-   Noisy input
-   Interruptions
-   Vague descriptions
-   Emotional urgency
-   Mixed intents

------------------------------------------------------------------------

# 🚀 Usage

Use this dataset for: - Intent training - Voice agent QA - Automated
scoring pipelines

This document is designed for real-world electrician AI deployment
testing.
