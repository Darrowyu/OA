-- CreateEnum
CREATE TYPE "ApplicationType" AS ENUM ('STANDARD', 'PRODUCT_DEVELOPMENT', 'FEASIBILITY_STUDY', 'BUSINESS_TRIP', 'OTHER');

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "customFields" JSONB,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "evaluationItems" JSONB,
ADD COLUMN     "evaluationResult" TEXT,
ADD COLUMN     "formType" TEXT,
ADD COLUMN     "highAmountNotified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "projectContent" JSONB,
ADD COLUMN     "projectName" TEXT,
ADD COLUMN     "projectNo" TEXT,
ADD COLUMN     "projectProposerId" TEXT,
ADD COLUMN     "projectReviewerId" TEXT,
ADD COLUMN     "projectSources" TEXT[],
ADD COLUMN     "selectedSupervisorId" TEXT,
ADD COLUMN     "tripDestination" TEXT,
ADD COLUMN     "tripEndDate" TIMESTAMP(3),
ADD COLUMN     "tripPurpose" TEXT,
ADD COLUMN     "tripStartDate" TIMESTAMP(3),
ADD COLUMN     "type" "ApplicationType" NOT NULL DEFAULT 'STANDARD';

-- CreateIndex
CREATE UNIQUE INDEX "Application_projectNo_key" ON "Application"("projectNo");

-- CreateIndex
CREATE INDEX "Application_type_idx" ON "Application"("type");

-- CreateIndex
CREATE INDEX "Application_projectNo_idx" ON "Application"("projectNo");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_projectReviewerId_fkey" FOREIGN KEY ("projectReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_projectProposerId_fkey" FOREIGN KEY ("projectProposerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
