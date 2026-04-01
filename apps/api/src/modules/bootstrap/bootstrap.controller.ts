import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../../http/response.js";
import { getBootstrapOverview } from "./bootstrap.service.js";

export async function handleBootstrapOverviewRequest(
  _request: IncomingMessage,
  response: ServerResponse,
) {
  const payload = await getBootstrapOverview();
  const statusCode = payload.status === "ok" ? 200 : 503;

  sendJson(response, statusCode, payload);
}
