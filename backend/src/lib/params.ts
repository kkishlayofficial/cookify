import type { Request } from "express";
import { ApiError } from "@/lib/apiError";

/**
 * Express 5's types widen `req.params[name]` to `string | string[]` for any
 * handler not typed with the exact route-literal generic (which our
 * `AuthenticatedRequest` handlers aren't). Named params are always a single
 * string at runtime, so this narrows it back for call sites.
 */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string") {
    throw ApiError.badRequest(`Missing or invalid route parameter: ${name}`);
  }
  return value;
}
