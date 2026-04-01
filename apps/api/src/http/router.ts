import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson, setCorsHeaders } from "./response.js";
import { handleHealthRequest } from "../modules/health/health.controller.js";
import { handleBootstrapOverviewRequest } from "../modules/bootstrap/bootstrap.controller.js";
import { matchRoute } from "./route-match.js";
import {
  handleCurrentUserRequest,
  handleDeleteAccountRequest,
  handleLoginRequest,
  handleLogoutRequest,
  handleRegisterRequest,
  handleUpdateProfileRequest,
} from "../modules/auth/auth.controller.js";
import {
  handleArchivePostRequest,
  handleAuthorSpaceRequest,
  handleCreateCommentRequest,
  handleCreatePostRequest,
  handleDeleteCommentRequest,
  handleLikePostRequest,
  handleMyPostsRequest,
  handlePostCommentsRequest,
  handlePostDetailRequest,
  handlePostEditorRequest,
  handlePostsListRequest,
  handleUnlikePostRequest,
  handleUpdatePostRequest,
} from "../modules/blog/blog.controller.js";
import {
  handleUploadAssetRequest,
  handleUploadCreateRequest,
} from "../modules/uploads/uploads.controller.js";
import {
  handleHabitsOverview,
  handleListHabits,
  handleListCommunityHabits,
  handleCreateHabit,
  handleUpdateHabit,
  handleDeleteHabit,
  handlePermanentDeleteHabit,
  handleListRecords,
  handleCreateRecord,
  handleDeleteRecord,
  handleHabitStats,
  handleListHabitPrompts,
  handleCreateHabitPrompt,
} from "../modules/habits/habits.controller.js";

export async function routeRequest(
  request: IncomingMessage,
  response: ServerResponse,
) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const pathname = url.pathname;
  const method = request.method ?? "GET";

  if (method === "GET" && pathname === "/api/health") {
    await handleHealthRequest(request, response);
    return;
  }

  if (method === "GET" && pathname === "/api/bootstrap/overview") {
    await handleBootstrapOverviewRequest(request, response);
    return;
  }

  if (method === "GET" && pathname.startsWith("/uploads/")) {
    await handleUploadAssetRequest(request, response, pathname);
    return;
  }

  if (method === "POST" && pathname === "/api/auth/register") {
    await handleRegisterRequest(request, response);
    return;
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    await handleLoginRequest(request, response);
    return;
  }

  if (method === "POST" && pathname === "/api/auth/logout") {
    await handleLogoutRequest(request, response);
    return;
  }

  if (method === "GET" && pathname === "/api/auth/me") {
    await handleCurrentUserRequest(request, response);
    return;
  }

  if (method === "PATCH" && pathname === "/api/auth/me") {
    await handleUpdateProfileRequest(request, response);
    return;
  }

  if (method === "DELETE" && pathname === "/api/auth/me") {
    await handleDeleteAccountRequest(request, response);
    return;
  }

  if (method === "GET" && pathname === "/api/posts") {
    await handlePostsListRequest(request, response);
    return;
  }

  if (method === "GET" && pathname === "/api/posts/mine") {
    await handleMyPostsRequest(request, response);
    return;
  }

  if (method === "POST" && pathname === "/api/posts") {
    await handleCreatePostRequest(request, response);
    return;
  }

  if (method === "POST" && pathname === "/api/uploads") {
    await handleUploadCreateRequest(request, response);
    return;
  }

  const authorParams = matchRoute(pathname, "/api/authors/:authorId");

  if (method === "GET" && authorParams) {
    await handleAuthorSpaceRequest(request, response, authorParams.authorId);
    return;
  }

  const manageParams = matchRoute(pathname, "/api/posts/manage/:postId");

  if (method === "GET" && manageParams) {
    await handlePostEditorRequest(request, response, manageParams.postId);
    return;
  }

  if (method === "PATCH" && manageParams) {
    await handleUpdatePostRequest(request, response, manageParams.postId);
    return;
  }

  if (method === "DELETE" && manageParams) {
    await handleArchivePostRequest(request, response, manageParams.postId);
    return;
  }

  const commentsParams = matchRoute(pathname, "/api/posts/:slug/comments");

  if (method === "GET" && commentsParams) {
    await handlePostCommentsRequest(request, response, commentsParams.slug);
    return;
  }

  if (method === "POST" && commentsParams) {
    await handleCreateCommentRequest(request, response, commentsParams.slug);
    return;
  }

  const commentDeleteParams = matchRoute(pathname, "/api/posts/:slug/comments/:commentId");

  if (method === "DELETE" && commentDeleteParams) {
    await handleDeleteCommentRequest(
      request,
      response,
      commentDeleteParams.slug,
      commentDeleteParams.commentId,
    );
    return;
  }

  const likeParams = matchRoute(pathname, "/api/posts/:slug/like");

  if (method === "POST" && likeParams) {
    await handleLikePostRequest(request, response, likeParams.slug);
    return;
  }

  if (method === "DELETE" && likeParams) {
    await handleUnlikePostRequest(request, response, likeParams.slug);
    return;
  }

  const postParams = matchRoute(pathname, "/api/posts/:slug");

  if (method === "GET" && postParams) {
    await handlePostDetailRequest(request, response, postParams.slug);
    return;
  }

  // ─── Habits ─────────────────────────────────────────────────────────────────

  if (method === "GET" && pathname === "/api/habits/overview") {
    await handleHabitsOverview(request, response);
    return;
  }

  if (method === "GET" && pathname === "/api/habits/community") {
    await handleListCommunityHabits(request, response);
    return;
  }

  if (method === "GET" && pathname === "/api/habits/prompts") {
    await handleListHabitPrompts(request, response);
    return;
  }

  if (method === "GET" && pathname === "/api/habits") {
    await handleListHabits(request, response);
    return;
  }

  if (method === "POST" && pathname === "/api/habits") {
    await handleCreateHabit(request, response);
    return;
  }

  const permanentHabitParams = matchRoute(pathname, "/api/habits/:habitId/permanent");
  if (permanentHabitParams && method === "DELETE") {
    await handlePermanentDeleteHabit(request, response, permanentHabitParams.habitId);
    return;
  }

  const habitParams = matchRoute(pathname, "/api/habits/:habitId");
  if (habitParams) {
    const { habitId } = habitParams;

    if (method === "PATCH") {
      await handleUpdateHabit(request, response, habitId);
      return;
    }

    if (method === "DELETE") {
      await handleDeleteHabit(request, response, habitId);
      return;
    }
  }

  const habitPromptParams = matchRoute(pathname, "/api/habits/:habitId/prompts");
  if (habitPromptParams && method === "POST") {
    await handleCreateHabitPrompt(request, response, habitPromptParams.habitId);
    return;
  }

  const habitStatsParams = matchRoute(pathname, "/api/habits/:habitId/stats");
  if (habitStatsParams && method === "GET") {
    await handleHabitStats(request, response, habitStatsParams.habitId);
    return;
  }

  const habitRecordsParams = matchRoute(pathname, "/api/habits/:habitId/records");
  if (habitRecordsParams) {
    const { habitId } = habitRecordsParams;

    if (method === "GET") {
      await handleListRecords(request, response, habitId);
      return;
    }

    if (method === "POST") {
      await handleCreateRecord(request, response, habitId);
      return;
    }
  }

  const recordParams = matchRoute(pathname, "/api/habits/:habitId/records/:recordId");
  if (recordParams && method === "DELETE") {
    await handleDeleteRecord(request, response, recordParams.habitId, recordParams.recordId);
    return;
  }

  sendJson(response, 404, {
    status: "not_found",
    message: `No route for ${method} ${pathname}`,
  });
}
