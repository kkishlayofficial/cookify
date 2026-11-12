import type { Response } from "express";
import { isProduction } from "@/config/env";
import { refreshTokenTtlMs } from "@/lib/jwt";

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;

const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
};

export function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string; rememberDevice?: boolean }) {
  res.cookie("accessToken", tokens.accessToken, { ...baseCookieOptions, maxAge: ACCESS_TOKEN_MAX_AGE_MS });

  // "Remember this device" controls whether the cookie survives browser close;
  // the server-side session itself lasts JWT_REFRESH_TTL_DAYS either way.
  res.cookie("refreshToken", tokens.refreshToken, {
    ...baseCookieOptions,
    ...(tokens.rememberDevice === false ? {} : { maxAge: refreshTokenTtlMs() }),
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("accessToken", baseCookieOptions);
  res.clearCookie("refreshToken", baseCookieOptions);
}
