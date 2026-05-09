import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { randomUUID } from "node:crypto";
import { getClient } from "./client.js";
import { createMcpServer } from "./server.js";
import { logger } from "./lib/logger.js";

const PORT = process.env["PORT"] ? Number(process.env["PORT"]) : null;
const useStdio = PORT === null;

const mcpServer = createMcpServer();

// Initiate Discord connection — non-fatal so the server stays up
// even if the token is invalid or missing at startup.
try {
  getClient();
} catch (err) {
  logger.error("Discord client failed to initialise at startup", String(err));
}

if (useStdio) {
  // Stdio transport — default mode, used by MCP hosts (e.g. OpenCode via bunx)
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  // No log to stdout — stdio is the MCP channel
} else {
  // HTTP/SSE transport — opt-in via PORT env var
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  await mcpServer.connect(transport);

  const server = Bun.serve({
    port: PORT,
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/health") {
        let connected = false;
        try {
          connected = getClient().isReady();
        } catch {
          // client not initialised — token missing or invalid
        }
        return Response.json({ ok: true, connected });
      }

      if (url.pathname === "/mcp") {
        return transport.handleRequest(req);
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  logger.info(`discord-mcp listening on port ${server.port}`);
}
