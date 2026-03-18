# 🌱 Lawn Care AI Voice Assistant Test Suite

This document provides a structured dataset and evaluation framework for testing a lawn care AI voice assistant. It includes labeled utterances, expected behaviors, scoring rubric, and testing guidance.

---

# 📊 CSV Dataset (Sample)

```csv
test_id,utterance,intent,urgency,expected_slots,ideal_response_traits
1,"My grass is dying and turning brown","diagnosis","P2","location, lawn_size","clarify symptoms, suggest visit"
2,"How much do you charge for mowing?","pricing","P4","lawn_size","range estimate, avoid certainty"
3,"Can you come this week?","scheduling","P3","availability","offer slots, confirm time"
4,"I need weeds removed from my yard","service_request","P3","lawn_size, issue_type","confirm service, schedule"
5,"Do you do fertilization treatments?","info","P4","none","confirm service, upsell plan"
```

---

# 🧪 Core Lawn Care Utterances

## 🚨 Urgent (P1–P2)
- My entire lawn is turning brown quickly
- There are patches dying everywhere
- I think I have a fungus spreading
- Bugs are destroying my grass
- My lawn looks dead after treatment
- There are bare spots forming fast
- Something is eating my grass overnight
- My irrigation system stopped working
- My yard is flooding
- My lawn is completely dried out

## 🌿 Service Requests (P3)
- I need my lawn mowed
- Can you edge and trim my yard?
- I want weed control
- Can you aerate my lawn?
- Do you offer overseeding?
- I need seasonal cleanup
- Can you install sod?
- Do you handle landscaping too?
- I need help with lawn maintenance
- Can you fix patchy areas?

## 💰 Pricing (P4)
- How much is lawn mowing?
- What do you charge for fertilization?
- Is weed control expensive?
- Do you offer packages?
- How much for full lawn service?
- Do you charge per visit?
- Is there a monthly plan?
- How much for aeration?
- What’s the cost for sod installation?
- Do you give free quotes?

## 📅 Scheduling (P3)
- Can you come tomorrow?
- Do you have availability this week?
- I need recurring service
- Can I set up weekly mowing?
- What days do you service my area?
- Can you come in the morning?
- Do you offer same-day service?
- Can I reschedule?
- What’s your earliest opening?
- Can you call before arriving?

## 🌼 General / Info (P4)
- Why is my grass turning yellow?
- How often should I water my lawn?
- What fertilizer should I use?
- How do I get rid of weeds?
- What’s the best time to mow?
- Do you offer organic treatments?
- Can you help with lawn design?
- How long does treatment take?
- Is this safe for pets?
- How often should I service my lawn?

---

# 🎯 Expected AI Behavior

## Core Flow
1. Acknowledge request or issue
2. Identify service type or problem
3. Ask lawn-specific clarifying question
4. Offer service or recommendation
5. Confirm next step

## Example
**User:** My grass is turning brown

**Strong Response:**
"I can help with that. Brown patches can come from a few causes. Are you seeing dry areas, or does it look like something is spreading? I can also schedule a lawn assessment if you'd like."

---

# 🧠 Lawn Care Slot Extraction

- lawn_size (small, medium, large, acreage)
- service_type (mowing, fertilization, weed control, etc.)
- issue_type (discoloration, pests, dryness, fungus)
- urgency_level (P1–P4)
- irrigation_status
- pet_presence_flag
- recurring_service_flag
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

# ⚠️ Lawn Care Failure Modes

- Misdiagnosing lawn issues
- Overpromising results
- Ignoring lawn size or conditions
- Giving unsafe chemical advice
- Not asking about irrigation or pets
- Failing to suggest recurring service

---

# 🔬 Stress Testing

Run each case with:
- Background noise
- Vague descriptions
- Seasonal confusion
- Emotional frustration
- Accent or transcription errors

---

# 🚀 Next Steps

Convert into:
- CSV test matrix
- Automated scoring system
- Seasonal scenario testing (spring vs summer vs fall)

This document is designed for real-world lawn care AI deployment testing.

