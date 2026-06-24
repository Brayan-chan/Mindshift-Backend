-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "display_name" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "timezone" TEXT NOT NULL DEFAULT 'America/Merida',
    "current_identity" TEXT,
    "target_identity" TEXT,
    "why_transform" TEXT,
    "core_values" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "daily_xp_goal" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_templates" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title_i18n" JSONB NOT NULL,
    "description_i18n" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "habit_type" TEXT NOT NULL,
    "routine_period" TEXT NOT NULL,
    "default_xp" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "habit_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_habits" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "template_id" UUID,
    "custom_title" TEXT,
    "category" TEXT NOT NULL,
    "habit_type" TEXT NOT NULL,
    "routine_period" TEXT NOT NULL,
    "target_per_week" INTEGER NOT NULL DEFAULT 7,
    "xp_reward" INTEGER NOT NULL DEFAULT 10,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_habits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "habit_templates_slug_key" ON "habit_templates"("slug");

-- CreateIndex
CREATE INDEX "user_habits_user_id_is_active_idx" ON "user_habits"("user_id", "is_active");

-- AddForeignKey
ALTER TABLE "user_habits" ADD CONSTRAINT "user_habits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_habits" ADD CONSTRAINT "user_habits_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "habit_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

