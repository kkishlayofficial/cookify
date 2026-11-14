import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/apiError";
import { createNotification } from "@/modules/notifications/notifications.service";
import { RECIPE_CARD_INCLUDE } from "@/modules/recipes/recipes.service";

const PUBLIC_PROFILE_SELECT = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
} as const;

/** Case-insensitive username/first-name prefix search, used by the chat "new conversation" picker. Excludes the viewer. */
export async function searchUsers(query: string, viewerId?: string) {
  if (!query.trim()) return [];
  return prisma.user.findMany({
    where: {
      status: "ACTIVE",
      id: viewerId ? { not: viewerId } : undefined,
      OR: [{ username: { contains: query, mode: "insensitive" } }, { firstName: { contains: query, mode: "insensitive" } }],
    },
    select: { id: true, username: true, firstName: true, avatarUrl: true },
    take: 10,
    orderBy: { username: "asc" },
  });
}

export async function getPublicProfile(username: string, viewerId?: string) {
  const user = await prisma.user.findFirst({
    where: { username, status: "ACTIVE" },
    select: {
      ...PUBLIC_PROFILE_SELECT,
      _count: { select: { followers: true, following: true, recipes: { where: { isRemoved: false } } } },
    },
  });
  if (!user) throw ApiError.notFound("User not found");

  const isFollowing = viewerId
    ? Boolean(await prisma.follow.findUnique({ where: { followerId_followedId: { followerId: viewerId, followedId: user.id } } }))
    : false;

  return { ...user, isFollowing };
}

export async function listUserRecipes(username: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw ApiError.notFound("User not found");
  return prisma.recipe.findMany({
    where: { authorId: user.id, isRemoved: false },
    include: RECIPE_CARD_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export async function followUser(followerId: string, followedUsername: string) {
  const followed = await prisma.user.findUnique({ where: { username: followedUsername } });
  if (!followed) throw ApiError.notFound("User not found");
  if (followed.id === followerId) throw ApiError.badRequest("You cannot follow yourself");

  await prisma.follow.upsert({
    where: { followerId_followedId: { followerId, followedId: followed.id } },
    create: { followerId, followedId: followed.id },
    update: {},
  });

  const follower = await prisma.user.findUniqueOrThrow({ where: { id: followerId } });
  await createNotification(
    followed.id,
    "NEW_RECIPE_FROM_FOLLOWED",
    { event: "NEW_FOLLOWER", followerUsername: follower.username },
    { to: followed.email, subject: `${follower.username} started following you on COOKify`, text: `${follower.username} is now following you.` },
  );
}

export async function unfollowUser(followerId: string, followedUsername: string) {
  const followed = await prisma.user.findUnique({ where: { username: followedUsername } });
  if (!followed) throw ApiError.notFound("User not found");
  await prisma.follow.deleteMany({ where: { followerId, followedId: followed.id } });
}

export async function saveRecipe(userId: string, recipeId: string) {
  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe || recipe.isRemoved) throw ApiError.notFound("Recipe not found");
  await prisma.savedRecipe.upsert({
    where: { userId_recipeId: { userId, recipeId } },
    create: { userId, recipeId },
    update: {},
  });
}

export async function unsaveRecipe(userId: string, recipeId: string) {
  await prisma.savedRecipe.deleteMany({ where: { userId, recipeId } });
}

export async function listSavedRecipes(userId: string) {
  const saved = await prisma.savedRecipe.findMany({
    where: { userId },
    include: { recipe: { include: { media: { orderBy: { order: "asc" } }, author: { select: { id: true, username: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return saved.map((s) => s.recipe).filter((r) => !r.isRemoved);
}
