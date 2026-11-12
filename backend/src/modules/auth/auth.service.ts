import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/apiError";
import { compareSecret, hashSecret } from "@/lib/hash";
import { generateNumericCode, generateOpaqueToken, sha256 } from "@/lib/tokens";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import { sendMail } from "@/lib/mailer";
import type { z } from "zod";
import type { loginSchema, signupSchema } from "@/modules/auth/auth.validation";

const LOGIN_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export const PUBLIC_USER_FIELDS = {
  id: true,
  email: true,
  username: true,
  firstName: true,
  lastName: true,
  bio: true,
  avatarUrl: true,
  role: true,
  status: true,
  twoFactorEnabled: true,
  preferredLanguage: true,
  createdAt: true,
} as const;

type SignupInput = z.infer<typeof signupSchema>;
type LoginInput = z.infer<typeof loginSchema>;

export async function signup(input: SignupInput) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
  });
  if (existing) {
    throw ApiError.conflict(
      existing.email === input.email ? "Email is already registered" : "Username is already taken",
      "USER_EXISTS",
    );
  }

  const passwordHash = await hashSecret(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      bio: input.bio,
      age: input.age,
      gender: input.gender,
      preferredLanguage: input.preferredLanguage ?? "en",
      preference: { create: {} },
    },
    select: PUBLIC_USER_FIELDS,
  });

  return user;
}

async function assertActiveCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");

  const valid = await compareSecret(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");

  if (user.status === "BANNED") {
    throw ApiError.forbidden("This account has been banned for repeated policy violations", "ACCOUNT_BANNED");
  }

  return user;
}

export async function login(input: LoginInput) {
  const user = await assertActiveCredentials(input.email, input.password);

  if (user.twoFactorEnabled) {
    const code = generateNumericCode();
    await prisma.twoFactorCode.create({
      data: {
        userId: user.id,
        codeHash: await hashSecret(code),
        purpose: "LOGIN",
        expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_MS),
      },
    });
    const { previewUrl } = await sendMail(
      user.email,
      "Your COOKify login code",
      `Your 2FA login code is ${code}. It expires in 10 minutes.`,
    );
    return { twoFactorRequired: true as const, userId: user.id, devMailPreviewUrl: previewUrl };
  }

  return { twoFactorRequired: false as const, ...(await issueSession(user.id, input.rememberDevice, input.deviceLabel)) };
}

export async function verifyLoginCode(userId: string, code: string, rememberDevice: boolean, deviceLabel?: string) {
  const candidates = await prisma.twoFactorCode.findMany({
    where: { userId, purpose: "LOGIN", consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  const match = await findMatchingCode(candidates, code);
  if (!match) throw ApiError.unauthorized("Invalid or expired code", "INVALID_2FA_CODE");

  await prisma.twoFactorCode.update({ where: { id: match.id }, data: { consumedAt: new Date() } });

  return issueSession(userId, rememberDevice, deviceLabel);
}

async function findMatchingCode<T extends { id: string; codeHash: string }>(candidates: T[], code: string) {
  for (const candidate of candidates) {
    if (await compareSecret(code, candidate.codeHash)) return candidate;
  }
  return null;
}

/** Issues an access token + a device-bound refresh token ("remember this device"). */
export async function issueSession(userId: string, rememberDevice: boolean, deviceLabel?: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const device = await prisma.device.create({
    data: { userId: user.id, refreshTokenHash: "pending", label: deviceLabel },
  });

  const refreshToken = signRefreshToken({ sub: user.id, deviceId: device.id });
  await prisma.device.update({ where: { id: device.id }, data: { refreshTokenHash: sha256(refreshToken) } });

  const accessToken = signAccessToken({ sub: user.id, role: user.role });

  return { accessToken, refreshToken, rememberDevice, user: toPublicUser(user) };
}

export async function refreshSession(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized("Session expired, please log in again", "REFRESH_INVALID");
  }

  const device = await prisma.device.findUnique({ where: { id: payload.deviceId } });
  if (!device || device.revokedAt || device.userId !== payload.sub || device.refreshTokenHash !== sha256(refreshToken)) {
    throw ApiError.unauthorized("Session expired, please log in again", "REFRESH_INVALID");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.status === "BANNED") {
    throw ApiError.unauthorized("Session expired, please log in again", "REFRESH_INVALID");
  }

  // Rotate the refresh token on every use so a leaked, already-used token stops working.
  const nextRefreshToken = signRefreshToken({ sub: user.id, deviceId: device.id });
  await prisma.device.update({
    where: { id: device.id },
    data: { refreshTokenHash: sha256(nextRefreshToken), lastUsedAt: new Date() },
  });

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  return { accessToken, refreshToken: nextRefreshToken, user: toPublicUser(user) };
}

export async function logout(refreshToken: string | undefined) {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    await prisma.device.updateMany({ where: { id: payload.deviceId }, data: { revokedAt: new Date() } });
  } catch {
    // Already invalid/expired - nothing to revoke.
  }
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond the same way whether or not the account exists, to avoid leaking account existence.
  if (!user) return { devMailPreviewUrl: null };

  const token = generateOpaqueToken();
  await prisma.twoFactorCode.create({
    data: {
      userId: user.id,
      codeHash: sha256(token),
      purpose: "PASSWORD_RESET",
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const { previewUrl } = await sendMail(
    user.email,
    "Reset your COOKify password",
    `Reset your password using this link (valid for 1 hour): ${resetLink}`,
  );
  return { devMailPreviewUrl: previewUrl };
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = sha256(token);
  const record = await prisma.twoFactorCode.findFirst({
    where: { codeHash: tokenHash, purpose: "PASSWORD_RESET", consumedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!record) throw ApiError.badRequest("Reset link is invalid or has expired", "RESET_TOKEN_INVALID");

  const passwordHash = await hashSecret(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.twoFactorCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
    // Revoke every remembered device so a stolen password can't be combined with an old session.
    prisma.device.updateMany({ where: { userId: record.userId }, data: { revokedAt: new Date() } }),
  ]);
}

function toPublicUser<T extends { passwordHash: string }>(user: T): Omit<T, "passwordHash"> {
  const { passwordHash, ...rest } = user;
  void passwordHash;
  return rest;
}
