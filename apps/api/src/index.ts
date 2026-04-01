import "dotenv/config";
import { env } from "./config/env.js";
import { startServer } from "./http/server.js";
import { prisma } from "./lib/prisma.js";

async function bootstrap() {
  try {
    await prisma.$connect();
    startServer();
  } catch (error) {
    console.error("[api] failed to start", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await prisma.$disconnect();
    console.log(`[api] disconnected from database on ${signal}`);
    process.exit(0);
  });
}

console.log(`[api] bootstrapping with port ${env.port}`);
void bootstrap();
