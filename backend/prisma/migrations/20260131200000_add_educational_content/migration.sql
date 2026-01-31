-- CreateEnum
CREATE TYPE "EducationalContentType" AS ENUM ('VIDEO', 'IMAGE', 'DOCUMENT', 'ARTICLE');

-- CreateEnum
CREATE TYPE "EducationalContentCategory" AS ENUM ('TUTORIAL_SISTEMA', 'BOAS_PRATICAS', 'COMPLIANCE', 'PRODUCAO', 'FINANCEIRO', 'QUALIDADE', 'NOVIDADES');

-- CreateTable
CREATE TABLE "educational_contents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contentType" "EducationalContentType" NOT NULL,
    "contentUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "category" "EducationalContentCategory" NOT NULL,
    "duration" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "educational_contents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "educational_contents_isActive_idx" ON "educational_contents"("isActive");

-- CreateIndex
CREATE INDEX "educational_contents_category_idx" ON "educational_contents"("category");

-- CreateIndex
CREATE INDEX "educational_contents_contentType_idx" ON "educational_contents"("contentType");
