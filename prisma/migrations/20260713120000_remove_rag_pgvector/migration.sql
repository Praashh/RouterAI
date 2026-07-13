-- DropIndex
DROP INDEX IF EXISTS "code_chunks_embedding_idx";
DROP INDEX IF EXISTS "code_chunks_repoKey_idx";
DROP INDEX IF EXISTS "repo_ingestions_repoKey_key";

-- DropTable
DROP TABLE IF EXISTS "code_chunks";
DROP TABLE IF EXISTS "repo_ingestions";

-- AlterTable
ALTER TABLE "Chat" DROP COLUMN IF EXISTS "githubRepo";
ALTER TABLE "Chat" DROP COLUMN IF EXISTS "githubBranch";

-- DropEnum
DROP TYPE IF EXISTS "IngestionStatus";

-- DropExtension
DROP EXTENSION IF EXISTS "vector";
