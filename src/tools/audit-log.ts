import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolErrorFromUnknown, zodError } from "../lib/errors.js";

const GetAuditLogSchema = z.object({
  guild_id: z.string(),
  action_type: z.number().int().optional(),
  user_id: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export function registerAuditLogTools(server: McpServer): void {
  server.registerTool(
    "get_audit_log",
    { description: "Fetch guild audit log entries", inputSchema: GetAuditLogSchema },
    async (args) => {
      const parsed = GetAuditLogSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        const log = await guild.fetchAuditLogs({
          type: parsed.data.action_type,
          user: parsed.data.user_id,
          limit: parsed.data.limit ?? 50,
        });
        const entries = log.entries.map((e) => ({
          id: e.id,
          action: e.action,
          executorId: e.executor?.id,
          targetId: e.targetId,
          reason: e.reason,
          createdAt: e.createdAt,
        }));
        return { content: [{ type: "text" as const, text: JSON.stringify(entries) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );
}
