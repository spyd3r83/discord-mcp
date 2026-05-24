import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolErrorFromUnknown, zodError } from "../lib/errors.js";

const GetMemberSchema = z.object({ guild_id: z.string(), user_id: z.string() });

const ListMembersSchema = z.object({
  guild_id: z.string(),
  limit: z.number().int().min(1).max(1000).optional(),
});

const SearchMembersSchema = z.object({
  guild_id: z.string(),
  query: z.string(),
  limit: z.number().int().min(1).max(100).optional(),
});

const EditMemberSchema = z.object({
  guild_id: z.string(),
  user_id: z.string(),
  nick: z.string().optional(),
  mute: z.boolean().optional(),
  deaf: z.boolean().optional(),
});

export function registerMemberTools(server: McpServer): void {
  server.registerTool(
    "get_member",
    { description: `Get detailed information about a specific member of a Discord guild (server).

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    NOT an OpenButler UUID. Call discord-ext_list_guilds first if you don't know it.
  • user_id — Discord user snowflake ID (17-19 digit integer string, e.g. "281937542917916673").
    NOT an OpenButler UUID. Call discord-ext_search_members or discord-ext_list_members first.

Returns: { id, username, nick, roles: string[], joinedAt }

Example: discord-ext_get_member({ guild_id: "1396724253621223584", user_id: "281937542917916673" })`, inputSchema: GetMemberSchema },
    async (args) => {
      const parsed = GetMemberSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        const member = await guild.members.fetch(parsed.data.user_id);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              id: member.id,
              username: member.user.username,
              nick: member.nickname,
              roles: member.roles.cache.map((r) => r.name),
              joinedAt: member.joinedAt,
            }),
          }],
        };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "list_members",
    { description: `List members of a Discord guild (server).

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    NOT an OpenButler UUID. Call discord-ext_list_guilds first if you don't know it.

Optional:
  • limit — max members to return (1–1000, default 100)

Returns: [{ id, username, nick }]

Example: discord-ext_list_members({ guild_id: "1396724253621223584", limit: 50 })`, inputSchema: ListMembersSchema },
    async (args) => {
      const parsed = ListMembersSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        const members = await guild.members.list({ limit: parsed.data.limit ?? 100 });
        const list = members.map((m) => ({ id: m.id, username: m.user.username, nick: m.nickname }));
        return { content: [{ type: "text" as const, text: JSON.stringify(list) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "search_members",
    { description: `Search for members in a Discord guild by username or nickname.

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    NOT an OpenButler UUID. Call discord-ext_list_guilds first if you don't know it.
  • query — search string to match against usernames/nicknames (e.g. "jessica")

Optional:
  • limit — max results to return (1–100, default 10)

Returns: [{ id, username, nick }]

Example: discord-ext_search_members({ guild_id: "1396724253621223584", query: "jessica", limit: 5 })`, inputSchema: SearchMembersSchema },
    async (args) => {
      const parsed = SearchMembersSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        const members = await guild.members.search({ query: parsed.data.query, limit: parsed.data.limit ?? 10 });
        const list = members.map((m) => ({ id: m.id, username: m.user.username, nick: m.nickname }));
        return { content: [{ type: "text" as const, text: JSON.stringify(list) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "edit_member",
    { description: `Edit a member's properties in a Discord guild (nickname, mute, deaf).

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    NOT an OpenButler UUID. Call discord-ext_list_guilds first if you don't know it.
  • user_id — Discord user snowflake ID (17-19 digit integer string, e.g. "281937542917916673").
    NOT an OpenButler UUID. Call discord-ext_search_members or discord-ext_list_members first.

Optional:
  • nick — new nickname string (set to null to clear)
  • mute — server-mute the member (boolean, requires Manage Channels permission)
  • deaf — server-deafen the member (boolean, requires Manage Channels permission)

Returns: "Member updated"

Example: discord-ext_edit_member({ guild_id: "1396724253621223584", user_id: "281937542917916673", nick: "New Nick" })`, inputSchema: EditMemberSchema },
    async (args) => {
      const parsed = EditMemberSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        const member = await guild.members.fetch(parsed.data.user_id);
        await member.edit({
          nick: parsed.data.nick,
          mute: parsed.data.mute,
          deaf: parsed.data.deaf,
        });
        return { content: [{ type: "text" as const, text: "Member updated" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );
}
