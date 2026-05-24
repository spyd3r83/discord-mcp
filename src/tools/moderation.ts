import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolErrorFromUnknown, zodError } from "../lib/errors.js";

const BanSchema = z.object({
  guild_id: z.string(),
  user_id: z.string(),
  reason: z.string().optional(),
  delete_message_days: z.number().int().min(0).max(7).optional(),
});

const UnbanSchema = z.object({ guild_id: z.string(), user_id: z.string() });

const KickSchema = z.object({
  guild_id: z.string(),
  user_id: z.string(),
  reason: z.string().optional(),
});

const TimeoutSchema = z.object({
  guild_id: z.string(),
  user_id: z.string(),
  duration_minutes: z.number().int().min(1).max(40320),
  reason: z.string().optional(),
});

const RemoveTimeoutSchema = z.object({ guild_id: z.string(), user_id: z.string() });

const ListBansSchema = z.object({
  guild_id: z.string(),
  limit: z.number().int().min(1).max(1000).optional(),
});

export function registerModerationTools(server: McpServer): void {
  server.registerTool(
    "ban_member",
    { description: `Ban a user from a Discord guild (server). Removes the user and prevents them from rejoining.

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    NOT a non-Discord UUID. Call discord-ext_list_guilds first if you don't know it.
  • user_id — Discord user snowflake ID (17-19 digit integer string, e.g. "281937542917916673").
    NOT a non-Discord UUID.

Optional:
  • reason — audit-log reason string for the ban (max 512 characters)
  • delete_message_days — delete the user's recent messages (0–7 days, default 0)

Returns: "User banned"

Example: discord-ext_ban_member({ guild_id: "1396724253621223584", user_id: "281937542917916673", reason: "Spam", delete_message_days: 1 })`, inputSchema: BanSchema },
    async (args) => {
      const parsed = BanSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        await guild.members.ban(parsed.data.user_id, {
          reason: parsed.data.reason,
          deleteMessageSeconds: (parsed.data.delete_message_days ?? 0) * 86400,
        });
        return { content: [{ type: "text" as const, text: "User banned" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "unban_member",
    { description: `Unban a previously banned user from a Discord guild (server). Allows them to rejoin.

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    NOT a non-Discord UUID. Call discord-ext_list_guilds first if you don't know it.
  • user_id — Discord user snowflake ID (17-19 digit integer string, e.g. "281937542917916673").
    NOT a non-Discord UUID. Call discord-ext_list_bans first if you don't know it.

Returns: "User unbanned"

Example: discord-ext_unban_member({ guild_id: "1396724253621223584", user_id: "281937542917916673" })`, inputSchema: UnbanSchema },
    async (args) => {
      const parsed = UnbanSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        await guild.members.unban(parsed.data.user_id);
        return { content: [{ type: "text" as const, text: "User unbanned" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "kick_member",
    { description: `Kick a user from a Discord guild (server). They can rejoin with an invite.

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    NOT a non-Discord UUID. Call discord-ext_list_guilds first if you don't know it.
  • user_id — Discord user snowflake ID (17-19 digit integer string, e.g. "281937542917916673").
    NOT a non-Discord UUID. Call discord-ext_search_members first.

Optional:
  • reason — audit-log reason string for the kick (max 512 characters)

Returns: "User kicked"

Example: discord-ext_kick_member({ guild_id: "1396724253621223584", user_id: "281937542917916673", reason: "Disruptive behavior" })`, inputSchema: KickSchema },
    async (args) => {
      const parsed = KickSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        const member = await guild.members.fetch(parsed.data.user_id);
        await member.kick(parsed.data.reason);
        return { content: [{ type: "text" as const, text: "User kicked" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "timeout_member",
    { description: `Timeout (mute) a user in a Discord guild for a specified duration. They cannot send messages or join voice channels during the timeout.

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    NOT a non-Discord UUID. Call discord-ext_list_guilds first if you don't know it.
  • user_id — Discord user snowflake ID (17-19 digit integer string, e.g. "281937542917916673").
    NOT a non-Discord UUID. Call discord-ext_search_members first.
  • duration_minutes — timeout length in minutes (1–40320, max 28 days)

Optional:
  • reason — audit-log reason string for the timeout (max 512 characters)

Returns: "User timed out"

Example: discord-ext_timeout_member({ guild_id: "1396724253621223584", user_id: "281937542917916673", duration_minutes: 60, reason: "Cool down" })`, inputSchema: TimeoutSchema },
    async (args) => {
      const parsed = TimeoutSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        const member = await guild.members.fetch(parsed.data.user_id);
        const durationMs = parsed.data.duration_minutes * 60 * 1000;
        await member.timeout(durationMs, parsed.data.reason);
        return { content: [{ type: "text" as const, text: "User timed out" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "remove_timeout",
    { description: `Remove an active timeout from a Discord guild member, allowing them to send messages and join voice again.

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    NOT a non-Discord UUID. Call discord-ext_list_guilds first if you don't know it.
  • user_id — Discord user snowflake ID (17-19 digit integer string, e.g. "281937542917916673").
    NOT a non-Discord UUID.

Returns: "Timeout removed"

Example: discord-ext_remove_timeout({ guild_id: "1396724253621223584", user_id: "281937542917916673" })`, inputSchema: RemoveTimeoutSchema },
    async (args) => {
      const parsed = RemoveTimeoutSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        const member = await guild.members.fetch(parsed.data.user_id);
        await member.timeout(null);
        return { content: [{ type: "text" as const, text: "Timeout removed" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "list_bans",
    { description: `List banned users in a Discord guild (server).

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    NOT a non-Discord UUID. Call discord-ext_list_guilds first if you don't know it.

Optional:
  • limit — max bans to return (1–1000, default 100)

Returns: [{ userId, username, reason }]

Example: discord-ext_list_bans({ guild_id: "1396724253621223584", limit: 25 })`, inputSchema: ListBansSchema },
    async (args) => {
      const parsed = ListBansSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        const bans = await guild.bans.fetch({ limit: parsed.data.limit ?? 100 });
        const list = bans.map((b) => ({ userId: b.user.id, username: b.user.username, reason: b.reason }));
        return { content: [{ type: "text" as const, text: JSON.stringify(list) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );
}
