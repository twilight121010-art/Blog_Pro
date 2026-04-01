import { createServer } from "node:http";
import { env } from "../config/env.js";
import { routeRequest } from "./router.js";

export function startServer() {
  const server = createServer((request, response) => {
    void routeRequest(request, response);
  });

  server.listen(env.port, () => {
    console.log(`[api] listening on http://localhost:${env.port}`);
  });

  return server;
}
