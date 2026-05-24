import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolError, toolErrorFromUnknown, zodError } from "../lib/errors.js";

const ReactionSchema = z.object({
  channel_id: z.string(),
  message_id: z.string(),
  emoji: z.string(),
});

const RemoveUserReactionSchema = z.object({
  channel_id: z.string(),
  message_id: z.string(),
  emoji: z.string(),
  user_id: z.string(),
});

const ListReactionsSchema = z.object({
  channel_id: z.string(),
  message_id: z.string(),
  emoji: z.string(),
  limit: z.number().int().min(1).max(100).optional(),
});

const ClearReactionsSchema = z.object({
  channel_id: z.string(),
  message_id: z.string(),
});

async function fetchMessage(channelId: string, messageId: string) {
  const channel = await getClient().channels.fetch(channelId);
  if (!channel?.isTextBased()) return null;
  return channel.messages.fetch(messageId);
}

export function registerReactionTools(server: McpServer): void {
  server.registerTool(
    "add_reaction",
    { description: `Add an emoji reaction to a Discord message.

Required parameters:
  • channel_id — Discord channel snowflake ID (17-19 digit integer string, e.g. "1396725483621223584").
    NOT an OpenButler UUID. Call discord-ext_list_channels first if you don't know it.
  • message_id — Discord message snowflake ID (17-19 digit integer string, e.g. "1396730001621223584").
    NOT an OpenButler UUID. Call discord-ext_list_messages first.
  • emoji — emoji to react with. Use Unicode emoji (e.g. "👍") or a custom emoji in the format "emojiName:emojiId" (e.g. "party:123456789012345678").

Returns: "Reaction added"

Example: discord-ext_add_reaction({ channel_id: "1396725483621223584", message_id: "1396730001621223584", emoji: "👍" })`, inputSchema: ReactionSchema },
    async (args) => {
      const parsed = ReactionSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const msg = await fetchMessage(parsed.data.channel_id, parsed.data.message_id);
        if (!msg) return toolError("Message not found");
        await msg.react(parsed.data.emoji);
        return { content: [{ type: "text" as const, text: "Reaction added" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "remove_reaction",
    { description: `Remove the bot's own emoji reaction from a Discord message. Only removes the bot's reaction, not other users'.

Required parameters:
  • channel_id — Discord channel snowflake ID (17-19 digit integer string, e.g. "1396725483621223584").
    NOT an OpenButler UUID. Call discord-ext_list_channels first if you don't know it.
  • message_id — Discord message snowflake ID (17-19 digit integer string, e.g. "1396730001621223584").
    NOT an OpenButler UUID.
  • emoji — the emoji string to remove (must match the exact emoji previously added, e.g. "👍")

Returns: "Reaction removed"

Example: discord-ext_remove_reaction({ channel_id: "1396725483621223584", message_id: "1396730001621223584", emoji: "👍" })`, inputSchema: ReactionSchema },
    async (args) => {
      const parsed = ReactionSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const msg = await fetchMessage(parsed.data.channel_id, parsed.data.message_id);
        if (!msg) return toolError("Message not found");
        await msg.reactions.resolve(parsed.data.emoji)?.users.remove();
        return { content: [{ type: "text" as const, text: "Reaction removed" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "remove_user_reaction",
    { description: `Remove a specific user's emoji reaction from a Discord message. Requires the Manage Messages permission.

Required parameters:
  • channel_id — Discord channel snowflake ID (17-19 digit integer string, e.g. "1396725483621223584").
    NOT an OpenButler UUID. Call discord-ext_list_channels first if you don't know it.
  • message_id — Discord message snowflake ID (17-19 digit integer string, e.g. "1396730001621223584").
    NOT an OpenButler UUID.
  • emoji — the emoji string to remove (e.g. "👍")
  • user_id — Discord user snowflake ID whose reaction to remove (17-19 digit integer string, e.g. "281937542917916673").
    NOT an OpenButler UUID.

Returns: "User reaction removed"

Example: discord-ext_remove_user_reaction({ channel_id: "1396725483621223584", message_id: "1396730001621223584", emoji: "👍", user_id: "281937542917916673" })`, inputSchema: RemoveUserReactionSchema },
    async (args) => {
      const parsed = RemoveUserReactionSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const msg = await fetchMessage(parsed.data.channel_id, parsed.data.message_id);
        if (!msg) return toolError("Message not found");
        await msg.reactions.resolve(parsed.data.emoji)?.users.remove(parsed.data.user_id);
        return { content: [{ type: "text" as const, text: "User reaction removed" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "list_reactions",
    { description: `List users who reacted to a Discord message with a specific emoji.

Required parameters:
  • channel_id — Discord channel snowflake ID (17-19 digit integer string, e.g. "1396725483621223584").
    NOT an OpenButler UUID. Call discord-ext_list_channels first if you don't know it.
  • message_id — Discord message snowflake ID (17-19 digit integer string, e.g. "1396730001621223584").
    NOT an OpenButler UUID.
  • emoji — the emoji to look up (e.g. "👍")

Optional:
  • limit — max users to return (1–100, default 100)

Returns: [{ id, username }]

Example: discord-ext_list_reactions({ channel_id: "1396725483621223584", message_id: "1396730001621223584", emoji: "👍", limit: 25 })`, inputSchema: ListReactionsSchema },
    async (args) => {
      const parsed = ListReactionsSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const msg = await fetchMessage(parsed.data.channel_id, parsed.data.message_id);
        if (!msg) return toolError("Message not found");
        const reaction = msg.reactions.resolve(parsed.data.emoji);
        if (!reaction) return toolError("Reaction not found");
        const users = await reaction.users.fetch({ limit: parsed.data.limit ?? 100 });
        const list = users.map((u) => ({ id: u.id, username: u.username }));
        return { content: [{ type: "text" as const, text: JSON.stringify(list) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "clear_reactions",
    { description: `Remove all emoji reactions from a Discord message. Requires the Manage Messages permission.

Required parameters:
  • channel_id — Discord channel snowflake ID (17-19 digit integer string, e.g. "1396725483621223584").
    NOT an OpenButler UUID. Call discord-ext_list_channels first if you don't know it.
  • message_id — Discord message snowflake ID (17-19 digit integer string, e.g. "1396730001621223584").
    NOT an OpenButler UUID.

Returns: "All reactions cleared"

Example: discord-ext_clear_reactions({ channel_id: "1396725483621223584", message_id: "1396730001621223584" })`, inputSchema: ClearReactionsSchema },
    async (args) => {
      const parsed = ClearReactionsSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const msg = await fetchMessage(parsed.data.channel_id, parsed.data.message_id);
        if (!msg) return toolError("Message not found");
        await msg.reactions.removeAll();
        return { content: [{ type: "text" as const, text: "All reactions cleared" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );
}
