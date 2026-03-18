# 🐜 Pest Control AI Voice Assistant Test Suite

This document provides a structured dataset and evaluation framework for testing a pest control AI voice assistant. It includes labeled utterances, expected behaviors, scoring rubric, and testing guidance.

---

# 📊 CSV Dataset (Sample)

```csv
test_id,utterance,intent,urgency,expected_slots,ideal_response_traits
1,"I just saw a bunch of rats in my kitchen","emergency","P1","location, pest_type","urgency, reassure, fast dispatch"
2,"I think I have termites","inspection","P2","location, pest_type","clarify signs, schedule inspection"
3,"How much does pest control cost?","pricing","P4","none","range estimate, avoid certainty"
4,"Can you come out tomorrow?","scheduling","P3","availability","offer slots, confirm time"
5,"There are ants everywhere","treatment","P2","location, pest_type","triage severity, schedule"
```

---

# 🧪 Core Pest Control Utterances

## 🚨 Emergency (P1)
- I just saw a rat in my house
- There are multiple mice in my kitchen right now
- I think I have a wasp nest near my door
- There are cockroaches everywhere suddenly
- I got stung and there’s a hive outside
- I hear scratching in my walls at night
- There are bugs all over my bed
- I found termites in my wood beams
- There are fleas biting us constantly
- I think there’s an animal in my attic

## 🔍 Inspection / Concern (P2–P3)
- I think I might have termites
- I saw a few ants but not sure
- There are small bugs in my bathroom
- I noticed droppings in my pantry
- Something is chewing wires
- I hear noises in the ceiling
- I saw one roach yesterday
- There are tiny bugs near windows
- I’m worried about bed bugs
- I saw wings near my window

## 💰 Pricing (P4)
- How much does pest control cost?
- What’s the price for termite treatment?
- Do you charge for inspection?
- Is there a monthly plan?
- How much for rodent removal?
- Do you offer free quotes?
- What’s your service fee?
- Is this covered by warranty?
- Do you charge extra for large infestations?
- How much is ongoing service?

## 📅 Scheduling (P3)
- Can you come today?
- Do you have weekend availability?
- I need someone this afternoon
- Can I book for next week?
- What times are available tomorrow?
- Can you call before arriving?
- How long does treatment take?
- Can I reschedule my appointment?
- Do you offer same-day service?
- What’s your earliest opening?

## 🏠 Treatment / Service (P2–P3)
- I need someone to spray my house
- Can you get rid of ants?
- Do you treat for termites?
- I want preventative pest control
- Can you remove a nest?
- Do you handle rodents?
- I need help with bed bugs
- Can you seal entry points?
- Do you offer recurring service?
- Can you inspect my attic?

---

# 🎯 Expected AI Behavior

## Core Flow
1. Acknowledge concern
2. Identify pest type and urgency
3. Ask clarifying question
4. Offer inspection or treatment
5. Confirm next step

## Example
**User:** I saw a rat in my house

**Strong Response:**
"I’m sorry you’re dealing with that. That definitely needs quick attention. Are you seeing it right now, or was it earlier? I can help schedule someone to come out as soon as possible."

---

# 🧠 Pest Control Slot Extraction

- pest_type (ants, termites, rodents, bed bugs, wasps, etc.)
- issue_type (infestation, sighting, prevention)
- urgency_level (P1–P4)
- property_type
- infestation_severity
- location_in_home
- recurring_issue_flag
- timeline_preference

---

# 🧪 Evaluation Rubric (0–2 each)

## Categories
- Intent Recognition
- Urgency Handling
- Helpfulness
- Information Gathering
- Tone
- Accuracy / Safety
- Efficiency
- Recovery Handling

**Max Score: 16**

---

# 📋 Evaluation Template

## Test Case ID:
## Utterance:
## Expected Intent:
## Expected Priority:
## Assistant Response:

### Scores
- Intent:
- Urgency:
- Helpfulness:
- Info Gathering:
- Tone:
- Safety:
- Efficiency:
- Recovery:

### Notes
- Strengths:
- Weaknesses:
- Improvements:

---

# ⚠️ Pest Control Failure Modes

- Misidentifying pest urgency
- Giving unsafe DIY advice
- Ignoring infestation severity
- Not asking location in home
- Overpromising results
- Not offering follow-up service

---

# 🔬 Stress Testing

Run each case with:
- Background noise
- Interruptions
- Emotional tone (fear/disgust)
- Unclear pest description
- Accent errors

---

# 🚀 Next Steps

Convert into:
- CSV test matrix
- Automated scoring system
- Synthetic conversation flows

This document is designed for real-world pest control AI deployment testing.

