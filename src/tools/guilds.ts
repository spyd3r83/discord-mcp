import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolErrorFromUnknown, zodError } from "../lib/errors.js";

const GetGuildSchema = z.object({ guild_id: z.string() });
const MemberCountSchema = z.object({ guild_id: z.string() });

export function registerGuildTools(server: McpServer): void {
  server.registerTool(
    "get_guild",
    {
      description: `Fetch metadata about a Discord guild (server) by its snowflake ID.

Returns the guild's snowflake id, name, and approximate member count.

Required parameter:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    Call discord-ext_list_guilds first if you don't know the guild ID.

Example: discord-ext_get_guild({ guild_id: "1396724253621223584" })
Result:  { "id": "1396724253621223584", "name": "JFI-HomeLab", "memberCount": 12 }`,
      inputSchema: GetGuildSchema,
    },
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
    {
      description: `List all Discord guilds (servers) the bot is currently a member of.

Returns each guild's snowflake ID (17-19 digit integer string) and name. This is the starting point for all guild-scoped operations — call this first to get the guild_id needed by tools like discord-ext_list_channels, discord-ext_get_guild, discord-ext_list_members, etc.

No parameters required.

Example result: [{ "id": "1396724253621223584", "name": "JFI-HomeLab" }]

Workflow:
  1. discord-ext_list_guilds()                            → get guild_id
  2. discord-ext_list_channels({ guild_id: "1396..." })   → find channel snowflake IDs by name
  3. discord-ext_list_messages({ channel_id: "1471..." }) → read messages`,
      inputSchema: z.object({}),
    },
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
    {
      description: `Get the total member count for a Discord guild (server).

Required parameter:
  • guild_id — Discord guild snowflake ID (17-19 digits, e.g. "1396724253621223584").
    Call discord-ext_list_guilds to find it.

Returns: { "memberCount": <number> }`,
      inputSchema: MemberCountSchema,
    },
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
