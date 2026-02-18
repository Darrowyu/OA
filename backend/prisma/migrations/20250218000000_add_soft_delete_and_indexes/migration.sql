-- Add soft delete fields
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Document: change isActive to deletedAt
ALTER TABLE "documents" DROP COLUMN IF EXISTS "isActive";
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Add indexes for soft delete fields
CREATE INDEX IF NOT EXISTS "tasks_deletedAt_idx" ON "tasks"("deletedAt");
CREATE INDEX IF NOT EXISTS "meetings_deletedAt_idx" ON "meetings"("deletedAt");
CREATE INDEX IF NOT EXISTS "announcements_deletedAt_idx" ON "announcements"("deletedAt");
CREATE INDEX IF NOT EXISTS "documents_deletedAt_idx" ON "documents"("deletedAt");

-- Add composite indexes
CREATE INDEX IF NOT EXISTS "Application_status_priority_idx" ON "Application"("status", "priority");
CREATE INDEX IF NOT EXISTS "User_email_isActive_idx" ON "User"("email", "isActive");
CREATE INDEX IF NOT EXISTS "meeting_attendees_userId_status_idx" ON "meeting_attendees"("userId", "status");

-- Add unique constraint on TaskProject.name
ALTER TABLE "task_projects" ADD CONSTRAINT "task_projects_name_key" UNIQUE ("name");

-- Update Task parent relation onDelete behavior (handled in Prisma layer)
-- Note: Prisma will handle the CASCADE behavior in application layer
