import { z } from "zod";
import { EmbedBuilder } from "discord.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolError, toolErrorFromUnknown, zodError } from "../lib/errors.js";

const ListWebhooksSchema = z.object({ channel_id: z.string() });

const CreateWebhookSchema = z.object({
  channel_id: z.string(),
  name: z.string(),
  avatar_url: z.string().optional(),
});

const DeleteWebhookSchema = z.object({ webhook_id: z.string() });

const SendWebhookMessageSchema = z.object({
  webhook_id: z.string(),
  webhook_token: z.string(),
  content: z.string(),
  username: z.string().optional(),
  avatar_url: z.string().optional(),
  embeds: z
    .array(
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        color: z.number().optional(),
      })
    )
    .optional(),
});

export function registerWebhookTools(server: McpServer): void {
  server.registerTool(
    "list_webhooks",
    { description: `List all webhooks in a Discord channel.

Required parameters:
  • channel_id — Discord channel snowflake ID (17-19 digit integer string, e.g. "1396725483621223584").
    NOT an OpenButler UUID. Call discord-ext_list_channels first if you don't know it.

Returns: [{ id, name, url }]

Example: discord-ext_list_webhooks({ channel_id: "1396725483621223584" })`, inputSchema: ListWebhooksSchema },
    async (args) => {
      const parsed = ListWebhooksSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.channel_id);
        if (!channel || !("fetchWebhooks" in channel)) return toolError("Channel not found or doesn't support webhooks");
        const webhooks = await (channel as { fetchWebhooks: () => Promise<Map<string, { id: string; name: string | null; url: string }>> }).fetchWebhooks();
        const list = [...webhooks.values()].map((w) => ({ id: w.id, name: w.name, url: w.url }));
        return { content: [{ type: "text" as const, text: JSON.stringify(list) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "create_webhook",
    { description: `Create a new webhook in a Discord channel. Webhooks can send messages with a custom name and avatar.

Required parameters:
  • channel_id — Discord channel snowflake ID (17-19 digit integer string, e.g. "1396725483621223584").
    NOT an OpenButler UUID. Call discord-ext_list_channels first if you don't know it.
  • name — name for the webhook (e.g. "Announcements")

Optional:
  • avatar_url — URL for the webhook avatar image

Returns: { id, name, token }

Example: discord-ext_create_webhook({ channel_id: "1396725483621223584", name: "Announcements" })`, inputSchema: CreateWebhookSchema },
    async (args) => {
      const parsed = CreateWebhookSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.channel_id);
        if (!channel || !("createWebhook" in channel)) return toolError("Channel not found or doesn't support webhooks");
        const webhook = await (channel as { createWebhook: (opts: { name: string; avatar?: string }) => Promise<{ id: string; name: string | null; token: string | null }> }).createWebhook({
          name: parsed.data.name,
          avatar: parsed.data.avatar_url,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify({ id: webhook.id, name: webhook.name, token: webhook.token }) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "delete_webhook",
    { description: `Delete a Discord webhook.

Required parameters:
  • webhook_id — Discord webhook snowflake ID (17-19 digit integer string, e.g. "1396726000621223584").
    NOT an OpenButler UUID. Call discord-ext_list_webhooks first if you don't know it.

Returns: "Webhook deleted"

Example: discord-ext_delete_webhook({ webhook_id: "1396726000621223584" })`, inputSchema: DeleteWebhookSchema },
    async (args) => {
      const parsed = DeleteWebhookSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const webhook = await getClient().fetchWebhook(parsed.data.webhook_id);
        await webhook.delete();
        return { content: [{ type: "text" as const, text: "Webhook deleted" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "send_webhook_message",
    { description: `Send a message through a Discord webhook with optional custom username, avatar, and embeds.

Required parameters:
  • webhook_id — Discord webhook snowflake ID (17-19 digit integer string, e.g. "1396726000621223584").
    NOT an OpenButler UUID. Call discord-ext_list_webhooks first if you don't know it.
  • webhook_token — webhook token string (returned by discord-ext_create_webhook or discord-ext_list_webhooks)
  • content — message text to send

Optional:
  • username — override the webhook's default name for this message
  • avatar_url — override the webhook's default avatar for this message
  • embeds — array of embed objects, each with optional title, description, color fields

Returns: { id }

Example: discord-ext_send_webhook_message({ webhook_id: "1396726000621223584", webhook_token: "abc123xyz", content: "Deploy complete!", username: "CI Bot" })`, inputSchema: SendWebhookMessageSchema },
    async (args) => {
      const parsed = SendWebhookMessageSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const webhook = await getClient().fetchWebhook(parsed.data.webhook_id, parsed.data.webhook_token);
        const embeds = (parsed.data.embeds ?? []).map((e) => {
          const builder = new EmbedBuilder();
          if (e.title) builder.setTitle(e.title);
          if (e.description) builder.setDescription(e.description);
          if (e.color !== undefined) builder.setColor(e.color);
          return builder;
        });
        const msg = await webhook.send({
          content: parsed.data.content,
          username: parsed.data.username,
          avatarURL: parsed.data.avatar_url,
          embeds,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify({ id: msg.id }) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );
}
