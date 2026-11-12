import crypto from "node:crypto";

/** Opaque, high-entropy token used for password-reset links. */
export function generateOpaqueToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Deterministic digest for refresh tokens: unlike bcrypt, this lets us look
 * the token up directly by its hash (required since refresh tokens are
 * presented without any other identifying info besides their JWT claims).
 */
export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** 6-digit numeric code used for 2FA / email verification. */
export function generateNumericCode(length = 6): string {
  const max = 10 ** length;
  const code = crypto.randomInt(0, max);
  return code.toString().padStart(length, "0");
}
