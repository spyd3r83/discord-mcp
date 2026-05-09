import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolErrorFromUnknown, zodError } from "../lib/errors.js";

const GetGuildSchema = z.object({ guild_id: z.string() });
const MemberCountSchema = z.object({ guild_id: z.string() });

export function registerGuildTools(server: McpServer): void {
  server.registerTool(
    "get_guild",
    { description: "Get guild information", inputSchema: GetGuildSchema },
    async (args) => {
      const parsed = GetGuildSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ id: guild.id, name: guild.name, memberCount: guild.memberCount }),
          }],
        };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "list_guilds",
    { description: "List all guilds the bot is in", inputSchema: z.object({}) },
    async () => {
      try {
        const guilds = getClient().guilds.cache.map((g) => ({ id: g.id, name: g.name }));
        return { content: [{ type: "text" as const, text: JSON.stringify(guilds) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "get_guild_member_count",
    { description: "Get member count for a guild", inputSchema: MemberCountSchema },
    async (args) => {
      const parsed = MemberCountSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        return { content: [{ type: "text" as const, text: JSON.stringify({ memberCount: guild.memberCount }) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );
}
