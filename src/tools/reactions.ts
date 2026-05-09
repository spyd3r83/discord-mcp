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
    { description: "Add a reaction to a message", inputSchema: ReactionSchema },
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
    { description: "Remove the bot's reaction from a message", inputSchema: ReactionSchema },
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
    { description: "Remove a specific user's reaction", inputSchema: RemoveUserReactionSchema },
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
    { description: "List users who reacted with an emoji", inputSchema: ListReactionsSchema },
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
    { description: "Clear all reactions from a message", inputSchema: ClearReactionsSchema },
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
