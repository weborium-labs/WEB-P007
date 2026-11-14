-- CreateTable
CREATE TABLE "AuthCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthCode_codeHash_key" ON "AuthCode"("codeHash");

-- CreateIndex
CREATE INDEX "AuthCode_userId_idx" ON "AuthCode"("userId");

-- CreateIndex
CREATE INDEX "AuthCode_expiresAt_idx" ON "AuthCode"("expiresAt");

-- Case-insensitive username uniqueness.
--
-- Prisma 7 cannot express index-on-expression in the schema, so this index is
-- authored in raw SQL. It is intentionally NOT representable in schema.prisma:
-- keep this migration as the source of truth and never let a generated
-- migration drop "User_username_lower_key".
--
-- Fail loudly instead of migrating over identities that differ only by case.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "User"
        GROUP BY lower("username")
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot enforce case-insensitive username uniqueness: existing usernames differ only by case.';
    END IF;
END $$;

CREATE UNIQUE INDEX "User_username_lower_key" ON "User"(lower("username"));
