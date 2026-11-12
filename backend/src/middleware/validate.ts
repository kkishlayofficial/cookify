import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type Schemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

// Express 5's `req.query` is a getter that re-parses the raw URL on every
// access (it does not cache), so mutating the object it returns has no
// effect on the next read. Validated query results are therefore stashed
// here instead, keyed by request, and read back via `getValidatedQuery`.
const validatedQueryByRequest = new WeakMap<Request, Record<string, unknown>>();

export function getValidatedQuery<T = Record<string, unknown>>(req: Request): T {
  return (validatedQueryByRequest.get(req) ?? {}) as T;
}

/**
 * Validates req.body/query/params against the given Zod schemas. Body and
 * params are plain mutable properties and are updated in place; query is
 * stashed separately (see above) and must be read with `getValidatedQuery`.
 * Throws (via Zod) straight into the central error handler on failure.
 */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.query) {
      const parsed = schemas.query.parse(req.query) as Record<string, unknown>;
      validatedQueryByRequest.set(req, parsed);
    }
    if (schemas.params) {
      const parsed = schemas.params.parse(req.params) as Record<string, unknown>;
      Object.assign(req.params as Record<string, unknown>, parsed);
    }
    next();
  };
}
