import jwt from "jsonwebtoken";
import { env } from "@/config/env";

export type AccessTokenPayload = {
  sub: string; // userId
  role: "USER" | "ADMIN";
};

export type RefreshTokenPayload = {
  sub: string; // userId
  deviceId: string;
};

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"] });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: `${env.JWT_REFRESH_TTL_DAYS}d` });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

export function refreshTokenTtlMs(): number {
  return env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;
}
