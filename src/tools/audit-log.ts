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
    { description: `Fetch audit log entries from a Discord guild. Shows moderator actions like bans, kicks, role changes, channel edits, etc.

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    NOT a non-Discord UUID. Call discord-ext_list_guilds first if you don't know it.

Optional:
  • action_type — Discord audit log action type number to filter by (e.g. 22 = MEMBER_BAN, 20 = MEMBER_KICK). See Discord docs for full list.
  • user_id — Discord user snowflake ID to filter entries by executor (17-19 digit integer string).
    NOT a non-Discord UUID.
  • limit — max entries to return (1–100, default 50)

Returns: [{ id, action, executorId, targetId, reason, createdAt }]

Example: discord-ext_get_audit_log({ guild_id: "1396724253621223584", action_type: 22, limit: 10 })`, inputSchema: GetAuditLogSchema },
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
