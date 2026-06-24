ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "email" TEXT,
  ADD COLUMN IF NOT EXISTS "username" TEXT,
  ADD COLUMN IF NOT EXISTS "app_settings" JSONB NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS "profiles_email_key" ON "profiles"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_username_key" ON "profiles"("username");

CREATE TABLE IF NOT EXISTS "user_app_states" (
  "user_id" UUID NOT NULL,
  "data" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_app_states_pkey" PRIMARY KEY ("user_id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_app_states_user_id_fkey'
  ) THEN
    ALTER TABLE "user_app_states"
      ADD CONSTRAINT "user_app_states_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "profiles"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
