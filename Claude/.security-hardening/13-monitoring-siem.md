# Step 13: Security Monitoring & Alerting

Full design at: docs/superpowers/specs/security-monitoring-design.md

## Summary

### 19 Security Events Monitored (9 categories)
- WebSocket auth failures, rate limit triggers, Twilio sig failures
- PIN brute force, tool abuse, API cost spikes, error rates
- Process crashes, DB outages

### Three-Tier Alerting
- **SMS (immediate):** Forged signatures, HMAC mismatches, emergency SMS failure, crashes, DB down, brute force lockouts
- **Email (review in hours):** Rate limit digests, cost spikes, error spikes, misconfigs
- **Log only:** Expired tokens, single rate limits, tool limits working, call lifecycle

### Implementation
- 6 files modified (~30 lines), ~80-line alerter module
- External tools: Sentry (errors), Axiom (logs), BetterUptime (uptime)
- All on free tiers: $1-5/month (SMS costs only)
- 4 implementation phases, ~4-5 hours total
