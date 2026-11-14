-- Allow half-star ratings (0.5 increments): widen Rating.stars from Int to Decimal(2,1).
ALTER TABLE "Rating" ALTER COLUMN "stars" SET DATA TYPE DECIMAL(2,1) USING "stars"::decimal(2,1);
