import type { NextFunction, Request, Response } from "express";
import { ApiError } from "@/lib/apiError";
import { verifyAccessToken } from "@/lib/jwt";

export type AuthenticatedRequest = Request & {
  user?: { id: string; role: "USER" | "ADMIN" };
};

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);
  return (req as Request & { cookies?: Record<string, string> }).cookies?.accessToken;
}

export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next(ApiError.unauthorized("Authentication required", "NO_TOKEN"));

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired access token", "TOKEN_INVALID"));
  }
}

/** Populates req.user if a valid token is present, but never rejects the request. */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.sub, role: payload.role };
    } catch {
      // Ignore invalid tokens on optional routes.
    }
  }
  next();
}

export function requireAdmin(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") return next(ApiError.forbidden("Admin access required", "ADMIN_ONLY"));
  next();
}
