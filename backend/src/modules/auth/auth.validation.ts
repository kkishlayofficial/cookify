import { z } from "zod";

/**
 * Password rule per the brief's Sign Up pseudocode: at least 9 characters,
 * no spaces, no "restricted" symbols. The brief doesn't enumerate the
 * restricted symbols, so we block characters commonly used in injection/XSS
 * payloads (<>{}[];'"`\) while still allowing normal punctuation for
 * passphrase-style passwords.
 */
const RESTRICTED_SYMBOLS = /[<>{}[\];'"`\\]/;

export const passwordSchema = z
  .string()
  .min(9, "Password must be at least 9 characters")
  .refine((value) => !/\s/.test(value), "Password must not contain spaces")
  .refine((value) => !RESTRICTED_SYMBOLS.test(value), "Password contains a restricted symbol");

export const signupSchema = z.object({
  email: z.string().email(),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: passwordSchema,
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  age: z.coerce.number().int().min(13).max(120).optional(),
  gender: z.string().max(30).optional(),
  preferredLanguage: z.string().max(10).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberDevice: z.coerce.boolean().default(true),
  deviceLabel: z.string().max(100).optional(),
});

export const verify2faSchema = z.object({
  userId: z.string().uuid(),
  code: z.string().length(6),
  rememberDevice: z.coerce.boolean().default(true),
  deviceLabel: z.string().max(100).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  preferredLanguage: z.string().max(10).optional(),
  twoFactorEnabled: z.coerce.boolean().optional(),
});
