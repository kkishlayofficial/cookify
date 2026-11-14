import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { MulterError } from "multer";
import { ApiError } from "@/lib/apiError";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.path}`, code: "ROUTE_NOT_FOUND" } });
}

// Express 5 forwards rejected promises from async route handlers here automatically.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { message: err.message, code: err.code } });
  }

  if (err instanceof MulterError) {
    return res.status(400).json({ error: { message: err.message, code: err.code } });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: err.flatten().fieldErrors,
      },
    });
  }

  console.error(err);
  return res.status(500).json({ error: { message: "Internal server error", code: "INTERNAL_ERROR" } });
}
