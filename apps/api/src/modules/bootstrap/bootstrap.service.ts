import type { BootstrapOverviewResponse } from "@blog/shared";
import { prisma } from "../../lib/prisma.js";

const REGISTERED_MODULES = [
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
];

export async function getBootstrapOverview(): Promise<BootstrapOverviewResponse> {
  try {
    const [users, profiles, identities, sessions, posts, comments, likes, files] = await Promise.all([
      prisma.user.count(),
      prisma.userProfile.count(),
      prisma.userIdentity.count(),
      prisma.session.count(),
      prisma.post.count(),
      prisma.postComment.count(),
      prisma.postLike.count(),
      prisma.fileAsset.count(),
    ]);

    return {
      status: "ok",
      time: new Date().toISOString(),
      database: {
        provider: "sqlite",
        status: "connected",
      },
      entities: {
        users,
        profiles,
        identities,
        sessions,
        posts,
        comments,
        likes,
        files,
      },
      contentRoot: "content/posts",
      uploadsRoot: "uploads",
      modules: REGISTERED_MODULES,
    };
  } catch {
    return {
      status: "error",
      time: new Date().toISOString(),
      database: {
        provider: "sqlite",
        status: "error",
      },
      entities: {
        users: 0,
        profiles: 0,
        identities: 0,
        sessions: 0,
        posts: 0,
        comments: 0,
        likes: 0,
        files: 0,
      },
      contentRoot: "content/posts",
      uploadsRoot: "uploads",
      modules: REGISTERED_MODULES,
    };
  }
}
