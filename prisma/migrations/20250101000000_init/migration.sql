-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('linkedin', 'x', 'instagram', 'facebook', 'email', 'ad_copy', 'product_description', 'blog');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'scheduled', 'published', 'archived');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('pending', 'published', 'cancelled');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "industry" TEXT,
    "targetAudience" TEXT,
    "personality" TEXT,
    "tone" TEXT,
    "values" JSONB,
    "preferredPhrases" JSONB,
    "avoidedPhrases" JSONB,
    "writingStyle" TEXT,
    "exampleContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "format" "ContentType" NOT NULL,
    "topic" TEXT,
    "audience" TEXT,
    "objective" TEXT,
    "tone" TEXT,
    "keywords" JSONB,
    "cta" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "sourceContentId" TEXT,
    "variationIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledContent" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "ContentType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Brand_userId_idx" ON "Brand"("userId");

-- CreateIndex
CREATE INDEX "Content_userId_status_idx" ON "Content"("userId", "status");

-- CreateIndex
CREATE INDEX "Content_userId_format_idx" ON "Content"("userId", "format");

-- CreateIndex
CREATE INDEX "Content_brandId_idx" ON "Content"("brandId");

-- CreateIndex
CREATE INDEX "ScheduledContent_userId_scheduledAt_idx" ON "ScheduledContent"("userId", "scheduledAt");

-- CreateIndex
CREATE INDEX "ScheduledContent_contentId_idx" ON "ScheduledContent"("contentId");

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_sourceContentId_fkey" FOREIGN KEY ("sourceContentId") REFERENCES "Content"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledContent" ADD CONSTRAINT "ScheduledContent_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledContent" ADD CONSTRAINT "ScheduledContent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

