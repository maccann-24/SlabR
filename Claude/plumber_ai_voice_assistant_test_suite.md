# 🧪 Plumber AI Voice Assistant Test Suite

This document contains 100 realistic customer utterances to test an AI voice assistant for plumbing services. These cover emergencies, common issues, pricing questions, scheduling, and ambiguous or emotional interactions.

---

## 🚨 Emergencies / Urgent
1. My pipe just burst—can someone come right now?
2. There’s water leaking everywhere in my basement!
3. My toilet is overflowing, what do I do??
4. I think I have a gas leak near my water heater
5. My sink won’t stop running
6. There’s no water at all in my house
7. My water heater just exploded or something
8. The ceiling is dripping water fast
9. I smell sewage in my house
10. My drain is backing up into the tub

---

## 🚿 Common Issues
11. My sink is clogged
12. My toilet won’t flush properly
13. The shower pressure is really low
14. My faucet keeps dripping
15. The garbage disposal isn’t working
16. My bathtub is draining super slowly
17. There’s a weird noise coming from my pipes
18. My dishwasher isn’t draining
19. The water smells weird
20. My toilet keeps running nonstop

---

## 💰 Pricing & Estimates
21. How much do you charge to fix a leak?
22. Can you give me a rough estimate over the phone?
23. What’s your hourly rate?
24. Is there a service call fee?
25. How much does it cost to replace a water heater?
26. Do you offer free estimates?
27. Is it cheaper to repair or replace this?
28. Can you price match another plumber?
29. Do you charge extra for weekends?
30. What’s the typical cost for unclogging a drain?

---

## 📅 Scheduling
31. When’s the soonest you can come out?
32. Can I book something for tomorrow morning?
33. Do you have availability this weekend?
34. Can someone come today after 5?
35. I need an appointment next week
36. How long does a typical visit take?
37. Can I reschedule my appointment?
38. What time will the plumber arrive?
39. Do you offer same-day service?
40. Can you give me a call before arriving?

---

## 🏠 Installation & Upgrades
41. Can you install a new water heater?
42. I want to upgrade my bathroom fixtures
43. Do you install tankless water heaters?
44. Can you replace my old pipes?
45. I need a new sump pump installed
46. Can you install a garbage disposal?
47. I’m remodeling—can you handle plumbing?
48. Do you install water filtration systems?
49. Can you move plumbing lines?
50. Do you install outdoor faucets?

---

## 🤔 Unclear / Vague Descriptions
51. Something’s wrong with my water
52. My pipes are acting weird
53. It’s making a noise I’ve never heard before
54. The water pressure feels off
55. There’s just… something not right
56. My bathroom smells funny
57. The sink is kinda slow I guess
58. It worked yesterday but not today
59. I don’t know how to explain it
60. It’s like gurgling or something

---

## 😤 Frustrated / Emotional
61. This has been happening for weeks and no one fixed it!
62. I just had this repaired and it broke again!
63. I’m really frustrated right now
64. This is the third time I’ve called about this
65. Why is this still not working??
66. I need this fixed ASAP, this is ridiculous
67. I’ve already paid someone else and they messed it up
68. This is becoming a huge problem
69. I can’t keep dealing with this
70. Someone needs to fix this today

---

## 🧠 Repeat / Clarification
71. Can you repeat that?
72. I didn’t catch what you said
73. How much was that again?
74. Wait, what do you mean by that?
75. Can you explain that differently?
76. I’m not sure I understand
77. Can you slow down a bit?
78. What are my options again?
79. Did you say tomorrow or Thursday?
80. Can you text me the details?

---

## 📍 Location / Logistics
81. Do you service my area?
82. How far out do you travel?
83. I’m in an apartment—does that matter?
84. Do I need to be home during the visit?
85. Where are you located?
86. How long will it take you to get here?
87. Do you work with property managers?
88. Can you access the building without me there?
89. Do you need parking?
90. Will you bring your own tools?

---

## 💳 Payment & Policies
91. What forms of payment do you accept?
92. Do you take credit cards?
93. Do you offer financing?
94. When do I need to pay?
95. Do you require a deposit?
96. Can I get a receipt?
97. Is your work guaranteed?
98. Do you offer any warranties?
99. What happens if something goes wrong after?
100. Can I cancel if I change my mind?

---

## ✅ Notes for Testing
- Include interruptions and partial sentences in voice simulations
- Test with background noise and unclear pronunciation
- Vary tone: calm, urgent, confused, angry
- Include follow-up questions and multi-turn conversations

---

This dataset is designed to simulate real-world customer interactions and stress-test conversational handling, intent detection, and edge-case behavior.


---

# 🔁 Multi-Turn Conversation Scenarios

## Scenario 1: Emergency Leak
**User:** My basement is flooding right now!
**Assistant Expected Flow:**
- Acknowledge urgency
- Ask for location
- Offer immediate dispatch
- Provide safety instruction (shut off water)

---

## Scenario 2: Pricing Inquiry
**User:** How much to fix a leaking faucet?
**Assistant:** Can you describe the issue?
**User:** It’s dripping constantly
**Assistant Expected Flow:**
- Provide estimate range
- Offer inspection
- Suggest scheduling

---

## Scenario 3: Scheduling Conflict
**User:** Can you come tomorrow morning?
**Assistant:** We have availability at 10am or 1pm
**User:** I can’t do either
**Assistant Expected Flow:**
- Offer alternatives
- Capture preferred time

---

# 🎯 Intent Labels (for Training)

| Intent | Example |
|------|--------|
| emergency | "My pipe burst" |
| pricing | "How much does this cost" |
| scheduling | "Book an appointment" |
| reschedule | "Change my appointment" |
| install | "Install a water heater" |
| unclear | "Something’s wrong" |
| complaint | "This is ridiculous" |
| payment | "Do you take cards" |

---

# 🧪 Noisy / Imperfect Speech Inputs

1. uh yeah my sink like wont drain properly
2. i think theres water like comin from somewhere
3. hello yeah toilet uh overflowing kinda bad
4. need plumber asap like right now
5. water heater makin weird noise idk
6. sink clogged maybe grease or somethin
7. can u come out today maybe later
8. how much u guys usually charge for like leaks
9. pipes soundin crazy rn
10. think somethings wrong w pressure

---

# 🧠 Edge Case Inputs

1. My neighbor’s plumber said I should call you
2. I don’t actually know if it’s plumbing
3. This might be an emergency but I’m not sure
4. Can you just tell me what to do myself?
5. I don’t want a visit, just advice
6. Are you a real person?
7. Can I text instead?
8. Do you work with insurance?
9. I have multiple issues at once
10. I already tried fixing it myself

---

# ✅ Advanced Testing Notes

- Test interruptions mid-sentence
- Test overlapping speech
- Include silence / hesitation
- Simulate wrong intent classification
- Test recovery from misunderstandings
- Evaluate emotional tone handling

---

This expanded dataset now supports:
- Intent classification
- Conversation flow testing
- Voice-to-text robustness
- Real-world deployment scenarios


---

# 🧭 Expected AI Response Framework

Use this structure to evaluate whether the plumbing voice assistant responds correctly and consistently.

## Core Response Pattern
For most calls, the assistant should try to do these in order:
1. Acknowledge the caller’s issue
2. Identify urgency level
3. Gather the minimum required details
4. Offer the next action
5. Confirm the outcome

### Example Response Pattern
**Caller:** My toilet is overflowing
**Strong AI Response:**
- I’m sorry you’re dealing with that.
- Please shut off the water valve behind the toilet if you can do so safely.
- Are you calling from the service address now?
- I can help schedule the soonest available plumber.

---

# ✅ Expected Response Examples by Intent

## 1. Emergency
**Customer Input:** My pipe burst and water is everywhere
**Expected Assistant Behavior:**
- Show urgency
- Give immediate safety instruction
- Avoid long questioning before triage
- Collect address and callback info
- Offer dispatch or escalation

**Good Response Example:**
"I’m sorry, that sounds urgent. If you can do so safely, please shut off your main water valve now. What is the service address so I can help get someone out there as quickly as possible?"

## 2. Pricing
**Customer Input:** How much do you charge to unclog a drain?
**Expected Assistant Behavior:**
- Give a cautious range if allowed
- Avoid fake certainty
- Mention that pricing depends on severity/location
- Offer to schedule an inspection or service call

**Good Response Example:**
"Drain unclogging costs can vary depending on where the blockage is and how severe it is. I can help you book a visit or provide a general estimate if you describe the issue a little more."

## 3. Scheduling
**Customer Input:** Can someone come tomorrow afternoon?
**Expected Assistant Behavior:**
- Check availability flow
- Offer slots clearly
- Confirm selected time
- Collect contact details if needed

**Good Response Example:**
"I can help with that. Do you prefer early afternoon or later in the day? Once I have that, I can confirm the best available time."

## 4. Vague Issue
**Customer Input:** Something is wrong with my water
**Expected Assistant Behavior:**
- Ask a clarifying question
- Narrow by symptom
- Avoid assuming the exact problem

**Good Response Example:**
"I can help figure that out. Is the issue low pressure, no hot water, a leak, a strange smell, or something else?"

## 5. Complaint / Frustration
**Customer Input:** This is the third time I’ve called about this
**Expected Assistant Behavior:**
- Acknowledge frustration
- Stay calm and non-defensive
- Focus on next action

**Good Response Example:**
"I’m sorry this has been so frustrating. Let’s get this handled. I can help review the issue and move you toward the next step right now."

## 6. Payment / Policy
**Customer Input:** Do you take credit cards?
**Expected Assistant Behavior:**
- Answer directly
- Add one useful next detail

**Good Response Example:**
"Yes, we accept credit cards. If you’d like, I can also help with scheduling or answer questions about payment timing."

---

# 🧪 Evaluation Harness

Score each response across the categories below.

## Scoring Rubric (0 to 2)

### 1. Intent Recognition
- **0** = Misunderstood the request
- **1** = Partially recognized intent
- **2** = Correctly identified intent

### 2. Urgency Handling
- **0** = Missed emergency or overreacted to non-emergency
- **1** = Some urgency awareness but weak handling
- **2** = Appropriate urgency and triage

### 3. Helpfulness
- **0** = Did not move the conversation forward
- **1** = Somewhat helpful but incomplete
- **2** = Clear next step provided

### 4. Information Gathering
- **0** = Asked irrelevant or no useful questions
- **1** = Gathered partial needed information
- **2** = Collected the right minimum information

### 5. Tone
- **0** = Robotic, rude, or mismatched tone
- **1** = Acceptable tone but unnatural
- **2** = Natural, calm, professional, empathetic

### 6. Accuracy / Safety
- **0** = Incorrect or unsafe guidance
- **1** = Mostly safe but incomplete
- **2** = Accurate and safe guidance

### 7. Efficiency
- **0** = Too wordy, repetitive, or confusing
- **1** = Slightly inefficient
- **2** = Concise and easy to follow

### 8. Recovery Handling
- **0** = Failed after confusion or interruption
- **1** = Partial recovery
- **2** = Recovered smoothly

**Maximum Score per interaction:** 16

---

# 📋 Evaluation Template

Copy this block for each test case.

## Test Case ID:
## Customer Utterance:
## Expected Intent:
## Expected Priority:
## Assistant Response:
## Outcome:

### Scores
- Intent Recognition:
- Urgency Handling:
- Helpfulness:
- Information Gathering:
- Tone:
- Accuracy / Safety:
- Efficiency:
- Recovery Handling:

### Total Score:

### Notes:
- What went well:
- What failed:
- Suggested improvement:

---

# 🏷 Suggested Priority Levels

## P1 — Emergency
Use for:
- Burst pipe
- Active flooding
- Overflowing toilet with no control
- Sewage backup
- Suspected gas leak near plumbing equipment

## P2 — Urgent Same-Day
Use for:
- No water
- No hot water
- Major leak but contained
- Severely clogged main drain

## P3 — Standard Service
Use for:
- Dripping faucet
- Slow drain
- Running toilet
- Fixture replacement

## P4 — Informational
Use for:
- Pricing questions
- Policy questions
- Service area questions
- Warranty or payment questions

---

# 🤖 Failure Modes to Test For

1. Assistant talks too much before asking a useful question
2. Assistant fails to identify emergency language
3. Assistant gives unsafe advice
4. Assistant hallucinates prices or availability
5. Assistant loops the same question repeatedly
6. Assistant cannot recover from unclear speech
7. Assistant ignores caller frustration
8. Assistant fails to confirm booking details
9. Assistant confuses install vs repair intent
10. Assistant ends conversation without a next step

---

# 🔬 Stress Test Variants

Run each prompt in multiple forms:
- Clean speech
- Background noise
- Heavy filler words
- Caller interruption
- Angry tone
- Elderly / slower pacing
- Strong accent transcription errors
- Short fragments only
- Caller changes topic mid-call
- Caller asks two questions at once

Example:
**Base Prompt:** My water heater is not working
**Variant A:** uh yeah my water heater just stopped working
**Variant B:** hot water gone completely and I have guests coming
**Variant C:** my water heater broke how much and how soon can you come

---

# 🛠 Recommended Test Suite Structure

## Unit Tests
- Intent classification only
- Priority classification only
- Entity extraction only

## Conversation Tests
- One-turn response quality
- Multi-turn slot filling
- Reschedule/cancel flow
- Complaint handling

## Robustness Tests
- ASR transcription errors
- Partial sentences
- Silence and interruptions
- Contradictory user inputs

## Business Rule Tests
- Emergency routing
- Service area validation
- Pricing boundaries
- Payment policy answers
- Escalation to human when needed

---

# 📌 Suggested Fields to Capture Per Call

- caller_phone
- service_address
- issue_type
- urgency_level
- callback_requested
- preferred_appointment_time
- property_type
- payment_question
- repeat_customer_flag
- escalation_needed
- transcript_confidence

---

# 🚀 Next Build Recommendation

After this, the most useful next artifact is a structured dataset with columns like:
- test_id
- utterance
- intent
- urgency
- expected_slots
- ideal_response_traits
- pass_fail
- score

That will let you plug this directly into an automated evaluation pipeline or spreadsheet-based QA system.

