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
    { description: "Get a guild member's info", inputSchema: GetMemberSchema },
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
    { description: "List members in a guild", inputSchema: ListMembersSchema },
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
    { description: "Search members by username", inputSchema: SearchMembersSchema },
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
    { description: "Edit a guild member", inputSchema: EditMemberSchema },
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
