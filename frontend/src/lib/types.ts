export type Role = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "BANNED";
export type DietaryType = "VEGAN" | "VEGETARIAN" | "EGGETARIAN" | "PESCETARIAN" | "JAIN" | "NON_VEGETARIAN";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type SortOption = "popularity" | "newest" | "rating";

export type PublicUser = {
  id: string;
  email: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  role: Role;
  status: UserStatus;
  twoFactorEnabled: boolean;
  preferredLanguage: string;
  createdAt: string;
};

export type RecipeMedia = {
  id: string;
  type: "PHOTO" | "VIDEO";
  url: string;
  order: number;
};

export type RecipeAuthor = {
  id: string;
  username: string;
  avatarUrl?: string | null;
};

export type RecipeIngredient = {
  quantity?: string | null;
  optional: boolean;
  ingredient: { id: string; name: string };
};

export type RecipeUtensil = {
  utensil: { id: string; name: string };
};

export type Recipe = {
  id: string;
  title: string;
  description?: string | null;
  instructions: string[];
  authorId: string;
  author: RecipeAuthor;
  dietaryType: DietaryType;
  cuisineRegion?: string | null;
  courseType?: string | null;
  prepTimeMins: number;
  cookTimeMins: number;
  totalTimeMins: number;
  servings: number;
  costPerServing: string;
  calories: number;
  protein?: string | null;
  carbs?: string | null;
  fat?: string | null;
  difficulty: Difficulty;
  viewCount: number;
  avgRating: string;
  ratingCount: number;
  createdAt: string;
  media: RecipeMedia[];
  ingredients?: RecipeIngredient[];
  utensils?: RecipeUtensil[];
};

export type SearchResult = {
  items: Recipe[];
  total: number;
  page: number;
  pageSize: number;
};

export type Comment = {
  id: string;
  recipeId: string;
  userId: string;
  body: string;
  createdAt: string;
  user: { id: string; username: string; avatarUrl?: string | null };
};

export type NotificationItem = {
  id: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type PublicProfile = {
  id: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  isFollowing: boolean;
  _count: { followers: number; following: number; recipes: number };
};

export type Conversation = {
  id: string;
  otherUser: { id: string; username: string; avatarUrl?: string | null } | null;
  lastMessage: { id: string; body: string; createdAt: string; senderId: string } | null;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender: { id: string; username: string; avatarUrl?: string | null };
};

export type RecipeFilters = {
  q: string;
  ingredients: string[];
  utensils: string[];
  dietaryType: DietaryType[];
  cuisineRegion: string;
  courseType: string;
  costRange: [number, number];
  timeRange: [number, number];
  calorieRange: [number, number];
  sort: SortOption;
};

export const DEFAULT_FILTERS: RecipeFilters = {
  q: "",
  ingredients: [],
  utensils: [],
  dietaryType: [],
  cuisineRegion: "",
  courseType: "",
  costRange: [0, 20],
  timeRange: [0, 180],
  calorieRange: [0, 2000],
  sort: "newest",
};
