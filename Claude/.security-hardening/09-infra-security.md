# Step 9: Infrastructure Security

Full design at: docs/superpowers/plans/2026-03-17-infrastructure-security-design.md

## Key Decisions

### Railway Architecture
- Single project, 4 services (voice, web, n8n, postgres)
- Private networking via `railway.internal` DNS
- n8n NEVER gets a public URL — private network only
- Custom domains: voice.servicelineai.com, app.servicelineai.com

### Network Security
- Cloudflare in front of both public services (WAF + DDoS)
- Twilio IP allowlisting via Cloudflare (optional, published ranges)
- Application-level: Helmet, CORS, rate limiting, webhook validation

### Monitoring
- BetterUptime: external uptime pings every 60s
- Sentry: error tracking + performance
- SMS alerts for critical (voice server down, Twilio failure)
- Email alerts for warnings (high error rate, API cost spike)

### Backup & DR
- Railway automatic daily PG snapshots
- Manual pg_dump to external S3 (30-day retention)
- RTO: <2 min (service crash), 8-24 hrs (platform failure)
- Twilio fallback function handles calls during any outage

### Twilio Fallback
- 3 serverless functions on Twilio's own runtime (independent of Railway)
- voicemail-fallback, voicemail-goodbye, recording-notify
- Configured as "Primary Handler Fails" URL in Twilio Console
