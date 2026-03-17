import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * Output format (colon-delimited, all base64):
 *   <iv>:<authTag>:<ciphertext>
 *
 * The IV is randomly generated per call, so identical plaintexts produce
 * different ciphertexts. The GCM auth tag guarantees ciphertext integrity —
 * any tampering will cause decrypt() to throw.
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypts a value produced by encrypt().
 * Throws if the key is wrong, the ciphertext is malformed, or the auth tag
 * does not match (i.e., the data was tampered with).
 */
export function decrypt(encoded: string): string {
  const key = getEncryptionKey();
  const parts = encoded.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format — expected iv:tag:data');
  }
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/**
 * Reads and validates the ENCRYPTION_KEY environment variable.
 * Must be a 64-character lowercase hex string representing 32 bytes.
 * Throws immediately if the key is absent or the wrong length so that
 * misconfiguration is caught at call-time rather than silently producing
 * corrupt data.
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  return Buffer.from(keyHex, 'hex');
}
