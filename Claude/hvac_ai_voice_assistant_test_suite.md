# ❄️ HVAC AI Voice Assistant Test Suite

This document provides a structured dataset and evaluation framework for testing an HVAC AI voice assistant. It includes labeled utterances, expected behaviors, scoring rubric, and testing guidance.

---

# 📊 CSV Dataset (Sample)

```csv
test_id,utterance,intent,urgency,expected_slots,ideal_response_traits
1,"My AC just stopped working and it's 95 degrees","emergency","P1","location, system_type","urgency, fast triage, offer dispatch"
2,"My heater isn't turning on","repair","P2","location, system_type","diagnostic questions, schedule service"
3,"How much does it cost to replace an AC unit?","pricing","P4","none","range estimate, avoid certainty, offer inspection"
4,"Can you come out tomorrow morning?","scheduling","P3","availability","offer slots, confirm time"
5,"My thermostat isn't working","repair","P3","system_type","clarify issue, troubleshoot"
```

---

# 🧪 Core HVAC Utterances

## 🚨 Emergency (P1)
- My AC just died and it’s extremely hot inside
- There’s smoke coming from my HVAC unit
- My furnace smells like gas
- My system is making a loud banging noise
- The AC unit outside is sparking
- My heater is overheating
- There’s no airflow at all
- My AC stopped and I have pets at home
- The breaker keeps tripping when AC runs
- I think something is burning in my vents

## 🔧 Repair (P2–P3)
- My AC is running but not cooling
- The heater is blowing cold air
- My thermostat is blank
- The airflow is really weak
- My vents aren’t blowing evenly
- The unit turns on and off constantly
- It’s making a rattling noise
- My upstairs is hot but downstairs is fine
- The fan keeps running nonstop
- My system won’t turn off

## 💰 Pricing (P4)
- How much does an AC repair cost?
- What’s the price to replace a furnace?
- Do you charge for diagnostics?
- Is it expensive to recharge refrigerant?
- How much is a new HVAC system?
- Do you offer free estimates?
- What’s your service fee?
- Is repair cheaper than replacement?
- Do you charge extra on weekends?
- What’s the cost for maintenance?

## 📅 Scheduling (P3)
- Can you come today?
- Do you have weekend availability?
- I need someone this afternoon
- Can I book for next week?
- What times are available tomorrow?
- Can you call before arriving?
- How long does service take?
- Can I reschedule my appointment?
- Do you offer same-day service?
- What’s your earliest opening?

## 🏗 Installation (P3–P4)
- I want to replace my AC unit
- Do you install heat pumps?
- Can you upgrade my system?
- I’m building a new home, can you help?
- Do you install ductwork?
- Can you install a smart thermostat?
- I want a more energy-efficient system
- Can you convert to central air?
- Do you install mini splits?
- Can you replace my furnace?

---

# 🎯 Expected AI Behavior

## Core Flow
1. Acknowledge issue
2. Identify urgency
3. Ask key HVAC-specific question
4. Offer next step
5. Confirm action

## Example
**User:** My AC is running but not cooling

**Strong Response:**
- Acknowledge
- Ask airflow or thermostat question
- Offer scheduling

"I can help with that. Are you still getting airflow, or does it feel weak? I can also help schedule a technician to take a look."

---

# 🧠 HVAC Slot Extraction

- system_type (AC, furnace, heat pump, mini split)
- issue_type (cooling, heating, airflow, noise, smell)
- urgency_level (P1–P4)
- property_type
- thermostat_type
- install_vs_repair
- timeline_preference
- repeat_customer_flag

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

# ⚠️ HVAC Failure Modes

- Unsafe advice (gas/electrical)
- Misclassifying urgency (heat/cold extremes)
- Hallucinating pricing
- Not identifying system type
- Over-diagnosing vs scheduling
- Ignoring thermostat issues

---

# 🔬 Stress Testing

Run each case with:
- Background noise
- Interruptions
- Filler words
- Emotional tone
- Accent errors

---

# 🚀 Next Steps

Convert this into:
- CSV test matrix
- Automated scoring pipeline
- Synthetic conversation dataset

This document is designed for real-world HVAC AI deployment testing.

