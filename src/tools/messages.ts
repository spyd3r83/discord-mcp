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
      description: `Send a plain text message to a Discord channel.

Required parameters:
  • channel_id — Discord channel snowflake ID (17-19 digit integer string, e.g. "1397109398337224736").
    This is NOT an OpenButler channel UUID (like "bcdf5931-..."). These are completely different IDs.
    If you only know the channel name (e.g. "#sportsnews"), call discord-ext_list_channels first
    to look up its snowflake ID from the guild.
  • content — the message text to send (max 2000 characters)

Optional:
  • reply_to_id — snowflake ID of a message to reply to (creates a threaded reply)

Returns the sent message's snowflake id and content.

Example:
  discord-ext_send_message({ channel_id: "1397109398337224736", content: "Hello!" })`,
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
      description: `Edit the content of an existing Discord message (only messages sent by the bot can be edited).

Required parameters:
  • channel_id — Discord channel snowflake ID (17-19 digit number, e.g. "1397109398337224736").
    NOT an OpenButler channel UUID. Use discord-ext_list_channels to find a channel snowflake by name.
  • message_id — Discord message snowflake ID to edit
  • content — new message text

Returns updated message id and content.`,
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
      description: `Delete a Discord message from a channel.

Required parameters:
  • channel_id — Discord channel snowflake ID (17-19 digit number, e.g. "1397109398337224736").
    NOT an OpenButler channel UUID.
  • message_id — Discord message snowflake ID to delete

Deletion is permanent. The bot must have Manage Messages permission to delete others' messages.`,
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
      description: `Fetch a single Discord message by its snowflake ID.

Required parameters:
  • channel_id — Discord channel snowflake ID (17-19 digit number, e.g. "1397109398337224736").
    NOT an OpenButler channel UUID. Use discord-ext_list_channels to look up channel snowflakes by name.
  • message_id — Discord message snowflake ID

Returns: { id, content, author (tag), timestamp }`,
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
      description: `Fetch recent messages from a Discord channel.

Required parameter:
  • channel_id — Discord channel snowflake ID (17-19 digit integer string, e.g. "1397109398337224736").
    This is a Discord snowflake, NOT an OpenButler channel UUID (like "bcdf5931-...").
    If you received a message from the user, their conversationId in the context block is already the Discord channel snowflake — use it directly.
    If you only know the channel name, call discord-ext_list_channels first to find the snowflake.

Optional parameters:
  • limit — number of messages to return (1–100, default: recent messages)
  • before — return messages before this message snowflake ID (for pagination)
  • after — return messages after this message snowflake ID (for pagination)

Returns an array of { id, content, author } objects, newest first.

Example:
  discord-ext_list_messages({ channel_id: "1471337835444310187", limit: 20 })`,
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
      description: `Pin a Discord message in a channel so it appears in the channel's pinned messages list.

Required parameters:
  • channel_id — Discord channel snowflake ID (17-19 digits, e.g. "1397109398337224736"). NOT an OpenButler channel UUID.
  • message_id — Discord message snowflake ID to pin

The bot must have Manage Messages permission.`,
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
      description: `Unpin a previously pinned Discord message from a channel.

Required parameters:
  • channel_id — Discord channel snowflake ID (17-19 digits, e.g. "1397109398337224736"). NOT an OpenButler channel UUID.
  • message_id — Discord message snowflake ID to unpin

The bot must have Manage Messages permission.`,
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
      description: `Send a rich embed message (with title, description, fields, color, image, etc.) to a Discord channel.

Required parameter:
  • channel_id — Discord channel snowflake ID (17-19 digit number, e.g. "1397109398337224736").
    NOT an OpenButler channel UUID. Use discord-ext_list_channels to find the snowflake by channel name.

Optional embed fields (at least one should be set to make a useful embed):
  • title — embed title (bold header)
  • description — embed body text (supports markdown)
  • color — integer color value (e.g. 0x00ff00 for green, 0xff0000 for red)
  • fields — array of { name, value, inline? } objects for structured data
  • url — URL to hyperlink the title
  • image_url — URL of an image to display in the embed
  • footer — small footer text

Returns the sent message's snowflake id.`,
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
