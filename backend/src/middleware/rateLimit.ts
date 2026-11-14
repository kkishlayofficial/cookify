import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";

/**
 * Per-IP limiters for the auth endpoints most attractive to brute-force /
 * credential-stuffing / account-enumeration abuse. Relies on `app.set("trust
 * proxy", ...)` (see app.ts) being configured to the correct number of
 * reverse-proxy hops in production, otherwise `req.ip` falls back to the
 * proxy's own address and every client collapses into a single bucket.
 */
function authLimiter(windowMs: number, max: number, code: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    // Keep the response shape consistent with the rest of the API
    // (`{ error: { message, code } }`, see middleware/errorHandler.ts) instead
    // of express-rate-limit's default plain-text body.
    handler: (_req: Request, res: Response) => {
      res.status(429).json({ error: { message: "Too many requests, please try again later", code } });
    },
  });
}

export const loginRateLimiter = authLimiter(15 * 60 * 1000, 5, "LOGIN_RATE_LIMITED");
export const twoFactorRateLimiter = authLimiter(15 * 60 * 1000, 5, "TWO_FACTOR_RATE_LIMITED");
export const forgotPasswordRateLimiter = authLimiter(60 * 60 * 1000, 5, "FORGOT_PASSWORD_RATE_LIMITED");
export const resetPasswordRateLimiter = authLimiter(15 * 60 * 1000, 5, "RESET_PASSWORD_RATE_LIMITED");
export const signupRateLimiter = authLimiter(60 * 60 * 1000, 10, "SIGNUP_RATE_LIMITED");
