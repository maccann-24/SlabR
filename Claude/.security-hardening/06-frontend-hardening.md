# Step 6: Frontend Security — Deferred

The Next.js web app (apps/web/) is currently scaffolding from create-next-app with no custom routes, components, or authentication implemented. Frontend security hardening will be applied when the admin panel and client dashboard are built (Phase 4 of the implementation plan).

## Security controls to implement when building the frontend:

1. **NextAuth with credentials provider** — bcrypt password hashing, JWT session strategy
2. **middleware.ts route protection** — verify session on all /admin and /dashboard routes
3. **CSRF protection** — Next.js built-in CSRF for server actions
4. **CSP headers** — via next.config.js headers configuration
5. **PIN rate limiting** — 5 attempts / 15 min / slug, backed by DB counter
6. **HttpOnly/Secure/SameSite cookies** — NextAuth defaults handle this
7. **Input sanitization** — DOMPurify for any user-generated content display
8. **SRI** — Subresource Integrity for any external scripts/styles
