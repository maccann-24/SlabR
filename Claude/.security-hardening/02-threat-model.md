# ServiceLine AI — STRIDE Threat Model

**Date:** 2026-03-17 | **Threats:** 28 identified | **Attack Trees:** 5

## Top 5 Threats by Risk Score (Likelihood × Impact)

| Risk | Threat | Score | Priority |
|------|--------|-------|----------|
| T2.1 | Unauthenticated WebSocket | 25 (5×5) | P0 |
| T5.1 | n8n webhook unauthenticated | 16 (4×4) | P1 |
| T6.1 | Dashboard PIN brute force | 16 (4×4) | P1 |
| T7.1 | OAuth tokens plaintext | 15 (3×5) | P0 |
| T3.1 | Prompt injection via aiSystemPrompt | 15 (3×5) | P1 |

## STRIDE by Component (summary)

- **Voice Server:** Spoofing (webhook bypass), DoS (no rate limit), Info Disclosure (error traces)
- **WebSocket Handler:** CRITICAL spoofing (no auth), tampering (prompt injection), DoS (connection flood), privilege escalation (client impersonation)
- **System Prompt:** Tampering (raw customPrompt injection), info disclosure (prompt leak via voice)
- **Tool Execution:** Spoofing (fake bookings), DoS (SMS/booking flood)
- **n8n Webhooks:** Spoofing (no auth), tampering (arbitrary clientId/phone)
- **Dashboard:** Spoofing (PIN brute force), info disclosure (PII export), privilege escalation (no middleware.ts)
- **Database:** Info disclosure (plaintext OAuth), tampering (no RLS), no SSL in dev
- **Twilio Integration:** Info disclosure (PII logs, recording URLs)
- **Claude API:** Info disclosure (PII to 3rd party), DoS (API cost exhaustion)

## Attack Trees Built

1. **WebSocket exploitation** → fake leads, fake bookings, SMS flood, API credit burn
2. **OAuth token theft** → Google Calendar access for all clients
3. **Prompt injection** → override safety rules, extract business data, endanger callers
4. **n8n webhook abuse** → unauthorized SMS sends, Twilio account suspension
5. **Dashboard brute force** → PII exfiltration, business takeover, chain to prompt injection

## Business Impact

- **Revenue:** Twilio suspension = total outage. API bill spike = $hundreds/day. Client churn from fake bookings.
- **Legal:** PII breach notification ($5-50/record). TCPA violations ($500-1500/SMS). Prompt injection causing harm = catastrophic liability.
- **Reputation:** OAuth token theft, AI saying harmful things, data breach notifications — all potentially fatal to the business.

## MITRE ATT&CK Mapping

T1190 (Public-Facing App), T1110 (Brute Force), T1552 (Unsecured Credentials), T1528 (Steal App Access Token), T1565 (Data Manipulation), T1498 (Network DoS), T1496 (Resource Hijacking)
