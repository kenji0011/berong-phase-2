-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('guest', 'kid', 'adult', 'professional', 'admin');

-- CreateEnum
CREATE TYPE "ContentCategory" AS ENUM ('kids', 'adult', 'professional');

-- CreateEnum
CREATE TYPE "QuickQuestionCategory" AS ENUM ('emergency', 'prevention', 'equipment', 'general');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER,
    "role" "UserRole" NOT NULL DEFAULT 'guest',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "barangay" TEXT,
    "school" TEXT,
    "schoolOther" TEXT,
    "occupation" TEXT,
    "occupationOther" TEXT,
    "gender" TEXT,
    "gradeLevel" TEXT,
    "preTestScore" INTEGER,
    "postTestScore" INTEGER,
    "preTestCompletedAt" TIMESTAMP(3),
    "postTestCompletedAt" TIMESTAMP(3),
    "engagementPoints" INTEGER NOT NULL DEFAULT 0,
    "totalTimeSpentMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPrivacyConsent" BOOLEAN NOT NULL DEFAULT false,
    "profileCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_questions" (
    "id" SERIAL NOT NULL,
    "category" "QuickQuestionCategory" NOT NULL,
    "questionText" TEXT NOT NULL,
    "responseText" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "category" "ContentCategory" NOT NULL,
    "authorId" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "youtubeId" TEXT NOT NULL,
    "category" "ContentCategory" NOT NULL,
    "duration" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kids_modules" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dayNumber" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kids_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_progress" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_results" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "quizType" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FireCodeSection" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "sectionNum" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentSectionId" INTEGER,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FireCodeSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carousel_images" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "altText" TEXT,
    "imageUrl" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carousel_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safescape_progress" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "moduleNum" INTEGER NOT NULL,
    "sectionData" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safescape_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_questions" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'Medium',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "forRoles" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_answers" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "selectedAnswer" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "testType" TEXT NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "points" INTEGER NOT NULL DEFAULT 0,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_cache" (
    "id" SERIAL NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "cacheData" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floor_plans" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "gridData" JSONB NOT NULL,
    "thumbnail" TEXT,
    "originalImage" TEXT,
    "userId" INTEGER NOT NULL,
    "uploaderName" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "clonedFromId" INTEGER,
    "gridWidth" INTEGER NOT NULL DEFAULT 256,
    "gridHeight" INTEGER NOT NULL DEFAULT 256,
    "exitCount" INTEGER NOT NULL DEFAULT 0,
    "processingMethod" TEXT NOT NULL DEFAULT 'unet',
    "threshold" DOUBLE PRECISION,
    "invertMask" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floor_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_jobs" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,
    "config" JSONB,

    CONSTRAINT "simulation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "blog_posts_category_idx" ON "blog_posts"("category");

-- CreateIndex
CREATE INDEX "blog_posts_authorId_idx" ON "blog_posts"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "kids_modules_dayNumber_key" ON "kids_modules"("dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "user_progress_userId_moduleId_key" ON "user_progress"("userId", "moduleId");

-- CreateIndex
CREATE INDEX "quiz_results_userId_idx" ON "quiz_results"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "safescape_progress_userId_moduleNum_key" ON "safescape_progress"("userId", "moduleNum");

-- CreateIndex
CREATE INDEX "user_answers_userId_idx" ON "user_answers"("userId");

-- CreateIndex
CREATE INDEX "user_answers_questionId_idx" ON "user_answers"("questionId");

-- CreateIndex
CREATE INDEX "engagement_logs_userId_loggedAt_idx" ON "engagement_logs"("userId", "loggedAt");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_cache_cacheKey_key" ON "analytics_cache"("cacheKey");

-- CreateIndex
CREATE INDEX "analytics_cache_cacheKey_expiresAt_idx" ON "analytics_cache"("cacheKey", "expiresAt");

-- CreateIndex
CREATE INDEX "floor_plans_userId_idx" ON "floor_plans"("userId");

-- CreateIndex
CREATE INDEX "floor_plans_isPublic_idx" ON "floor_plans"("isPublic");

-- CreateIndex
CREATE INDEX "floor_plans_clonedFromId_idx" ON "floor_plans"("clonedFromId");

-- CreateIndex
CREATE INDEX "simulation_jobs_status_idx" ON "simulation_jobs"("status");

-- CreateIndex
CREATE INDEX "simulation_jobs_userId_idx" ON "simulation_jobs"("userId");

-- CreateIndex
CREATE INDEX "simulation_jobs_createdAt_idx" ON "simulation_jobs"("createdAt");

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "kids_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_results" ADD CONSTRAINT "quiz_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FireCodeSection" ADD CONSTRAINT "FireCodeSection_parentSectionId_fkey" FOREIGN KEY ("parentSectionId") REFERENCES "FireCodeSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safescape_progress" ADD CONSTRAINT "safescape_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "assessment_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_logs" ADD CONSTRAINT "engagement_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_clonedFromId_fkey" FOREIGN KEY ("clonedFromId") REFERENCES "floor_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "floor_plans" ADD CONSTRAINT "floor_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_jobs" ADD CONSTRAINT "simulation_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

