import type { IncomingMessage, ServerResponse } from "node:http";
import { sendError, sendJson, sendNoContent } from "../../http/response.js";
import { HttpError } from "../../lib/http-error.js";
import {
  archivePost,
  createComment,
  createPost,
  deleteComment,
  getAuthorSpace,
  getEditablePost,
  getPostDetail,
  likePost,
  listMyPosts,
  listPostComments,
  listPublishedPosts,
  unlikePost,
  updatePost,
} from "./blog.service.js";
import { getSessionContext, requireSessionContext } from "../auth/auth.service.js";
import { readJsonBody } from "../../http/request.js";

export async function handlePostsListRequest(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    const session = await getSessionContext(request);
    const items = await listPublishedPosts(session?.userId ?? null);
    sendJson(response, 200, { items });
  } catch (error) {
    handleBlogError(response, error);
  }
}

export async function handleMyPostsRequest(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    const session = await requireSessionContext(request);
    const items = await listMyPosts(session.userId);
    sendJson(response, 200, { items });
  } catch (error) {
    handleBlogError(response, error);
  }
}

export async function handlePostDetailRequest(
  request: IncomingMessage,
  response: ServerResponse,
  slug: string,
) {
  try {
    const session = await getSessionContext(request);
    const item = await getPostDetail(slug, session?.userId ?? null);
    sendJson(response, 200, { item });
  } catch (error) {
    handleBlogError(response, error);
  }
}

export async function handlePostEditorRequest(
  request: IncomingMessage,
  response: ServerResponse,
  postId: string,
) {
  try {
    const session = await requireSessionContext(request);
    const item = await getEditablePost(postId, session.userId);
    sendJson(response, 200, { item });
  } catch (error) {
    handleBlogError(response, error);
  }
}

export async function handleCreatePostRequest(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    const session = await requireSessionContext(request);
    const payload = await readJsonBody<{
      title?: string;
      excerpt?: string | null;
      coverImageUrl?: string | null;
      visibility?: string;
      status?: string;
      content?: string;
    }>(request);

    const item = await createPost(session.userId, {
      title: payload.title ?? "",
      excerpt: payload.excerpt,
      coverImageUrl: payload.coverImageUrl,
      visibility: payload.visibility,
      status: payload.status,
      content: payload.content ?? "",
    });

    sendJson(response, 201, { item });
  } catch (error) {
    handleBlogError(response, error);
  }
}

export async function handleUpdatePostRequest(
  request: IncomingMessage,
  response: ServerResponse,
  postId: string,
) {
  try {
    const session = await requireSessionContext(request);
    const payload = await readJsonBody<{
      title?: string;
      excerpt?: string | null;
      coverImageUrl?: string | null;
      visibility?: string;
      status?: string;
      content?: string;
    }>(request);

    const item = await updatePost(postId, session.userId, payload);
    sendJson(response, 200, { item });
  } catch (error) {
    handleBlogError(response, error);
  }
}

export async function handleArchivePostRequest(
  request: IncomingMessage,
  response: ServerResponse,
  postId: string,
) {
  try {
    const session = await requireSessionContext(request);
    await archivePost(postId, session.userId);
    sendNoContent(response);
  } catch (error) {
    handleBlogError(response, error);
  }
}

export async function handlePostCommentsRequest(
  request: IncomingMessage,
  response: ServerResponse,
  slug: string,
) {
  try {
    const session = await getSessionContext(request);
    const items = await listPostComments(slug, session?.userId ?? null);
    sendJson(response, 200, { items });
  } catch (error) {
    handleBlogError(response, error);
  }
}

export async function handleCreateCommentRequest(
  request: IncomingMessage,
  response: ServerResponse,
  slug: string,
) {
  try {
    const session = await requireSessionContext(request);
    const payload = await readJsonBody<{ content?: string }>(request);
    const items = await createComment(slug, session.userId, payload.content ?? "");
    sendJson(response, 201, { items });
  } catch (error) {
    handleBlogError(response, error);
  }
}

export async function handleDeleteCommentRequest(
  request: IncomingMessage,
  response: ServerResponse,
  slug: string,
  commentId: string,
) {
  try {
    const session = await requireSessionContext(request);
    const items = await deleteComment(slug, commentId, session.userId);
    sendJson(response, 200, { items });
  } catch (error) {
    handleBlogError(response, error);
  }
}

export async function handleLikePostRequest(
  request: IncomingMessage,
  response: ServerResponse,
  slug: string,
) {
  try {
    const session = await requireSessionContext(request);
    const likeCount = await likePost(slug, session.userId);
    sendJson(response, 200, { liked: true, likeCount });
  } catch (error) {
    handleBlogError(response, error);
  }
}

export async function handleUnlikePostRequest(
  request: IncomingMessage,
  response: ServerResponse,
  slug: string,
) {
  try {
    const session = await requireSessionContext(request);
    const likeCount = await unlikePost(slug, session.userId);
    sendJson(response, 200, { liked: false, likeCount });
  } catch (error) {
    handleBlogError(response, error);
  }
}

export async function handleAuthorSpaceRequest(
  request: IncomingMessage,
  response: ServerResponse,
  authorId: string,
) {
  try {
    const session = await getSessionContext(request);
    const item = await getAuthorSpace(authorId, session?.userId ?? null);
    sendJson(response, 200, { item });
  } catch (error) {
    handleBlogError(response, error);
  }
}

function handleBlogError(response: ServerResponse, error: unknown) {
  if (error instanceof SyntaxError) {
    sendError(response, 400, "Invalid JSON body");
    return;
  }

  if (error instanceof HttpError) {
    sendError(response, error.statusCode, error.message);
    return;
  }

  console.error("[blog] unexpected error", error);
  sendError(response, 500, "Unexpected blog error");
}
