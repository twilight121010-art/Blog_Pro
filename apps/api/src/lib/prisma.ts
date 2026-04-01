import { PrismaClient } from "@prisma/client";

declare global {
  var __checkinPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__checkinPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__checkinPrisma = prisma;
}
