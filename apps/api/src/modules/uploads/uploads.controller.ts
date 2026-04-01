import type { IncomingMessage, ServerResponse } from "node:http";
import { readJsonBody } from "../../http/request.js";
import { sendError, sendJson } from "../../http/response.js";
import { HttpError } from "../../lib/http-error.js";
import { requireSessionContext } from "../auth/auth.service.js";
import { readUpload, saveUpload } from "./uploads.service.js";

export async function handleUploadCreateRequest(
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    const session = await requireSessionContext(request);
    const payload = await readJsonBody<{
      filename?: string;
      category?: string;
      dataUrl?: string;
    }>(request);

    const item = await saveUpload(session.userId, payload);
    sendJson(response, 201, { item });
  } catch (error) {
    handleUploadError(response, error);
  }
}

export async function handleUploadAssetRequest(
  _request: IncomingMessage,
  response: ServerResponse,
  publicUrl: string,
) {
  try {
    const asset = await readUpload(publicUrl);
    response.statusCode = 200;
    response.setHeader("Content-Type", asset.mimeType);
    response.end(asset.buffer);
  } catch (error) {
    handleUploadError(response, error);
  }
}

function handleUploadError(response: ServerResponse, error: unknown) {
  if (error instanceof SyntaxError) {
    sendError(response, 400, "Invalid JSON body");
    return;
  }

  if (error instanceof HttpError) {
    sendError(response, error.statusCode, error.message);
    return;
  }

  console.error("[uploads] unexpected error", error);
  sendError(response, 500, "Unexpected upload error");
}
