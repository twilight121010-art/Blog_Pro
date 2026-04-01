import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import type { IncomingMessage } from "node:http";
import { normalize, resolve } from "node:path";
import type {
  AuthProfileUpdateInput,
  AuthSessionResponse,
  SessionUser,
} from "@blog/shared";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import { contentRoot, uploadsRoot } from "../../lib/workspace.js";
import {
  createPasswordHash,
  createSessionToken,
  hashSessionToken,
  verifyPasswordHash,
} from "../../lib/security.js";
import { getBearerToken } from "../../http/request.js";

const SESSION_TTL_DAYS = 30;
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{2,22}[a-z0-9])?$/;

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function normalizeSecurityAnswer(answer: string) {
  return answer.trim().toLowerCase();
}

function assertValidUsername(username: string) {
  if (!USERNAME_PATTERN.test(username)) {
    throw new HttpError(
      400,
      "Username must be 4-24 characters and use only letters, numbers, dots, underscores, or hyphens",
    );
  }
}

function assertStrongPassword(password: string) {
  const normalizedPassword = password.trim();

  if (normalizedPassword.length < 8) {
    throw new HttpError(400, "Password must be at least 8 characters");
  }

  if (!/[A-Za-z]/.test(normalizedPassword) || !/\d/.test(normalizedPassword)) {
    throw new HttpError(400, "Password must include both letters and numbers");
  }
}

type UserLookupRecord = {
  id: string;
  username: string;
  userCode: string;
  nickname: string;
  avatarUrl: string | null;
  status: string;
  bio: string | null;
  region: string | null;
  website: string | null;
};

type LoginRecord = UserLookupRecord & {
  passwordHash: string | null;
};

async function getNextUserCode(
  transaction: Pick<typeof prisma, "$queryRaw"> = prisma,
) {
  const rows = await transaction.$queryRaw<Array<{ userCode: string }>>`
    SELECT "userCode"
    FROM "User"
    ORDER BY CAST("userCode" AS INTEGER) DESC
    LIMIT 1
  `;

  const nextValue = Number.parseInt(rows[0]?.userCode ?? "0", 10) + 1;

  return String(nextValue).padStart(4, "0");
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function isRetryableUserCodeConflict(error: unknown) {
  if (isUniqueConstraintError(error)) {
    return true;
  }

  return error instanceof Error && error.message.includes("User.userCode");
}

function isUsernameConflict(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "meta" in error &&
    typeof (error as { meta?: { target?: unknown } }).meta === "object"
  ) {
    const target = (error as { meta?: { target?: unknown } }).meta?.target;

    if (Array.isArray(target) && target.some((field) => String(field).includes("username"))) {
      return true;
    }

    if (typeof target === "string" && target.includes("username")) {
      return true;
    }
  }

  return error instanceof Error && error.message.includes("User.username");
}

function getClientIp(request: IncomingMessage) {
  return request.socket.remoteAddress ?? null;
}

function resolvePathInRoot(root: string, relativePath: string) {
  const rootPath = resolve(root);
  const absolutePath = resolve(rootPath, normalize(relativePath));

  if (absolutePath.startsWith(`${rootPath}/`)) {
    return absolutePath;
  }

  return null;
}

async function removeFiles(root: string, relativePaths: string[]) {
  const uniquePaths = Array.from(new Set(relativePaths.filter(Boolean)));

  await Promise.all(
    uniquePaths.map(async (relativePath) => {
      const absolutePath = resolvePathInRoot(root, relativePath);

      if (!absolutePath) {
        console.warn("[auth] skipped invalid cleanup path", { root, relativePath });
        return;
      }

      await rm(absolutePath, { force: true });
    }),
  );
}

function buildUserResponse(user: UserLookupRecord): SessionUser {
  return {
    id: user.id,
    username: user.username,
    userCode: user.userCode,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    status: user.status,
    bio: user.bio,
    region: user.region,
    website: user.website,
  };
}

async function createAuthSession(userId: string, request: IncomingMessage) {
  const token = createSessionToken();
  const refreshTokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      refreshTokenHash,
      userAgent: request.headers["user-agent"] ?? null,
      ip: getClientIp(request),
      expiresAt,
    },
  });

  return token;
}

async function findUserWithProfile(userId: string) {
  const rows = await prisma.$queryRaw<UserLookupRecord[]>`
    SELECT
      u."id" AS "id",
      u."username" AS "username",
      u."userCode" AS "userCode",
      u."nickname" AS "nickname",
      u."avatarUrl" AS "avatarUrl",
      u."status" AS "status",
      p."bio" AS "bio",
      p."region" AS "region",
      p."website" AS "website"
    FROM "User" AS u
    LEFT JOIN "UserProfile" AS p
      ON p."userId" = u."id"
    WHERE u."id" = ${userId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function findLoginRecordByUsername(username: string) {
  const rows = await prisma.$queryRaw<LoginRecord[]>`
    SELECT
      u."id" AS "id",
      u."username" AS "username",
      u."userCode" AS "userCode",
      u."nickname" AS "nickname",
      u."avatarUrl" AS "avatarUrl",
      u."status" AS "status",
      p."bio" AS "bio",
      p."region" AS "region",
      p."website" AS "website",
      i."passwordHash" AS "passwordHash"
    FROM "User" AS u
    LEFT JOIN "UserProfile" AS p
      ON p."userId" = u."id"
    LEFT JOIN "UserIdentity" AS i
      ON i."userId" = u."id"
     AND i."isPrimary" = 1
    WHERE u."username" = ${username}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function registerUser(
  request: IncomingMessage,
  input: {
    username?: string;
    password?: string;
    nickname?: string;
    securityQuestion?: string;
    securityAnswer?: string;
  },
): Promise<AuthSessionResponse> {
  const username = normalizeUsername(input.username ?? "");
  const password = input.password?.trim() ?? "";
  const nickname = input.nickname?.trim() ?? "";
  const securityQuestion = input.securityQuestion?.trim() ?? "";
  const securityAnswer = input.securityAnswer?.trim() ?? "";

  assertValidUsername(username);
  assertStrongPassword(password);

  if (!nickname) {
    throw new HttpError(400, "Nickname is required");
  }

  if (!securityQuestion) {
    throw new HttpError(400, "Security question is required");
  }

  if (!securityAnswer) {
    throw new HttpError(400, "Security answer is required");
  }

  let createdUserId: string | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const createdUser = await prisma.$transaction(async (transaction) => {
        const userCode = await getNextUserCode(transaction);
        const userId = randomUUID();
        const now = new Date();

        await transaction.$executeRaw`
          INSERT INTO "User" (
            "id",
            "userCode",
            "username",
            "nickname",
            "status",
            "securityQuestion",
            "securityAnswerHash",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${userId},
            ${userCode},
            ${username},
            ${nickname},
            ${"ACTIVE"},
            ${securityQuestion},
            ${createPasswordHash(normalizeSecurityAnswer(securityAnswer))},
            ${now},
            ${now}
          )
        `;

        await transaction.userProfile.create({
          data: {
            userId,
          },
        });

        await transaction.userIdentity.create({
          data: {
            userId,
            provider: "ACCOUNT_USERNAME",
            providerUserId: username,
            passwordHash: createPasswordHash(password),
            isPrimary: true,
            verifiedAt: new Date(),
          },
        });

        return {
          id: userId,
        };
      });

      createdUserId = createdUser.id;
      break;
    } catch (error) {
      if (isUsernameConflict(error)) {
        throw new HttpError(409, "Username is already taken");
      }

      if (isRetryableUserCodeConflict(error) && attempt < 2) {
        continue;
      }

      throw error;
    }
  }

  if (!createdUserId) {
    throw new HttpError(500, "Failed to create the account");
  }

  const token = await createAuthSession(createdUserId, request);
  const user = await findUserWithProfile(createdUserId);

  if (!user) {
    throw new HttpError(500, "Failed to load the created user");
  }

  return {
    token,
    user: buildUserResponse(user),
  };
}

export async function loginUser(
  request: IncomingMessage,
  input: {
    username?: string;
    password?: string;
  },
): Promise<AuthSessionResponse> {
  const username = normalizeUsername(input.username ?? "");
  const password = input.password?.trim() ?? "";

  if (!username || !password) {
    throw new HttpError(400, "Username and password are required");
  }

  assertValidUsername(username);

  const user = await findLoginRecordByUsername(username);

  if (!user || !user.passwordHash) {
    throw new HttpError(401, "Invalid username or password");
  }

  if (!verifyPasswordHash(password, user.passwordHash)) {
    throw new HttpError(401, "Invalid username or password");
  }

  const token = await createAuthSession(user.id, request);

  return {
    token,
    user: buildUserResponse(user),
  };
}

export async function getSessionContext(request: IncomingMessage) {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const session = await prisma.session.findFirst({
    where: {
      refreshTokenHash: hashSessionToken(token),
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!session) {
    return null;
  }

  const user = await findUserWithProfile(session.userId);

  if (!user) {
    return null;
  }

  return {
    token,
    sessionId: session.id,
    userId: session.userId,
    user: buildUserResponse(user),
  };
}

export async function requireSessionContext(request: IncomingMessage) {
  const context = await getSessionContext(request);

  if (!context) {
    throw new HttpError(401, "Authentication required");
  }

  return context;
}

export async function getCurrentUser(request: IncomingMessage) {
  const context = await requireSessionContext(request);

  return context.user;
}

export async function logoutUser(request: IncomingMessage) {
  const token = getBearerToken(request);

  if (!token) {
    return;
  }

  await prisma.session.deleteMany({
    where: {
      refreshTokenHash: hashSessionToken(token),
    },
  });
}

export async function updateCurrentUser(
  request: IncomingMessage,
  input: Partial<AuthProfileUpdateInput>,
) {
  const context = await requireSessionContext(request);
  const nickname = input.nickname?.trim();

  if (!nickname) {
    throw new HttpError(400, "Nickname is required");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: {
        id: context.userId,
      },
      data: {
        nickname,
        avatarUrl: input.avatarUrl?.trim() || null,
      },
    });

    await transaction.userProfile.upsert({
      where: {
        userId: context.userId,
      },
      create: {
        userId: context.userId,
        bio: input.bio?.trim() || null,
        region: input.region?.trim() || null,
        website: input.website?.trim() || null,
      },
      update: {
        bio: input.bio?.trim() || null,
        region: input.region?.trim() || null,
        website: input.website?.trim() || null,
      },
    });
  });

  const user = await findUserWithProfile(context.userId);

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  return buildUserResponse(user);
}

export async function deleteCurrentUser(request: IncomingMessage) {
  const context = await requireSessionContext(request);
  const [posts, files] = await Promise.all([
    prisma.post.findMany({
      where: {
        authorId: context.userId,
      },
      select: {
        contentPath: true,
      },
    }),
    prisma.fileAsset.findMany({
      where: {
        ownerId: context.userId,
      },
      select: {
        relativePath: true,
      },
    }),
  ]);

  await prisma.user.delete({
    where: {
      id: context.userId,
    },
  });

  await Promise.all([
    removeFiles(
      contentRoot,
      posts.map((post) => post.contentPath),
    ),
    removeFiles(
      uploadsRoot,
      files.map((file) => file.relativePath),
    ),
  ]);
}
