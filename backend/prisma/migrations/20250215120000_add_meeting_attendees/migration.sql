-- 添加会议参会者关联表

-- 创建会议参会者关联表
CREATE TABLE "meeting_attendees" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AttendeeStatus" NOT NULL DEFAULT 'PENDING',
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_attendees_pkey" PRIMARY KEY ("id")
);

-- 创建唯一约束：同一用户在同一会议只能有一条记录
CREATE UNIQUE INDEX "meeting_attendees_meetingId_userId_key" ON "meeting_attendees"("meetingId", "userId");

-- 创建索引
CREATE INDEX "meeting_attendees_userId_idx" ON "meeting_attendees"("userId");
CREATE INDEX "meeting_attendees_meetingId_status_idx" ON "meeting_attendees"("meetingId", "status");

-- 添加外键约束
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_meetingId_fkey"
    FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
