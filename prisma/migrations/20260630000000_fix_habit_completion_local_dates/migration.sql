WITH normalized AS (
  SELECT
    "id",
    ("completed_at" AT TIME ZONE COALESCE(NULLIF("timezone", ''), 'America/Merida'))::date AS "desired_local_date",
    ROW_NUMBER() OVER (
      PARTITION BY
        "user_id",
        "user_habit_id",
        ("completed_at" AT TIME ZONE COALESCE(NULLIF("timezone", ''), 'America/Merida'))::date
      ORDER BY "completed_at" ASC, "id" ASC
    ) AS "row_number"
  FROM "habit_completions"
)
DELETE FROM "habit_completions"
WHERE "id" IN (
  SELECT "id"
  FROM normalized
  WHERE "row_number" > 1
);

UPDATE "habit_completions" AS completion
SET "local_date" = normalized."desired_local_date"
FROM (
  SELECT
    "id",
    ("completed_at" AT TIME ZONE COALESCE(NULLIF("timezone", ''), 'America/Merida'))::date AS "desired_local_date"
  FROM "habit_completions"
) AS normalized
WHERE completion."id" = normalized."id"
  AND completion."local_date" <> normalized."desired_local_date";
