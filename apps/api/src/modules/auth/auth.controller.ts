import type { IncomingMessage, ServerResponse } from "node:http";
import { readJsonBody } from "../../http/request.js";
import { sendError, sendJson, sendNoContent } from "../../http/response.js";
import { HttpError } from "../../lib/http-error.js";
import {
  deleteCurrentUser,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  updateCurrentUser,
} from "./auth.service.js";

export async function handleRegisterRequest(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    const payload = await readJsonBody<{
      username?: string;
      password?: string;
      nickname?: string;
      securityQuestion?: string;
      securityAnswer?: string;
    }>(request);

    const result = await registerUser(request, payload);
    sendJson(response, 201, result);
  } catch (error) {
    handleAuthError(response, error);
  }
}

export async function handleLoginRequest(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    const payload = await readJsonBody<{
      username?: string;
      password?: string;
    }>(request);

    const result = await loginUser(request, payload);
    sendJson(response, 200, result);
  } catch (error) {
    handleAuthError(response, error);
  }
}

export async function handleCurrentUserRequest(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    const user = await getCurrentUser(request);
    sendJson(response, 200, { user });
  } catch (error) {
    handleAuthError(response, error);
  }
}

export async function handleUpdateProfileRequest(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    const payload = await readJsonBody<{
      nickname?: string;
      avatarUrl?: string | null;
      bio?: string | null;
      region?: string | null;
      website?: string | null;
    }>(request);

    const user = await updateCurrentUser(request, payload);
    sendJson(response, 200, { user });
  } catch (error) {
    handleAuthError(response, error);
  }
}

export async function handleLogoutRequest(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    await logoutUser(request);
    sendNoContent(response);
  } catch (error) {
    handleAuthError(response, error);
  }
}

export async function handleDeleteAccountRequest(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    await deleteCurrentUser(request);
    sendNoContent(response);
  } catch (error) {
    handleAuthError(response, error);
  }
}

function handleAuthError(response: ServerResponse, error: unknown) {
  if (error instanceof SyntaxError) {
    sendError(response, 400, "Invalid JSON body");
    return;
  }

  if (error instanceof HttpError) {
    sendError(response, error.statusCode, error.message);
    return;
  }

  console.error("[auth] unexpected error", error);
  sendError(response, 500, "Unexpected auth error");
}
