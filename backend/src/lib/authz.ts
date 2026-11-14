import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/apiError";
import type { Role, UserStatus } from "@/generated/prisma/enums";

/**
 * Re-checks the account's current status/role against the database on every
 * call, so a ban takes effect immediately for any already-issued access
 * token, refresh token, or live socket connection — not just at the next
 * login or token refresh.
 */
export async function assertAccountActive(userId: string): Promise<{ id: string; role: Role; status: UserStatus }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
  if (!user) throw ApiError.unauthorized("Account no longer exists", "ACCOUNT_NOT_FOUND");
  if (user.status === "BANNED") throw ApiError.forbidden("This account has been banned", "ACCOUNT_BANNED");
  return user;
}
