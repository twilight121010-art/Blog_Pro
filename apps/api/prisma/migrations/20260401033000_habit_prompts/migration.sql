CREATE TABLE "habit_prompts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "habitId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" DATETIME,
    CONSTRAINT "habit_prompts_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habits" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "habit_prompts_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "habit_prompts_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "habit_prompts_habitId_createdAt_idx" ON "habit_prompts"("habitId", "createdAt");
CREATE INDEX "habit_prompts_fromUserId_createdAt_idx" ON "habit_prompts"("fromUserId", "createdAt");
CREATE INDEX "habit_prompts_toUserId_createdAt_idx" ON "habit_prompts"("toUserId", "createdAt");
