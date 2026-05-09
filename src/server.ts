import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMessageTools } from "./tools/messages.js";
import { registerChannelTools } from "./tools/channels.js";
import { registerGuildTools } from "./tools/guilds.js";
import { registerRoleTools } from "./tools/roles.js";
import { registerMemberTools } from "./tools/members.js";
import { registerReactionTools } from "./tools/reactions.js";
import { registerThreadTools } from "./tools/threads.js";
import { registerWebhookTools } from "./tools/webhooks.js";
import { registerModerationTools } from "./tools/moderation.js";
import { registerAuditLogTools } from "./tools/audit-log.js";
import { registerDMTools } from "./tools/dms.js";
import { registerForumTools } from "./tools/forums.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "discord-mcp",
    version: "0.1.0",
  });

  registerMessageTools(server);
  registerChannelTools(server);
  registerGuildTools(server);
  registerRoleTools(server);
  registerMemberTools(server);
  registerReactionTools(server);
  registerThreadTools(server);
  registerWebhookTools(server);
  registerModerationTools(server);
  registerAuditLogTools(server);
  registerDMTools(server);
  registerForumTools(server);

  return server;
}
