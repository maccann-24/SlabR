/**
 * Encrypted token storage for Google OAuth credentials.
 *
 * All tokens are AES-256-GCM encrypted before being written to the
 * google_oauth_tokens table. This module is the ONLY approved way to
 * read or write OAuth tokens — never query the table directly.
 */
import { db } from './index.js';
import { googleOauthTokens } from './schema.js';
import { encrypt, decrypt } from './encryption.js';
import { eq } from 'drizzle-orm';

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  scope: string;
  expiresAt: Date;
}

/**
 * Store OAuth tokens for a client, encrypting sensitive fields.
 * Upserts — if tokens already exist for this client, they are replaced.
 */
export async function storeOAuthTokens(clientId: string, tokens: OAuthTokens): Promise<void> {
  const encryptedAccess = encrypt(tokens.accessToken);
  const encryptedRefresh = encrypt(tokens.refreshToken);

  await db
    .insert(googleOauthTokens)
    .values({
      clientId,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenType: tokens.tokenType,
      scope: tokens.scope,
      expiresAt: tokens.expiresAt,
    })
    .onConflictDoUpdate({
      target: googleOauthTokens.clientId,
      set: {
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenType: tokens.tokenType,
        scope: tokens.scope,
        expiresAt: tokens.expiresAt,
        updatedAt: new Date(),
      },
    });
}

/**
 * Retrieve and decrypt OAuth tokens for a client.
 * Returns null if no tokens exist for this client.
 */
export async function getOAuthTokens(clientId: string): Promise<OAuthTokens | null> {
  const [row] = await db
    .select()
    .from(googleOauthTokens)
    .where(eq(googleOauthTokens.clientId, clientId))
    .limit(1);

  if (!row) return null;

  return {
    accessToken: decrypt(row.accessToken),
    refreshToken: decrypt(row.refreshToken),
    tokenType: row.tokenType || 'Bearer',
    scope: row.scope,
    expiresAt: row.expiresAt,
  };
}

/**
 * Delete OAuth tokens for a client (e.g., on disconnect or churn).
 */
export async function deleteOAuthTokens(clientId: string): Promise<void> {
  await db
    .delete(googleOauthTokens)
    .where(eq(googleOauthTokens.clientId, clientId));
}
