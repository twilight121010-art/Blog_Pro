-- CreateTable
CREATE TABLE "AppBootstrap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "note" TEXT NOT NULL DEFAULT 'phase-1-bootstrap',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
