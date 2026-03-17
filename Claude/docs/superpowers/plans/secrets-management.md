# ServiceLine AI -- Secrets Management Strategy

## 1. Railway Variable Management

### 1.1 Service Inventory

ServiceLine AI deploys four Railway services:

| Service | Description |
|---------|-------------|
| **web** | Next.js dashboard (client dashboards, admin panel, Stripe webhooks, Google OAuth callback) |
| **voice** | Fastify WebSocket server (Twilio ConversationRelay, Claude voice agent, call-status webhooks) |
| **n8n** | Workflow automation (text-back drips, review harvesting, GEO/SEO jobs) |
| **postgres** | Railway-managed PostgreSQL 16 |

### 1.2 Shared vs Per-Service Variables

Railway supports **shared variables** (set once at the project level and referenced by multiple services) and **per-service variables** (scoped to a single service). Use shared variables for secrets consumed by more than one service; use per-service variables for everything else.

**Shared variables (Railway project-level):**

| Variable | Consumers |
|----------|-----------|
| `DATABASE_URL` | web, voice, n8n |
| `ENCRYPTION_KEY` | web, voice (both read/write encrypted OAuth tokens via `@serviceline/db`) |
| `NEXTAUTH_SECRET` | web (but voice could need it if JWT validation is added) |

**Per-service variables:**

| Variable | Service | Rationale |
|----------|---------|-----------|
| `TWILIO_ACCOUNT_SID` | voice | Only voice server makes/receives Twilio calls |
| `TWILIO_AUTH_TOKEN` | voice | Only voice server validates Twilio signatures and authenticates WebSocket |
| `TWILIO_PHONE_NUMBER` | voice | Only voice server generates TwiML |
| `ANTHROPIC_API_KEY` | voice | Only voice server calls Claude for conversations |
| `GOOGLE_CLIENT_ID` | web | OAuth consent screen lives in the web app |
| `GOOGLE_CLIENT_SECRET` | web | OAuth token exchange lives in the web app |
| `GOOGLE_REDIRECT_URI` | web | Web app callback URL |
| `STRIPE_SECRET_KEY` | web | Billing lives in the web app |
| `STRIPE_WEBHOOK_SECRET` | web | Stripe webhook endpoint lives in the web app |
| `ADMIN_EMAIL` | web | Admin login for the web dashboard |
| `ADMIN_PASSWORD_HASH` | web | Admin login for the web dashboard |
| `N8N_WEBHOOK_SECRET` | voice, n8n | voice signs outbound webhooks, n8n verifies them |
| `N8N_TEXTBACK_WEBHOOK_URL` | voice | voice sends text-back triggers to n8n |
| `VOICE_SERVER_URL` | web | web needs to know the voice server's internal URL |

### 1.3 Railway Variable References

Railway supports `${{service.variable}}` references. Use these to avoid duplicating secrets:

```
# In web and voice services, reference the shared DATABASE_URL:
DATABASE_URL = ${{postgres.DATABASE_URL}}

# In voice service, reference the n8n webhook URL:
N8N_TEXTBACK_WEBHOOK_URL = ${{n8n.RAILWAY_PUBLIC_DOMAIN}}/webhook/missed-call-textback
```

For `N8N_WEBHOOK_SECRET`, set it once on n8n, then reference it from voice:
```
# On voice service:
N8N_WEBHOOK_SECRET = ${{n8n.N8N_WEBHOOK_SECRET}}
```

### 1.4 Environment Separation

Railway supports multiple environments per project. Create three:

| Environment | Purpose | Secret source |
|-------------|---------|---------------|
| **production** | Live traffic | Real Twilio, Stripe live keys, production DB |
| **staging** | Pre-deploy verification | Twilio test credentials, Stripe test keys, staging DB |
| **development** | Local only (not on Railway) | `.env` file, local Postgres via docker-compose |

Rules:
- Production secrets are NEVER copied to staging or development.
- Staging uses Twilio test credentials (`TWILIO_TEST_*`) and Stripe test keys (`sk_test_*`).
- `ENCRYPTION_KEY` is different per environment. Staging tokens cannot be decrypted with production keys.
- `NEXTAUTH_SECRET` is different per environment to prevent session cookie portability.

---

## 2. Secret Rotation Policy

### 2.1 Rotation Classification

| Secret | Can Rotate Without Downtime? | Rotation Frequency | Notes |
|--------|------------------------------|-------------------|-------|
| `DATABASE_URL` | No -- requires connection drain | Annually or on compromise | Coordinate with Railway Postgres credential rotation |
| `TWILIO_ACCOUNT_SID` | N/A (not a secret, it is an identifier) | Never | Public identifier |
| `TWILIO_AUTH_TOKEN` | Yes -- Twilio supports secondary auth tokens | Every 90 days | Create secondary token, deploy, then revoke primary |
| `ANTHROPIC_API_KEY` | Yes -- create new key before revoking old | Every 90 days | Create new key in Anthropic console, deploy, verify, revoke old |
| `GOOGLE_CLIENT_ID` | No -- embedded in OAuth consent screen | Never (rotate secret only) | Identifier, not a secret |
| `GOOGLE_CLIENT_SECRET` | Yes -- GCP supports multiple credentials | Annually | Create new credential in same OAuth client, deploy, revoke old |
| `STRIPE_SECRET_KEY` | Yes -- Stripe supports key rolling | Every 90 days | Roll key in Stripe dashboard (creates new, old valid for 24h) |
| `STRIPE_WEBHOOK_SECRET` | Partial -- new webhooks use new secret | On endpoint change | Stripe signs with both secrets during transition window |
| `NEXTAUTH_SECRET` | No -- invalidates all sessions | Annually or on compromise | All users will be logged out; schedule during maintenance window |
| `ENCRYPTION_KEY` | No -- see 2.2 below | Only on compromise | Requires re-encryption migration |
| `N8N_WEBHOOK_SECRET` | Yes -- deploy to both services simultaneously | Every 90 days | Update n8n and voice in same Railway deploy |
| `ADMIN_PASSWORD_HASH` | Yes -- only affects next login | Every 90 days | Generate new hash, update env var |

### 2.2 ENCRYPTION_KEY Rotation (Key Versioning)

The `ENCRYPTION_KEY` encrypts Google OAuth refresh tokens stored in the database via AES-256-GCM. Rotating it requires re-encrypting every stored token. Strategy:

**Schema change:**
Add a `key_version` column to the table storing encrypted tokens (default `1`).

**Env var format:**
```
ENCRYPTION_KEY_V1=<original 64-char hex>
ENCRYPTION_KEY_V2=<new 64-char hex>
ENCRYPTION_KEY_CURRENT_VERSION=2
```

**Read path (decrypt):**
1. Read `key_version` from the row.
2. Select the corresponding `ENCRYPTION_KEY_V{n}`.
3. Decrypt with that key.

**Write path (encrypt):**
Always encrypt with `ENCRYPTION_KEY_V{CURRENT_VERSION}`.

**Migration path:**
1. Deploy code that supports both V1 and V2 keys (reads either, writes V2).
2. Run a one-time migration script that reads every encrypted token, decrypts with V1, re-encrypts with V2, updates the row with `key_version=2`.
3. After migration completes (verify zero rows with `key_version=1`), remove `ENCRYPTION_KEY_V1` from env.

**When to rotate:** Only on confirmed or suspected compromise. The re-encryption migration touches every client's token and must be tested in staging first.

---

## 3. Least Privilege

### 3.1 Per-Service Secret Access Matrix

| Secret | web | voice | n8n | postgres |
|--------|-----|-------|-----|----------|
| `DATABASE_URL` | Yes | Yes | Yes | N/A (is the service) |
| `ENCRYPTION_KEY` | Yes | Yes | No | No |
| `TWILIO_ACCOUNT_SID` | No | Yes | No | No |
| `TWILIO_AUTH_TOKEN` | No | Yes | No | No |
| `TWILIO_PHONE_NUMBER` | No | Yes | No | No |
| `ANTHROPIC_API_KEY` | No | Yes | No | No |
| `GOOGLE_CLIENT_ID` | Yes | No | No | No |
| `GOOGLE_CLIENT_SECRET` | Yes | No | No | No |
| `STRIPE_SECRET_KEY` | Yes | No | No | No |
| `STRIPE_WEBHOOK_SECRET` | Yes | No | No | No |
| `NEXTAUTH_SECRET` | Yes | No | No | No |
| `N8N_WEBHOOK_SECRET` | No | Yes | Yes | No |
| `ADMIN_EMAIL` | Yes | No | No | No |
| `ADMIN_PASSWORD_HASH` | Yes | No | No | No |
| `VOICE_SERVER_URL` | Yes | No | No | No |
| `N8N_TEXTBACK_WEBHOOK_URL` | No | Yes | No | No |

**Key takeaway:** The voice server has no access to Stripe, Google OAuth, admin credentials, or NextAuth secrets. The web server has no access to Twilio credentials or the Anthropic key. n8n only gets the database and its own webhook secret.

### 3.2 Database Role Separation (Future Enhancement)

When client count grows past 10, create separate Postgres roles:

| Role | Permissions | Used by |
|------|-------------|---------|
| `serviceline_web` | SELECT/INSERT/UPDATE on clients, dashboards, revenue_metrics, stripe tables. No access to call_logs or recordings. | web |
| `serviceline_voice` | SELECT/INSERT/UPDATE on clients (read-only), calls, call_logs, recordings, google_tokens. No access to stripe tables. | voice |
| `serviceline_n8n` | SELECT/INSERT/UPDATE on sms_messages, drip_campaigns, review_requests. No access to google_tokens or stripe tables. | n8n |
| `serviceline_admin` | ALL PRIVILEGES | migrations, ad-hoc maintenance |

Each role gets its own `DATABASE_URL` with role-specific credentials.

---

## 4. Secret Generation

### 4.1 Minimum Entropy Requirements

| Secret Type | Minimum Entropy | Practical Minimum |
|-------------|----------------|-------------------|
| Symmetric keys (ENCRYPTION_KEY, NEXTAUTH_SECRET) | 256 bits | 32 bytes (64 hex chars) |
| HMAC signing keys (N8N_WEBHOOK_SECRET) | 256 bits | 32 bytes (64 hex chars) |
| Admin password | 72 bits | 12+ characters, mixed case/numbers/symbols |
| API keys (Anthropic, Stripe, Twilio) | Managed by provider | N/A -- use provider's dashboard |

### 4.2 Generation Commands

```bash
# ENCRYPTION_KEY (AES-256, 32 bytes as hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# NEXTAUTH_SECRET (32 bytes as base64, compatible with next-auth)
openssl rand -base64 32

# N8N_WEBHOOK_SECRET (32 bytes as hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ADMIN_PASSWORD_HASH (bcrypt, cost factor 12)
# First, generate a strong password:
openssl rand -base64 18
# Then hash it:
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('YOUR_PASSWORD_HERE', 12).then(console.log)"

# DATABASE_URL password component (24 random bytes, base64, URL-safe)
openssl rand -base64 24 | tr '+/' '-_' | tr -d '='

# Verify ENCRYPTION_KEY length before deploying
node -e "const k=process.argv[1]; console.log(k.length===64 && /^[0-9a-f]+$/.test(k) ? 'VALID' : 'INVALID')" YOUR_KEY_HERE
```

### 4.3 Provider-Managed Secrets

These secrets are generated in provider dashboards, not by us:

| Secret | Where to generate |
|--------|------------------|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys |
| `TWILIO_ACCOUNT_SID` | https://console.twilio.com (Account Info) |
| `TWILIO_AUTH_TOKEN` | https://console.twilio.com (Account Info) |
| `GOOGLE_CLIENT_ID` | https://console.cloud.google.com/apis/credentials |
| `GOOGLE_CLIENT_SECRET` | https://console.cloud.google.com/apis/credentials |
| `STRIPE_SECRET_KEY` | https://dashboard.stripe.com/apikeys |
| `STRIPE_WEBHOOK_SECRET` | https://dashboard.stripe.com/webhooks (per endpoint) |

---

## 5. Incident Response

### 5.1 Severity Classification

| Severity | Definition | Response Time |
|----------|-----------|---------------|
| **P0 -- Critical** | ENCRYPTION_KEY, DATABASE_URL, or STRIPE_SECRET_KEY leaked | Immediate (within 1 hour) |
| **P1 -- High** | ANTHROPIC_API_KEY, TWILIO_AUTH_TOKEN, or GOOGLE_CLIENT_SECRET leaked | Within 4 hours |
| **P2 -- Medium** | N8N_WEBHOOK_SECRET, NEXTAUTH_SECRET, or ADMIN_PASSWORD_HASH leaked | Within 24 hours |
| **P3 -- Low** | Non-secret identifiers (TWILIO_ACCOUNT_SID, GOOGLE_CLIENT_ID) exposed | Assess, no rotation needed |

### 5.2 Per-Secret Rotation Procedures

#### ENCRYPTION_KEY compromised (P0)

1. **Immediately** generate a new ENCRYPTION_KEY (see Section 4.2).
2. Deploy code with key versioning support (V1 = old, V2 = new, CURRENT_VERSION=2) -- see Section 2.2.
3. Run re-encryption migration in staging, verify all tokens decrypt correctly.
4. Run re-encryption migration in production.
5. Remove V1 key from all environments.
6. **Client impact:** None if rotation completes before attacker uses the key. If tokens were exfiltrated along with the key, all affected clients' Google OAuth tokens must be revoked and re-authorized.
7. Notify affected clients if token exfiltration is confirmed.

#### DATABASE_URL compromised (P0)

1. **Immediately** rotate the Postgres password via Railway dashboard.
2. Update `DATABASE_URL` in all services (web, voice, n8n).
3. Trigger a redeploy of all services.
4. Audit `pg_stat_activity` for unauthorized connections.
5. Review all tables for unauthorized reads or writes (check `updated_at` timestamps).
6. **Client impact:** Brief downtime during redeploy (~30 seconds per service with Railway's rolling deploys). If data was exfiltrated, follow data breach notification procedures.

#### STRIPE_SECRET_KEY compromised (P0)

1. **Immediately** roll the key in Stripe dashboard (old key remains valid for 24 hours).
2. Deploy new key to web service.
3. Monitor Stripe dashboard for unauthorized charges or refunds.
4. Review Stripe event logs for suspicious activity.
5. **Client impact:** None if caught within 24-hour roll window. If unauthorized charges occurred, issue refunds and notify affected clients.

#### ANTHROPIC_API_KEY compromised (P1)

1. Create a new API key in Anthropic console.
2. Deploy new key to voice service.
3. Revoke the old key.
4. Check Anthropic usage dashboard for anomalous consumption.
5. **Client impact:** None. Worst case is unauthorized API usage billed to us.

#### TWILIO_AUTH_TOKEN compromised (P1)

1. Create a secondary auth token in Twilio console.
2. Deploy secondary token to voice service.
3. Promote secondary to primary in Twilio console.
4. Revoke old primary token.
5. Monitor Twilio usage for unauthorized calls or SMS.
6. **Client impact:** None if rotated promptly. If attacker sent SMS from client numbers, notify affected clients.

#### GOOGLE_CLIENT_SECRET compromised (P1)

1. Generate a new credential for the same OAuth client in GCP console.
2. Deploy new secret to web service.
3. Delete old credential in GCP console.
4. Existing refresh tokens remain valid (they are tied to the client ID, not the secret).
5. **Client impact:** None.

#### NEXTAUTH_SECRET compromised (P2)

1. Generate a new secret (see Section 4.2).
2. Deploy to web service.
3. All admin sessions are invalidated (admin must re-login).
4. **Client impact:** None (clients do not log in to the web dashboard directly; they use PIN-protected dashboards that do not use NextAuth).

#### N8N_WEBHOOK_SECRET compromised (P2)

1. Generate a new secret.
2. Deploy to both voice and n8n services simultaneously.
3. **Client impact:** None. An attacker with the old secret could have triggered fake text-back webhooks, but the damage is limited to sending unauthorized SMS to callers.

#### ADMIN_PASSWORD_HASH compromised (P2)

1. Generate a new admin password and hash it (see Section 4.2).
2. Deploy new hash to web service.
3. If the plaintext password was also compromised, check for unauthorized admin actions in the audit log.
4. **Client impact:** None.

### 5.3 Communication Plan

| Audience | When | Channel | Content |
|----------|------|---------|---------|
| Engineering team | Immediately on discovery | Slack #incidents | Secret type, blast radius, rotation ETA |
| Company leadership | Within 2 hours for P0/P1 | Direct message | Summary, client impact assessment, timeline |
| Affected clients | Within 24 hours if client data was accessed | Phone call + email | What happened, what data was affected, what we did, what they should do |
| All clients | Only if breach is confirmed | Email | Transparent disclosure, remediation steps taken |

### 5.4 Post-Incident Checklist

- [ ] Root cause identified and documented
- [ ] Compromised secret rotated and verified
- [ ] All services redeployed with new secret
- [ ] Audit logs reviewed for unauthorized access
- [ ] Monitoring/alerting gap that allowed the leak identified and closed
- [ ] .env.example verified to contain no real values
- [ ] Git history checked for accidental secret commits (use `git log -p -S 'secret_value'`)
- [ ] Railway deploy logs reviewed for secret exposure
- [ ] Incident retrospective scheduled within 48 hours

---

## 6. Operational Checklist

### 6.1 Before First Production Deploy

- [ ] All secrets generated per Section 4
- [ ] ENCRYPTION_KEY validated as 64-char hex
- [ ] Each Railway service has ONLY the variables from Section 3.1
- [ ] Staging environment uses test credentials (Twilio test, Stripe `sk_test_`)
- [ ] `.env.example` contains no real values
- [ ] `.gitignore` includes `.env*` (except `.env.example`)
- [ ] `docker-compose.yml` does not contain production credentials
- [ ] Railway project access limited to team members who need it

### 6.2 Quarterly Rotation Schedule

| Month | Action |
|-------|--------|
| Q1 (Jan) | Rotate TWILIO_AUTH_TOKEN, ANTHROPIC_API_KEY, N8N_WEBHOOK_SECRET |
| Q2 (Apr) | Rotate STRIPE_SECRET_KEY, ADMIN_PASSWORD_HASH |
| Q3 (Jul) | Rotate TWILIO_AUTH_TOKEN, ANTHROPIC_API_KEY, N8N_WEBHOOK_SECRET |
| Q4 (Oct) | Rotate STRIPE_SECRET_KEY, ADMIN_PASSWORD_HASH, GOOGLE_CLIENT_SECRET (annual), NEXTAUTH_SECRET (annual) |

### 6.3 Secrets Never Committed to Git

The following must NEVER appear in source control:
- Any file matching `.env` (only `.env.example` with empty values)
- `ENCRYPTION_KEY`, `NEXTAUTH_SECRET`, or any key material
- Database connection strings with passwords
- API keys or auth tokens
- Password hashes (the hash itself is sensitive because it enables offline cracking)
