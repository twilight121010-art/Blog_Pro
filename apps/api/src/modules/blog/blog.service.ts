import type {
  BlogAuthorSpace,
  BlogComment,
  BlogEditorPayload,
  BlogEditorState,
  BlogPostDetail,
  BlogPostSummary,
  SessionUser,
} from "@blog/shared";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, normalize, resolve } from "node:path";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { POST_STATUS, POST_VISIBILITY } from "@blog/shared";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import { contentRoot } from "../../lib/workspace.js";

marked.setOptions({
  gfm: true,
  breaks: true,
});

type AuthorRecord = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
};

type AuthorSpaceRecord = AuthorRecord & {
  username: string;
  userCode: string;
  status: string;
  bio: string | null;
  region: string | null;
  website: string | null;
};

type PostRecord = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  status: string;
  visibility: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  contentPath: string;
  authorId: string;
  author: AuthorRecord;
  _count: {
    comments: number;
    likes: number;
  };
};

function createExcerpt(content: string) {
  const plainText = content
    .replace(/[`*_>#\-!\[\]\(\)]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return plainText ? plainText.slice(0, 160) : null;
}

function createSlugBase(title: string) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `post-${Date.now().toString(36)}`;
}

async function createUniqueSlug(title: string) {
  const base = createSlugBase(title);
  let candidate = base;
  let suffix = 1;

  while (await prisma.post.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function validateStatus(status?: string) {
  const nextStatus = status?.trim().toUpperCase() || "DRAFT";

  if (!POST_STATUS.includes(nextStatus)) {
    throw new HttpError(400, `Unsupported post status: ${nextStatus}`);
  }

  return nextStatus;
}

function validateVisibility(visibility?: string) {
  const nextVisibility = visibility?.trim().toUpperCase() || "PUBLIC";

  if (!POST_VISIBILITY.includes(nextVisibility)) {
    throw new HttpError(400, `Unsupported post visibility: ${nextVisibility}`);
  }

  return nextVisibility;
}

async function ensureContentDirectory() {
  await mkdir(contentRoot, { recursive: true });
}

function resolveContentFile(relativePath: string) {
  const normalizedPath = normalize(relativePath);
  const absolutePath = resolve(contentRoot, normalizedPath);

  if (!absolutePath.startsWith(resolve(contentRoot))) {
    throw new HttpError(400, "Invalid content path");
  }

  return absolutePath;
}

async function writeMarkdownFile(relativePath: string, markdown: string) {
  await ensureContentDirectory();
  const absolutePath = resolveContentFile(relativePath);
  await writeFile(absolutePath, markdown, "utf8");
}

async function readMarkdownFile(relativePath: string) {
  const absolutePath = resolveContentFile(relativePath);
  return readFile(absolutePath, "utf8");
}

function renderMarkdown(markdown: string) {
  const rawHtml = marked.parse(markdown) as string;

  return sanitizeHtml(rawHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "pre",
      "code",
    ]),
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title"],
      code: ["class"],
      "*": ["id"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

function serializeAuthor(author: AuthorSpaceRecord): SessionUser {
  return {
    id: author.id,
    username: author.username,
    userCode: author.userCode,
    nickname: author.nickname,
    avatarUrl: author.avatarUrl ?? null,
    status: author.status ?? "ACTIVE",
    bio: author.bio ?? null,
    region: author.region ?? null,
    website: author.website ?? null,
  };
}

async function findAuthorRecordById(authorId: string) {
  const rows = await prisma.$queryRaw<AuthorSpaceRecord[]>`
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
    WHERE u."id" = ${authorId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

function serializeSummary(post: PostRecord, likedByViewer: boolean): BlogPostSummary {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImageUrl: post.coverImageUrl,
    status: post.status,
    visibility: post.visibility,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    commentCount: post._count.comments,
    likeCount: post._count.likes,
    likedByViewer,
    author: {
      id: post.author.id,
      nickname: post.author.nickname,
      avatarUrl: post.author.avatarUrl ?? null,
    },
  };
}

async function collectLikedPostIds(postIds: string[], currentUserId: string | null) {
  if (!currentUserId || postIds.length === 0) {
    return new Set<string>();
  }

  const likes = await prisma.postLike.findMany({
    where: {
      userId: currentUserId,
      postId: {
        in: postIds,
      },
    },
    select: {
      postId: true,
    },
  });

  return new Set(likes.map((item) => item.postId));
}

async function serializePosts(posts: PostRecord[], currentUserId: string | null) {
  const likedPostIds = await collectLikedPostIds(
    posts.map((post) => post.id),
    currentUserId,
  );

  return posts.map((post) => serializeSummary(post, likedPostIds.has(post.id)));
}

async function getCommentsForPost(postId: string, viewerUserId: string | null, postAuthorId: string) {
  const comments = await prisma.postComment.findMany({
    where: {
      postId,
    },
    orderBy: {
      createdAt: "asc",
    },
    include: {
      author: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
        },
      },
    },
  });

  return comments.map<BlogComment>((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    canDelete: viewerUserId === comment.authorId || viewerUserId === postAuthorId,
    author: {
      id: comment.author.id,
      nickname: comment.author.nickname,
      avatarUrl: comment.author.avatarUrl ?? null,
    },
  }));
}

async function buildDetail(post: PostRecord, currentUserId: string | null): Promise<BlogPostDetail> {
  const content = await readMarkdownFile(post.contentPath);
  const comments = await getCommentsForPost(post.id, currentUserId, post.authorId);
  const likedPostIds = await collectLikedPostIds([post.id], currentUserId);

  return {
    ...serializeSummary(post, likedPostIds.has(post.id)),
    content,
    renderedHtml: renderMarkdown(content),
    canEdit: currentUserId === post.authorId,
    comments,
  };
}

function toEditorState(detail: BlogPostDetail): BlogEditorState {
  return {
    ...detail,
  };
}

async function getPostRecordBySlug(slug: string) {
  return prisma.post.findUnique({
    where: {
      slug,
    },
    include: {
      author: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },
  });
}

async function getPostRecordById(postId: string, authorId?: string) {
  return prisma.post.findFirst({
    where: {
      id: postId,
      ...(authorId ? { authorId } : {}),
    },
    include: {
      author: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },
  });
}

export async function listPublishedPosts(currentUserId: string | null) {
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
    },
    include: {
      author: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },
    orderBy: [
      {
        publishedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return serializePosts(posts, currentUserId);
}

export async function listMyPosts(userId: string) {
  const posts = await prisma.post.findMany({
    where: {
      authorId: userId,
      status: {
        not: "ARCHIVED",
      },
    },
    include: {
      author: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return serializePosts(posts, userId);
}

export async function getPostDetail(slug: string, currentUserId: string | null) {
  const post = await getPostRecordBySlug(slug);

  if (!post) {
    throw new HttpError(404, "Post not found");
  }

  if (post.status !== "PUBLISHED" && post.authorId !== currentUserId) {
    throw new HttpError(404, "Post not found");
  }

  return buildDetail(post, currentUserId);
}

export async function getEditablePost(postId: string, currentUserId: string) {
  const post = await getPostRecordById(postId, currentUserId);

  if (!post) {
    throw new HttpError(404, "Post not found");
  }

  const detail = await buildDetail(post, currentUserId);
  return toEditorState(detail);
}

export async function createPost(userId: string, input: BlogEditorPayload) {
  const title = input.title?.trim() ?? "";
  const content = input.content?.trim() ?? "";

  if (!title) {
    throw new HttpError(400, "Title is required");
  }

  if (!content) {
    throw new HttpError(400, "Markdown content is required");
  }

  const slug = await createUniqueSlug(title);
  const contentPath = `${slug}.md`;
  const status = validateStatus(input.status);
  const visibility = validateVisibility(input.visibility);

  await writeMarkdownFile(contentPath, content);

  const post = await prisma.post.create({
    data: {
      authorId: userId,
      slug,
      title,
      excerpt: input.excerpt?.trim() || createExcerpt(content),
      coverImageUrl: input.coverImageUrl?.trim() || null,
      contentPath,
      status,
      visibility,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
    include: {
      author: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },
  });

  return buildDetail(post, userId);
}

export async function updatePost(postId: string, userId: string, input: Partial<BlogEditorPayload>) {
  const existingPost = await getPostRecordById(postId, userId);

  if (!existingPost) {
    throw new HttpError(404, "Post not found");
  }

  const nextTitle = input.title?.trim() || existingPost.title;
  const nextContent = input.content?.trim();
  const nextStatus = validateStatus(input.status ?? existingPost.status);
  const nextVisibility = validateVisibility(input.visibility ?? existingPost.visibility);
  const currentContent = nextContent ?? (await readMarkdownFile(existingPost.contentPath));

  if (nextContent) {
    await writeMarkdownFile(existingPost.contentPath, nextContent);
  }

  const updatedPost = await prisma.post.update({
    where: {
      id: postId,
    },
    data: {
      title: nextTitle,
      excerpt:
        input.excerpt !== undefined
          ? input.excerpt?.trim() || createExcerpt(currentContent)
          : existingPost.excerpt,
      coverImageUrl:
        input.coverImageUrl !== undefined ? input.coverImageUrl?.trim() || null : existingPost.coverImageUrl,
      status: nextStatus,
      visibility: nextVisibility,
      publishedAt: nextStatus === "PUBLISHED" ? existingPost.publishedAt ?? new Date() : null,
    },
    include: {
      author: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },
  });

  return buildDetail(updatedPost, userId);
}

export async function archivePost(postId: string, userId: string) {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      authorId: userId,
    },
  });

  if (!post) {
    throw new HttpError(404, "Post not found");
  }

  await prisma.post.update({
    where: {
      id: postId,
    },
    data: {
      status: "ARCHIVED",
    },
  });
}

export async function listPostComments(slug: string, currentUserId: string | null) {
  const post = await prisma.post.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      authorId: true,
      status: true,
    },
  });

  if (!post) {
    throw new HttpError(404, "Post not found");
  }

  if (post.status !== "PUBLISHED" && post.authorId !== currentUserId) {
    throw new HttpError(404, "Post not found");
  }

  return getCommentsForPost(post.id, currentUserId, post.authorId);
}

export async function createComment(slug: string, userId: string, content: string) {
  const normalizedContent = content.trim();

  if (!normalizedContent) {
    throw new HttpError(400, "Comment content is required");
  }

  const post = await prisma.post.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      status: true,
      authorId: true,
    },
  });

  if (!post || post.status !== "PUBLISHED") {
    throw new HttpError(404, "Post not found");
  }

  await prisma.postComment.create({
    data: {
      postId: post.id,
      authorId: userId,
      content: normalizedContent,
    },
  });

  return getCommentsForPost(post.id, userId, post.authorId);
}

export async function deleteComment(slug: string, commentId: string, userId: string) {
  const comment = await prisma.postComment.findFirst({
    where: {
      id: commentId,
      post: {
        slug,
      },
    },
    include: {
      post: {
        select: {
          id: true,
          authorId: true,
        },
      },
    },
  });

  if (!comment) {
    throw new HttpError(404, "Comment not found");
  }

  if (comment.authorId !== userId && comment.post.authorId !== userId) {
    throw new HttpError(403, "You cannot delete this comment");
  }

  await prisma.postComment.delete({
    where: {
      id: commentId,
    },
  });

  return getCommentsForPost(comment.post.id, userId, comment.post.authorId);
}

export async function likePost(slug: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!post || post.status !== "PUBLISHED") {
    throw new HttpError(404, "Post not found");
  }

  await prisma.postLike.upsert({
    where: {
      postId_userId: {
        postId: post.id,
        userId,
      },
    },
    create: {
      postId: post.id,
      userId,
    },
    update: {},
  });

  return prisma.postLike.count({
    where: {
      postId: post.id,
    },
  });
}

export async function unlikePost(slug: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!post || post.status !== "PUBLISHED") {
    throw new HttpError(404, "Post not found");
  }

  await prisma.postLike.deleteMany({
    where: {
      postId: post.id,
      userId,
    },
  });

  return prisma.postLike.count({
    where: {
      postId: post.id,
    },
  });
}

export async function getAuthorSpace(authorId: string, viewerUserId: string | null): Promise<BlogAuthorSpace> {
  const author = await findAuthorRecordById(authorId);

  if (!author) {
    throw new HttpError(404, "Author not found");
  }

  const authorPosts = await prisma.post.findMany({
    where: {
      authorId,
      status: "PUBLISHED",
    },
    include: {
      author: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },
    orderBy: {
      publishedAt: "desc",
    },
  });

  const posts = await serializePosts(authorPosts, viewerUserId);
  const serializedUser = serializeAuthor(author);

  return {
    user: serializedUser,
    posts,
  };
}

export function createMarkdownImageSnippet(publicUrl: string, originalName: string) {
  return `![${basename(originalName)}](${publicUrl})`;
}
