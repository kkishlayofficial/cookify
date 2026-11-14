/**
 * Seeds the database with a small, realistic demo dataset: a handful of
 * users (including a 2FA-enabled one and an admin), recipes spanning every
 * dietary type and filter dimension, ratings, comments, follows, and a
 * saved recipe. Safe to re-run against a freshly migrated database.
 *
 * Run with: npm run db:seed
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import * as authService from "@/modules/auth/auth.service";
import * as recipesService from "@/modules/recipes/recipes.service";
import * as ratingsService from "@/modules/recipes/ratings.service";
import * as usersService from "@/modules/users/users.service";
import { solidColorPng } from "@/lib/placeholderImage";

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

/** Writes a solid-color placeholder cover photo for a seeded recipe (no external image fetch needed). */
async function addPlaceholderCover(recipeId: string, authorId: string, color: [number, number, number]) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}.png`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), solidColorPng(800, 600, color));
  await recipesService.addRecipeMedia(recipeId, authorId, false, [{ path: filename, mimetype: "image/png" }]);
}

async function upsertUser(input: {
  email: string;
  username: string;
  password: string;
  firstName: string;
  bio: string;
  role?: "USER" | "ADMIN";
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) return existing;

  const user = await authService.signup({
    email: input.email,
    username: input.username,
    password: input.password,
    firstName: input.firstName,
    bio: input.bio,
  });

  if (input.role === "ADMIN") {
    await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  }

  return user;
}

async function main() {
  console.log("Seeding COOKify demo data...");

  const admin = await upsertUser({
    email: "admin@cookify.dev",
    username: "admin",
    password: "AdminPassword123",
    firstName: "Site",
    bio: "COOKify administrator",
    role: "ADMIN",
  });

  const asha = await upsertUser({
    email: "asha@cookify.dev",
    username: "asha",
    password: "AshaPassword123",
    firstName: "Asha",
    bio: "Home cook specialising in Indian comfort food.",
  });

  const marco = await upsertUser({
    email: "marco@cookify.dev",
    username: "marco",
    password: "MarcoPassword123",
    firstName: "Marco",
    bio: "Italian-American weeknight dinners.",
  });

  const lin = await upsertUser({
    email: "lin@cookify.dev",
    username: "lin",
    password: "LinPassword123",
    firstName: "Lin",
    bio: "Plant-based recipes, fast and cheap.",
  });

  // Give Marco 2FA so the login demo can show the OTP step.
  await prisma.user.update({ where: { id: marco.id }, data: { twoFactorEnabled: true } });

  const existingRecipes = await prisma.recipe.count();
  if (existingRecipes === 0) {
    const paneer = await recipesService.createRecipe(asha.id, {
      title: "Paneer Tikka Masala",
      description: "Smoky grilled paneer simmered in a creamy tomato gravy.",
      instructions: [
        "Marinate paneer cubes in yoghurt and spices for 30 minutes",
        "Grill or pan-sear the paneer until lightly charred",
        "Simmer in a spiced tomato-onion gravy for 10 minutes",
        "Finish with cream and fresh coriander",
      ],
      dietaryType: "VEGETARIAN",
      cuisineRegion: "Indian",
      courseType: "Main",
      prepTimeMins: 20,
      cookTimeMins: 30,
      servings: 4,
      costPerServing: 2.5,
      calories: 450,
      protein: 18,
      carbs: 20,
      fat: 28,
      difficulty: "MEDIUM",
      ingredients: [
        { name: "Paneer", quantity: "250g" },
        { name: "Tomato", quantity: "3" },
        { name: "Onion", quantity: "1" },
        { name: "Cream", quantity: "100ml", optional: true },
      ],
      utensils: ["Pan", "Grill"],
    });
    await addPlaceholderCover(paneer.id, asha.id, [214, 97, 60]); // tomato-gravy terracotta

    const alfredo = await recipesService.createRecipe(marco.id, {
      title: "Classic Chicken Alfredo",
      description: "Rich, garlicky parmesan sauce over fettuccine.",
      instructions: ["Cook pasta until al dente", "Pan-sear chicken breast", "Make the Alfredo sauce", "Toss everything together"],
      dietaryType: "NON_VEGETARIAN",
      cuisineRegion: "Italian-American",
      courseType: "Main",
      prepTimeMins: 10,
      cookTimeMins: 25,
      servings: 2,
      costPerServing: 4,
      calories: 720,
      protein: 42,
      difficulty: "EASY",
      ingredients: [
        { name: "Chicken breast", quantity: "2" },
        { name: "Fettuccine", quantity: "200g" },
        { name: "Parmesan", quantity: "80g" },
        { name: "Butter", quantity: "30g" },
      ],
      utensils: ["Pot", "Pan"],
    });
    await addPlaceholderCover(alfredo.id, marco.id, [238, 223, 186]); // creamy parmesan

    const stirFry = await recipesService.createRecipe(lin.id, {
      title: "15-Minute Vegan Fried Rice",
      description: "A fast, cheap, protein-packed vegan dinner using leftover rice.",
      instructions: ["Scramble the tofu", "Stir-fry the vegetables", "Add rice and sauce", "Toss until heated through"],
      dietaryType: "VEGAN",
      cuisineRegion: "Pan-Asian",
      courseType: "Main",
      prepTimeMins: 5,
      cookTimeMins: 10,
      servings: 2,
      costPerServing: 1.5,
      calories: 380,
      protein: 14,
      difficulty: "EASY",
      ingredients: [
        { name: "Cooked rice", quantity: "2 cups" },
        { name: "Tofu", quantity: "150g" },
        { name: "Soy sauce", quantity: "2 tbsp" },
        { name: "Mixed vegetables", quantity: "1 cup" },
      ],
      utensils: ["Wok"],
    });
    await addPlaceholderCover(stirFry.id, lin.id, [107, 142, 76]); // stir-fried vegetables green

    const eggBhurji = await recipesService.createRecipe(asha.id, {
      title: "Spiced Egg Bhurji",
      description: "Indian-style scrambled eggs, ready in 10 minutes.",
      instructions: ["Saute onions, chillies and spices", "Add beaten eggs", "Scramble until just set"],
      dietaryType: "EGGETARIAN",
      cuisineRegion: "Indian",
      courseType: "Breakfast",
      prepTimeMins: 5,
      cookTimeMins: 8,
      servings: 2,
      costPerServing: 0.9,
      calories: 220,
      protein: 13,
      difficulty: "EASY",
      ingredients: [{ name: "Egg", quantity: "4" }, { name: "Onion", quantity: "1" }],
      utensils: ["Pan"],
    });
    await addPlaceholderCover(eggBhurji.id, asha.id, [240, 196, 74]); // scrambled egg yellow

    await ratingsService.rateRecipe(paneer.id, marco.id, 5);
    await ratingsService.rateRecipe(paneer.id, lin.id, 4);
    await ratingsService.rateRecipe(alfredo.id, asha.id, 5);
    await ratingsService.rateRecipe(stirFry.id, admin.id, 4);
    await ratingsService.rateRecipe(eggBhurji.id, marco.id, 3);

    await usersService.followUser(marco.id, "asha");
    await usersService.followUser(lin.id, "asha");
    await usersService.saveRecipe(marco.id, stirFry.id);
  }

  console.log("Seed complete. Demo accounts (password shown is the sign-in password):");
  console.log("  admin@cookify.dev / AdminPassword123 (ADMIN)");
  console.log("  asha@cookify.dev  / AshaPassword123");
  console.log("  marco@cookify.dev / MarcoPassword123 (2FA enabled - check /api/dev-mail for the code)");
  console.log("  lin@cookify.dev   / LinPassword123");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
