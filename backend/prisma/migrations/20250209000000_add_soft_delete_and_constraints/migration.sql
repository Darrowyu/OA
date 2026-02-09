-- Add soft delete and security constraints migration
-- Generated: 2025-02-09

-- ============================================
-- 1. Add deletedAt field to User table
-- ============================================
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "User_deletedAt_idx" ON "User"("deletedAt");

-- ============================================
-- 2. Add deletedAt field to Application table
-- ============================================
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Application_deletedAt_idx" ON "Application"("deletedAt");

-- ============================================
-- 3. Add deletedAt field to Equipment table
-- ============================================
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Equipment_deletedAt_idx" ON "Equipment"("deletedAt");

-- ============================================
-- 4. Update field length constraints for User table
-- ============================================
-- Note: Prisma will handle these at application level
-- PostgreSQL column type changes for VARCHAR constraints
ALTER TABLE "User" ALTER COLUMN "name" TYPE VARCHAR(100);
ALTER TABLE "User" ALTER COLUMN "email" TYPE VARCHAR(255);
ALTER TABLE "User" ALTER COLUMN "password" TYPE VARCHAR(255);

-- ============================================
-- 5. Comments for sensitive fields (PostgreSQL comments)
-- ============================================
COMMENT ON COLUMN "User"."password" IS '已哈希存储，请勿明文存储';
COMMENT ON COLUMN "UserPreference"."twoFactorSecret" IS '需应用层加密存储';
COMMENT ON COLUMN "Equipment"."healthScore" IS '健康度 0-100（应用层验证范围）';

-- ============================================
-- Migration complete
-- ============================================
