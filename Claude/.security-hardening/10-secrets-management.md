# Step 10: Secrets Management

Full design at: docs/superpowers/plans/secrets-management.md

## Key Decisions

### Per-Service Variable Access (Least Privilege)
| Secret | Voice | Web | n8n |
|--------|-------|-----|-----|
| DATABASE_URL | Yes | Yes | Yes |
| TWILIO_* | Yes | No | Yes |
| ANTHROPIC_API_KEY | Yes | No | Yes |
| STRIPE_* | No | Yes | No |
| GOOGLE_CLIENT_* | No | Yes | No |
| ENCRYPTION_KEY | Yes | Yes | No |
| NEXTAUTH_SECRET | No | Yes | No |
| N8N_WEBHOOK_SECRET | Yes | No | Yes |

### Rotation Policy
- **Can rotate without downtime:** Twilio (secondary auth token), Stripe (key rolling), Anthropic (multiple keys), N8N_WEBHOOK_SECRET, JOB_COMPLETE_SECRET
- **Requires coordination:** NEXTAUTH_SECRET (invalidates sessions), ENCRYPTION_KEY (requires re-encryption migration with key versioning)
- **Quarterly rotation:** API keys, webhook secrets
- **Annually:** ENCRYPTION_KEY (with key version migration)

### ENCRYPTION_KEY Versioning
- Add `key_version` column to `google_oauth_tokens`
- Dual-key read: try current key, fallback to previous
- Background migration re-encrypts all tokens with new key
- Delete old key after migration verified

### Incident Response
- P0 (DATABASE_URL, ENCRYPTION_KEY leaked): Rotate immediately, re-encrypt all tokens, notify all affected clients
- P1 (API keys leaked): Rotate within 1 hour, monitor for abuse
- P2 (webhook secrets leaked): Rotate within 24 hours
- P3 (NEXTAUTH_SECRET leaked): Rotate, accept admin session reset
