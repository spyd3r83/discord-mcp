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
    { description: "Ban a user from a guild", inputSchema: BanSchema },
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
    { description: "Unban a user from a guild", inputSchema: UnbanSchema },
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
    { description: "Kick a user from a guild", inputSchema: KickSchema },
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
    { description: "Timeout a user", inputSchema: TimeoutSchema },
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
    { description: "Remove a timeout from a user", inputSchema: RemoveTimeoutSchema },
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
    { description: "List bans in a guild", inputSchema: ListBansSchema },
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
