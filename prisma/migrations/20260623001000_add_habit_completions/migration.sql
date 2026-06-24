-- CreateTable
CREATE TABLE "habit_completions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "user_habit_id" UUID NOT NULL,
    "local_date" DATE NOT NULL,
    "completed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timezone" TEXT NOT NULL DEFAULT 'America/Merida',
    "client_event_id" UUID,

    CONSTRAINT "habit_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "habit_completions_user_id_user_habit_id_local_date_key" ON "habit_completions"("user_id", "user_habit_id", "local_date");

-- CreateIndex
CREATE UNIQUE INDEX "habit_completions_user_id_client_event_id_key" ON "habit_completions"("user_id", "client_event_id");

-- CreateIndex
CREATE INDEX "habit_completions_user_id_local_date_idx" ON "habit_completions"("user_id", "local_date");

-- AddForeignKey
ALTER TABLE "habit_completions" ADD CONSTRAINT "habit_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_completions" ADD CONSTRAINT "habit_completions_user_habit_id_fkey" FOREIGN KEY ("user_habit_id") REFERENCES "user_habits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
