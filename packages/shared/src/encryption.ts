import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function deriveKey(secret: string): Buffer {
  // Salt is intentionally fixed: rotating the secret rotates the derived key.
  // We never persist the salt — the secret (ENCRYPTION_KEY) is the only
  // material that needs to be protected.
  return scryptSync(secret, "contactship-token-encryption", KEY_LENGTH);
}

export function encryptToken(plaintext: string, secret: string): string {
  if (!secret) throw new Error("ENCRYPTION_KEY is not set");
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptToken(payload: string, secret: string): string {
  if (!secret) throw new Error("ENCRYPTION_KEY is not set");
  const key = deriveKey(secret);
  const data = Buffer.from(payload, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString("base64");
}
