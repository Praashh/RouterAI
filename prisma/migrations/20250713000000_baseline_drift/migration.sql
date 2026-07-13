-- These columns were added via `prisma db push` and already exist in the database.
-- This migration file exists only to bring the migration history in sync.

ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "modelId" TEXT;
