-- Stage 2 authentication identity and per-user AI usage tracking.
-- This migration is additive and preserves all existing users and content.

ALTER TABLE "User"
ADD COLUMN "clerkUserId" TEXT,
ADD COLUMN "imageUrl" TEXT;

CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");

CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiUsage_userId_day_key" ON "AiUsage"("userId", "day");
CREATE INDEX "AiUsage_day_idx" ON "AiUsage"("day");

ALTER TABLE "AiUsage"
ADD CONSTRAINT "AiUsage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
