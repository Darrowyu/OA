-- CreateTable: user_quick_links
CREATE TABLE "user_quick_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_quick_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: user_quick_links_userId_idx
CREATE INDEX "user_quick_links_userId_idx" ON "user_quick_links"("userId");

-- CreateIndex: user_quick_links_sortOrder_idx
CREATE INDEX "user_quick_links_sortOrder_idx" ON "user_quick_links"("sortOrder");

-- AddForeignKey: user_quick_links.userId -> User.id
ALTER TABLE "user_quick_links" ADD CONSTRAINT "user_quick_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
