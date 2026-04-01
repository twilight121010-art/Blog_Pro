import type { HealthCheckResponse } from "@blog/shared";
import { prisma } from "../../lib/prisma.js";

export async function getHealthCheck(): Promise<HealthCheckResponse> {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return {
      status: "ok",
      service: "api",
      time: new Date().toISOString(),
      database: {
        provider: "sqlite",
        status: "connected",
      },
      modules: [
        "health",
        "bootstrap-overview",
        "auth",
        "blog",
        "uploads",
        "users",
        "user_profiles",
        "user_identities",
        "sessions",
        "posts",
        "post_comments",
        "post_likes",
        "files",
      ],
    };
  } catch {
    return {
      status: "error",
      service: "api",
      time: new Date().toISOString(),
      database: {
        provider: "sqlite",
        status: "error",
      },
      modules: ["health", "bootstrap-overview", "auth", "blog", "uploads"],
    };
  }
}
