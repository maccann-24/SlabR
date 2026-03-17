# Step 8: Authentication & Authorization Architecture

## Design Decisions

### Admin Panel
- **NextAuth v4 + Credentials Provider + JWT strategy**
- Single operator account (email/password from env vars)
- bcrypt cost 12, min 16-char password
- 8-hour fixed session TTL, HttpOnly/Secure/SameSite=Lax cookies
- No password reset flow — regenerate hash and redeploy

### Client Dashboard
- **PIN-based auth (6 digits, bcrypt hashed)** — chosen over SMS magic links
  - HVAC owners are familiar with PINs
  - Zero external dependency (no SMS delivery risk)
  - Simpler to implement
- DB-backed rate limiting (not in-memory — survives deploys)
  - 5 failed attempts per slug per 15 min → 30 min lockout
  - 15 failed attempts per IP per 15 min → 60 min lockout
- New `pin_attempts` table for audit trail
- Separate JWT cookie (`sl-dashboard-session`, 7-day sliding TTL)

### Route Protection
- `middleware.ts` protects `/admin/*` and `/dashboard/*`
- Server actions independently verify session (defense-in-depth)
- Client ID always derived from JWT, never from request body

### Internal APIs
- Stripe webhook: `constructEvent()` signature verification
- Job-complete (n8n → Next.js): bearer token with `timingSafeEqual`
- All fail-closed when secrets are missing

### New Env Vars Needed
- `JOB_COMPLETE_SECRET` — shared secret for n8n → Next.js

Full design document: see agent output (comprehensive, 12 sections, threat model, implementation order)
