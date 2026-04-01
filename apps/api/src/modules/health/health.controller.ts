import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../../http/response.js";
import { getHealthCheck } from "./health.service.js";

export async function handleHealthRequest(
  _request: IncomingMessage,
  response: ServerResponse,
) {
  const payload = await getHealthCheck();
  const statusCode = payload.status === "ok" ? 200 : 503;

  sendJson(response, statusCode, payload);
}
