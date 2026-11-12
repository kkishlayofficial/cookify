import request from "supertest";
import { createApp } from "@/app";
import { prisma } from "@/lib/prisma";

/**
 * End-to-end smoke test covering the riskiest cross-cutting logic: auth,
 * recipe search filters, rating aggregation, and the NSFW-comment ->
 * warning -> 3-strikes ban cascade. Runs against the real local dev
 * database (no mocks), using a unique email/username per run so it's safe
 * to re-run without manual cleanup.
 */
describe("COOKify backend integration", () => {
  const app = createApp();
  const runId = Date.now();
  const email = `test-${runId}@example.com`;
  const username = `tester${runId}`;
  const password = "TestPassword123";
  let recipeId: string;
  const agent = request.agent(app);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("signs up a new user", async () => {
    const res = await agent.post("/api/auth/signup").send({ email, username, password });
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe(username);
  });

  it("logs in and receives a session cookie", async () => {
    const res = await agent.post("/api/auth/login").send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.twoFactorRequired).toBe(false);
  });

  it("creates a recipe with ingredients and utensils", async () => {
    const res = await agent.post("/api/recipes").send({
      title: "Integration Test Curry",
      instructions: ["Step one", "Step two"],
      dietaryType: "VEGETARIAN",
      prepTimeMins: 10,
      cookTimeMins: 20,
      costPerServing: 3,
      calories: 400,
      ingredients: [{ name: "Chickpeas" }, { name: "Cream", optional: true }],
      utensils: ["Pot"],
    });
    expect(res.status).toBe(201);
    recipeId = res.body.recipe.id;
    expect(res.body.recipe.totalTimeMins).toBe(30);
  });

  it("finds the recipe when searching by ingredients the user has", async () => {
    const res = await agent.get("/api/recipes").query({ ingredients: ["chickpeas"] });
    expect(res.status).toBe(200);
    expect(res.body.items.some((r: { id: string }) => r.id === recipeId)).toBe(true);
  });

  it("excludes the recipe when a required ingredient is missing", async () => {
    const res = await agent.get("/api/recipes").query({ ingredients: ["flour"] });
    expect(res.body.items.some((r: { id: string }) => r.id === recipeId)).toBe(false);
  });

  it("rates the recipe and updates the aggregate", async () => {
    const res = await agent.post(`/api/recipes/${recipeId}/rating`).send({ stars: 4 });
    expect(res.status).toBe(200);
    expect(res.body.avgRating).toBe(4);
    expect(res.body.ratingCount).toBe(1);
  });

  it("blocks an NSFW comment and issues a warning", async () => {
    const res = await agent.post(`/api/comments/recipe/${recipeId}`).send({ body: "this is fucking terrible" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("COMMENT_BLOCKED_NSFW");

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.warningCount).toBe(1);
  });

  it("bans the account after the 3rd warning and hides its recipes", async () => {
    await agent.post(`/api/comments/recipe/${recipeId}`).send({ body: "fuck this" });
    await agent.post(`/api/comments/recipe/${recipeId}`).send({ body: "this is shit" });

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.status).toBe("BANNED");

    const searchRes = await request(app).get("/api/recipes").query({ q: "Integration Test Curry" });
    expect(searchRes.body.items.some((r: { id: string }) => r.id === recipeId)).toBe(false);

    const loginRes = await request(app).post("/api/auth/login").send({ email, password });
    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.code).toBe("ACCOUNT_BANNED");
  });
});
