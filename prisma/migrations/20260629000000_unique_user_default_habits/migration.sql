WITH habit_counts AS (
  SELECT
    uh."id",
    uh."user_id",
    uh."template_id",
    uh."created_at",
    COUNT(hc."id") AS completion_count
  FROM "user_habits" uh
  LEFT JOIN "habit_completions" hc ON hc."user_habit_id" = uh."id"
  WHERE uh."template_id" IS NOT NULL
    AND uh."archived_at" IS NULL
  GROUP BY uh."id", uh."user_id", uh."template_id", uh."created_at"
),
ranked_habits AS (
  SELECT
    habit_counts."id",
    FIRST_VALUE(habit_counts."id") OVER (
      PARTITION BY habit_counts."user_id", habit_counts."template_id"
      ORDER BY habit_counts.completion_count DESC, habit_counts."created_at" ASC
    ) AS keeper_id,
    ROW_NUMBER() OVER (
      PARTITION BY habit_counts."user_id", habit_counts."template_id"
      ORDER BY habit_counts.completion_count DESC, habit_counts."created_at" ASC
    ) AS row_number
  FROM habit_counts
),
movable_completions AS (
  SELECT
    hc."id" AS completion_id,
    ranked_habits.keeper_id
  FROM "habit_completions" hc
  JOIN ranked_habits ON ranked_habits."id" = hc."user_habit_id"
  WHERE ranked_habits.row_number > 1
    AND NOT EXISTS (
      SELECT 1
      FROM "habit_completions" existing
      WHERE existing."user_id" = hc."user_id"
        AND existing."user_habit_id" = ranked_habits.keeper_id
        AND existing."local_date" = hc."local_date"
    )
)
UPDATE "habit_completions" hc
SET "user_habit_id" = movable_completions.keeper_id
FROM movable_completions
WHERE hc."id" = movable_completions.completion_id;

WITH habit_counts AS (
  SELECT
    uh."id",
    uh."user_id",
    uh."template_id",
    uh."created_at",
    COUNT(hc."id") AS completion_count
  FROM "user_habits" uh
  LEFT JOIN "habit_completions" hc ON hc."user_habit_id" = uh."id"
  WHERE uh."template_id" IS NOT NULL
    AND uh."archived_at" IS NULL
  GROUP BY uh."id", uh."user_id", uh."template_id", uh."created_at"
),
ranked_habits AS (
  SELECT
    habit_counts."id",
    ROW_NUMBER() OVER (
      PARTITION BY habit_counts."user_id", habit_counts."template_id"
      ORDER BY habit_counts.completion_count DESC, habit_counts."created_at" ASC
    ) AS row_number
  FROM habit_counts
)
DELETE FROM "habit_completions" hc
USING ranked_habits
WHERE ranked_habits."id" = hc."user_habit_id"
  AND ranked_habits.row_number > 1;

WITH habit_counts AS (
  SELECT
    uh."id",
    uh."user_id",
    uh."template_id",
    uh."created_at",
    COUNT(hc."id") AS completion_count
  FROM "user_habits" uh
  LEFT JOIN "habit_completions" hc ON hc."user_habit_id" = uh."id"
  WHERE uh."template_id" IS NOT NULL
    AND uh."archived_at" IS NULL
  GROUP BY uh."id", uh."user_id", uh."template_id", uh."created_at"
),
ranked_habits AS (
  SELECT
    habit_counts."id",
    ROW_NUMBER() OVER (
      PARTITION BY habit_counts."user_id", habit_counts."template_id"
      ORDER BY habit_counts.completion_count DESC, habit_counts."created_at" ASC
    ) AS row_number
  FROM habit_counts
)
UPDATE "user_habits" uh
SET
  "is_active" = false,
  "archived_at" = NOW()
FROM ranked_habits
WHERE ranked_habits."id" = uh."id"
  AND ranked_habits.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "user_habits_user_template_active_key"
ON "user_habits"("user_id", "template_id")
WHERE "template_id" IS NOT NULL AND "archived_at" IS NULL;
