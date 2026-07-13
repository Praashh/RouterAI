-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('PENDING', 'CLONING', 'CHUNKING', 'EMBEDDING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "githubBranch" TEXT,
ADD COLUMN     "githubRepo" TEXT;

-- CreateTable
CREATE TABLE "code_chunks" (
    "id" TEXT NOT NULL,
    "repoKey" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT,
    "tokenCount" INTEGER NOT NULL,
    "embedding" vector(384) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "code_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repo_ingestions" (
    "id" TEXT NOT NULL,
    "repoKey" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "status" "IngestionStatus" NOT NULL DEFAULT 'PENDING',
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "processedFiles" INTEGER NOT NULL DEFAULT 0,
    "totalChunks" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repo_ingestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "code_chunks_repoKey_idx" ON "code_chunks"("repoKey");

-- CreateIndex
CREATE UNIQUE INDEX "repo_ingestions_repoKey_key" ON "repo_ingestions"("repoKey");

-- CreateIndex (HNSW for fast cosine similarity search)
CREATE INDEX "code_chunks_embedding_idx" ON "code_chunks" USING hnsw ("embedding" vector_cosine_ops);
