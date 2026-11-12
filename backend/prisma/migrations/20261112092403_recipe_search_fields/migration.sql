/*
  Warnings:

  - Added the required column `totalTimeMins` to the `Recipe` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "popularityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalTimeMins" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "Recipe_popularityScore_idx" ON "Recipe"("popularityScore");

-- CreateIndex
CREATE INDEX "Recipe_totalTimeMins_idx" ON "Recipe"("totalTimeMins");

-- CreateIndex
CREATE INDEX "Recipe_calories_idx" ON "Recipe"("calories");
