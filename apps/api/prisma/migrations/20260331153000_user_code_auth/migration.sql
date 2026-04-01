PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userCode" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "securityQuestion" TEXT,
    "securityAnswerHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_User" (
    "id",
    "userCode",
    "nickname",
    "avatarUrl",
    "status",
    "securityQuestion",
    "securityAnswerHash",
    "createdAt",
    "updatedAt"
)
SELECT
    "source"."id",
    printf('%04d', (
        SELECT COUNT(*)
        FROM "User" AS "ranked"
        WHERE "ranked"."createdAt" < "source"."createdAt"
           OR ("ranked"."createdAt" = "source"."createdAt" AND "ranked"."id" <= "source"."id")
    )),
    "source"."nickname",
    "source"."avatarUrl",
    "source"."status",
    NULL,
    NULL,
    "source"."createdAt",
    "source"."updatedAt"
FROM "User" AS "source";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";

CREATE UNIQUE INDEX "User_userCode_key" ON "User"("userCode");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
