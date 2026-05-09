import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { randomUUID } from "node:crypto";
import { getClient } from "./client.js";
import { createMcpServer } from "./server.js";
import { logger } from "./lib/logger.js";

const PORT = Number(process.env["PORT"] ?? 3000);

const mcpServer = createMcpServer();

const transport = new WebStandardStreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
});

await mcpServer.connect(transport);

getClient();

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      const connected = getClient().isReady();
      return Response.json({ ok: true, connected });
    }

    if (url.pathname === "/mcp") {
      return transport.handleRequest(req);
    }

    return new Response("Not Found", { status: 404 });
  },
});

logger.info(`discord-mcp listening on port ${server.port}`);
