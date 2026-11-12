import { Router } from "express";
import * as authService from "@/modules/auth/auth.service";
import { setAuthCookies, clearAuthCookies } from "@/modules/auth/auth.cookies";
import { validate } from "@/middleware/validate";
import { requireAuth, type AuthenticatedRequest } from "@/middleware/auth";
import { ApiError } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  updateProfileSchema,
  verify2faSchema,
} from "@/modules/auth/auth.validation";
import { PUBLIC_USER_FIELDS } from "@/modules/auth/auth.service";

export const authRouter = Router();

authRouter.post("/signup", validate({ body: signupSchema }), async (req, res) => {
  const user = await authService.signup(req.body);
  res.status(201).json({ user });
});

authRouter.post("/login", validate({ body: loginSchema }), async (req, res) => {
  const result = await authService.login(req.body);
  if (result.twoFactorRequired) {
    return res.status(200).json({
      twoFactorRequired: true,
      userId: result.userId,
      devMailPreviewUrl: result.devMailPreviewUrl,
    });
  }
  setAuthCookies(res, result);
  res.status(200).json({ twoFactorRequired: false, user: result.user });
});

authRouter.post("/login/verify-2fa", validate({ body: verify2faSchema }), async (req, res) => {
  const { userId, code, rememberDevice, deviceLabel } = req.body;
  const result = await authService.verifyLoginCode(userId, code, rememberDevice, deviceLabel);
  setAuthCookies(res, result);
  res.status(200).json({ user: result.user });
});

authRouter.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) throw ApiError.unauthorized("No session to refresh", "NO_REFRESH_TOKEN");
  const result = await authService.refreshSession(refreshToken);
  setAuthCookies(res, result);
  res.status(200).json({ user: result.user });
});

authRouter.post("/logout", async (req, res) => {
  await authService.logout(req.cookies?.refreshToken);
  clearAuthCookies(res);
  res.status(204).send();
});

authRouter.post("/forgot-password", validate({ body: forgotPasswordSchema }), async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  res.status(200).json({ message: "If that email exists, a reset link has been sent.", ...result });
});

authRouter.post("/reset-password", validate({ body: resetPasswordSchema }), async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  res.status(200).json({ message: "Password updated. Please log in again." });
});

authRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: PUBLIC_USER_FIELDS });
  if (!user) throw ApiError.notFound("User not found");
  res.status(200).json({ user });
});

authRouter.patch("/me", requireAuth, validate({ body: updateProfileSchema }), async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: req.body, select: PUBLIC_USER_FIELDS });
  res.status(200).json({ user });
});
