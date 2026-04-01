-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userCode" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "securityQuestion" TEXT,
    "securityAnswerHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" (
    "avatarUrl",
    "createdAt",
    "id",
    "nickname",
    "securityAnswerHash",
    "securityQuestion",
    "status",
    "updatedAt",
    "userCode",
    "username"
)
SELECT
    "avatarUrl",
    "createdAt",
    "id",
    "nickname",
    "securityAnswerHash",
    "securityQuestion",
    "status",
    "updatedAt",
    "userCode",
    LOWER('user_' || "userCode")
FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_userCode_key" ON "User"("userCode");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
UPDATE "UserIdentity"
SET
    "provider" = 'ACCOUNT_USERNAME',
    "providerUserId" = (
        SELECT "username"
        FROM "User"
        WHERE "User"."id" = "UserIdentity"."userId"
    )
WHERE "isPrimary" = 1;
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
