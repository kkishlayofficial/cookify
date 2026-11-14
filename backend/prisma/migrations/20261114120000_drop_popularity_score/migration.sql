-- Popularity is now computed live at query time instead of stored on the row,
-- so stale scores no longer outrank genuinely popular recipes.
DROP INDEX "Recipe_popularityScore_idx";

ALTER TABLE "Recipe" DROP COLUMN "popularityScore";
