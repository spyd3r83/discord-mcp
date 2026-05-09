import { z } from "zod";
import { EmbedBuilder, type TextChannel } from "discord.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolError, toolErrorFromUnknown, zodError } from "../lib/errors.js";

const SendMessageSchema = z.object({
  channel_id: z.string(),
  content: z.string(),
  reply_to_id: z.string().optional(),
});

const EditMessageSchema = z.object({
  channel_id: z.string(),
  message_id: z.string(),
  content: z.string(),
});

const DeleteMessageSchema = z.object({
  channel_id: z.string(),
  message_id: z.string(),
});

const GetMessageSchema = z.object({
  channel_id: z.string(),
  message_id: z.string(),
});

const ListMessagesSchema = z.object({
  channel_id: z.string(),
  limit: z.number().int().min(1).max(100).optional(),
  before: z.string().optional(),
  after: z.string().optional(),
});

const PinMessageSchema = z.object({
  channel_id: z.string(),
  message_id: z.string(),
});

const SendEmbedSchema = z.object({
  channel_id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  color: z.number().optional(),
  fields: z
    .array(z.object({ name: z.string(), value: z.string(), inline: z.boolean().optional() }))
    .optional(),
  url: z.string().optional(),
  image_url: z.string().optional(),
  footer: z.string().optional(),
});

export function registerMessageTools(server: McpServer): void {
  server.registerTool(
    "send_message",
    {
      description: "Send a text message to a Discord channel",
      inputSchema: SendMessageSchema,
    },
    async (args) => {
      const parsed = SendMessageSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.channel_id);
        if (!channel?.isTextBased()) return toolError("Channel not found or not text-based");
        const options = parsed.data.reply_to_id
          ? { content: parsed.data.content, reply: { messageReference: parsed.data.reply_to_id } }
          : { content: parsed.data.content };
        const msg = await (channel as TextChannel).send(options);
        return { content: [{ type: "text" as const, text: JSON.stringify({ id: msg.id, content: msg.content }) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "edit_message",
    {
      description: "Edit an existing message",
      inputSchema: EditMessageSchema,
    },
    async (args) => {
      const parsed = EditMessageSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.channel_id);
        if (!channel?.isTextBased()) return toolError("Channel not found or not text-based");
        const msg = await (channel as TextChannel).messages.fetch(parsed.data.message_id);
        const edited = await msg.edit(parsed.data.content);
        return { content: [{ type: "text" as const, text: JSON.stringify({ id: edited.id, content: edited.content }) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "delete_message",
    {
      description: "Delete a message",
      inputSchema: DeleteMessageSchema,
    },
    async (args) => {
      const parsed = DeleteMessageSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.channel_id);
        if (!channel?.isTextBased()) return toolError("Channel not found or not text-based");
        const msg = await (channel as TextChannel).messages.fetch(parsed.data.message_id);
        await msg.delete();
        return { content: [{ type: "text" as const, text: "Message deleted" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "get_message",
    {
      description: "Fetch a single message",
      inputSchema: GetMessageSchema,
    },
    async (args) => {
      const parsed = GetMessageSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.channel_id);
        if (!channel?.isTextBased()) return toolError("Channel not found or not text-based");
        const msg = await (channel as TextChannel).messages.fetch(parsed.data.message_id);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ id: msg.id, content: msg.content, author: msg.author.tag, timestamp: msg.createdAt }),
          }],
        };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "list_messages",
    {
      description: "Fetch recent messages from a channel",
      inputSchema: ListMessagesSchema,
    },
    async (args) => {
      const parsed = ListMessagesSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.channel_id);
        if (!channel?.isTextBased()) return toolError("Channel not found or not text-based");
        const options: { limit?: number; before?: string; after?: string } = {};
        if (parsed.data.limit) options.limit = parsed.data.limit;
        if (parsed.data.before) options.before = parsed.data.before;
        if (parsed.data.after) options.after = parsed.data.after;
        const messages = await (channel as TextChannel).messages.fetch(options);
        const list = messages.map((m) => ({ id: m.id, content: m.content, author: m.author.tag }));
        return { content: [{ type: "text" as const, text: JSON.stringify(list) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "pin_message",
    {
      description: "Pin a message in a channel",
      inputSchema: PinMessageSchema,
    },
    async (args) => {
      const parsed = PinMessageSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.channel_id);
        if (!channel?.isTextBased()) return toolError("Channel not found or not text-based");
        const msg = await (channel as TextChannel).messages.fetch(parsed.data.message_id);
        await msg.pin();
        return { content: [{ type: "text" as const, text: "Message pinned" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "unpin_message",
    {
      description: "Unpin a message in a channel",
      inputSchema: PinMessageSchema,
    },
    async (args) => {
      const parsed = PinMessageSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.channel_id);
        if (!channel?.isTextBased()) return toolError("Channel not found or not text-based");
        const msg = await (channel as TextChannel).messages.fetch(parsed.data.message_id);
        await msg.unpin();
        return { content: [{ type: "text" as const, text: "Message unpinned" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "send_embed",
    {
      description: "Send an embed message to a channel",
      inputSchema: SendEmbedSchema,
    },
    async (args) => {
      const parsed = SendEmbedSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.channel_id);
        if (!channel?.isTextBased()) return toolError("Channel not found or not text-based");
        const embed = new EmbedBuilder();
        if (parsed.data.title) embed.setTitle(parsed.data.title);
        if (parsed.data.description) embed.setDescription(parsed.data.description);
        if (parsed.data.color !== undefined) embed.setColor(parsed.data.color);
        if (parsed.data.url) embed.setURL(parsed.data.url);
        if (parsed.data.image_url) embed.setImage(parsed.data.image_url);
        if (parsed.data.footer) embed.setFooter({ text: parsed.data.footer });
        if (parsed.data.fields) embed.addFields(parsed.data.fields.map((f) => ({ name: f.name, value: f.value, inline: f.inline ?? false })));
        const msg = await (channel as TextChannel).send({ embeds: [embed] });
        return { content: [{ type: "text" as const, text: JSON.stringify({ id: msg.id }) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );
}
