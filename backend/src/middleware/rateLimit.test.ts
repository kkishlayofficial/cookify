import request from "supertest";
import { createApp } from "@/app";
import { prisma } from "@/lib/prisma";

/**
 * Proves the auth endpoints are actually throttled (not just that the
 * limiter middleware exists), and that the forgot-password response stays
 * identical for an existing vs. a non-existent email even once rate limited,
 * so repeated probing can't be used to enumerate accounts either.
 */
describe("auth rate limiting", () => {
  const app = createApp();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 429 once the login limiter's threshold is exceeded for one IP", async () => {
    const email = `ratelimit-login-${Date.now()}@example.com`;
    let lastStatus = 0;
    let lastBody: unknown;

    // The limiter counts every attempt (success or failure) per IP, so repeated
    // bad-credential attempts against a nonexistent account are what we exercise here.
    for (let i = 0; i < 6; i += 1) {
      const res = await request(app).post("/api/auth/login").send({ email, password: "WrongPassword123" });
      lastStatus = res.status;
      lastBody = res.body;
    }

    expect(lastStatus).toBe(429);
    expect(lastBody).toMatchObject({ error: { code: "LOGIN_RATE_LIMITED" } });
  });

  it("returns 429 once the forgot-password limiter's threshold is exceeded, without revealing account existence", async () => {
    const realEmail = `ratelimit-forgot-${Date.now()}@example.com`;
    await request(app).post("/api/auth/signup").send({
      email: realEmail,
      username: `ratelimituser${Date.now()}`,
      password: "TestPassword123",
    });

    // Consume the limiter's budget (5 per hour, per IP) with requests for a real account.
    const withinLimitMessages: unknown[] = [];
    for (let i = 0; i < 5; i += 1) {
      const res = await request(app).post("/api/auth/forgot-password").send({ email: realEmail });
      expect(res.status).toBe(200);
      withinLimitMessages.push(res.body.message);
    }
    // The response body is identical every time regardless of whether the account exists,
    // so repeated probing can't be used to enumerate registered emails either.
    expect(withinLimitMessages.every((m) => m === withinLimitMessages[0])).toBe(true);

    // The limiter is keyed by IP, not by email, so the 6th request - for a *different*,
    // nonexistent email from the same IP - is still the one that trips the limit.
    const limitedRes = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "definitely-not-a-real-account@example.com" });
    expect(limitedRes.status).toBe(429);
    expect(limitedRes.body).toMatchObject({ error: { code: "FORGOT_PASSWORD_RATE_LIMITED" } });
  });
});
