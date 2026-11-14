import request from "supertest";
import { createApp } from "@/app";
import { prisma } from "@/lib/prisma";
import * as moderationService from "@/modules/moderation/moderation.service";

/**
 * Proves a ban takes effect immediately for a session that was already
 * authenticated BEFORE the ban happened — i.e. requireAuth re-checks live
 * account status on every request instead of trusting a still-unexpired
 * access token. Without this, a banned user keeps full API access for up to
 * the access token's TTL (15 minutes by default).
 */
describe("immediate ban enforcement", () => {
  const app = createApp();
  const runId = Date.now();
  const email = `ban-enforce-${runId}@example.com`;
  const username = `banenforce${runId}`;
  const password = "TestPassword123";
  const agent = request.agent(app);

  it("allows a protected request before the ban", async () => {
    await agent.post("/api/auth/signup").send({ email, username, password });
    const loginRes = await agent.post("/api/auth/login").send({ email, password });
    expect(loginRes.status).toBe(200);

    const meRes = await agent.get("/api/auth/me");
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.username).toBe(username);
  });

  it("rejects the SAME already-issued session the moment the account is banned, without a fresh login", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    // Ban directly via the service (bypassing the 3-warning flow) to isolate this test
    // from moderation.service's own warning-count logic, which is covered elsewhere.
    await moderationService.banUser(user.id);

    // Reuses the SAME agent (same cookies / access token) issued before the ban.
    const meRes = await agent.get("/api/auth/me");
    expect(meRes.status).toBe(403);
    expect(meRes.body.error.code).toBe("ACCOUNT_BANNED");
  });

  it("also rejects refresh-token exchange for a banned user", async () => {
    const refreshRes = await agent.post("/api/auth/refresh");
    expect(refreshRes.status).toBe(401);
  });
});

describe("requireAuth preserves role-based authorization for non-banned users", () => {
  const app = createApp();
  const runId = Date.now();
  const shortId = runId.toString(36);
  const adminEmail = `ban-enforce-admin-${runId}@example.com`;
  const adminUsername = `adm${shortId}`;
  const targetEmail = `ban-enforce-target-${runId}@example.com`;
  const targetUsername = `tgt${shortId}`;
  const password = "TestPassword123";
  const adminAgent = request.agent(app);

  it("lets an ADMIN account use the admin-only manual ban endpoint", async () => {
    await adminAgent.post("/api/auth/signup").send({ email: adminEmail, username: adminUsername, password });
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });
    await prisma.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
    await adminAgent.post("/api/auth/login").send({ email: adminEmail, password });

    const targetAgent = request.agent(app);
    await targetAgent.post("/api/auth/signup").send({ email: targetEmail, username: targetUsername, password });

    const banRes = await adminAgent.post(`/api/users/${targetUsername}/ban`);
    expect(banRes.status).toBe(204);

    const target = await prisma.user.findUniqueOrThrow({ where: { email: targetEmail } });
    expect(target.status).toBe("BANNED");
  });

  it("rejects a non-admin account from the same endpoint", async () => {
    const nonAdminEmail = `ban-enforce-nonadmin-${runId}@example.com`;
    const nonAdminUsername = `usr${shortId}`;
    const nonAdminAgent = request.agent(app);
    await nonAdminAgent.post("/api/auth/signup").send({ email: nonAdminEmail, username: nonAdminUsername, password });
    await nonAdminAgent.post("/api/auth/login").send({ email: nonAdminEmail, password });

    const res = await nonAdminAgent.post(`/api/users/${adminUsername}/ban`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ADMIN_ONLY");
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
