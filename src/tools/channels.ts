import { z } from "zod";
import {
  ChannelType,
  OverwriteType,
  type GuildChannel,
  type Guild,
  type NonThreadGuildBasedChannel,
} from "discord.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolError, toolErrorFromUnknown, zodError } from "../lib/errors.js";

const ListChannelsSchema = z.object({
  guild_id: z.string(),
  type: z.number().optional(),
});

const GetChannelSchema = z.object({ channel_id: z.string() });

const CreateChannelSchema = z.object({
  guild_id: z.string(),
  name: z.string(),
  type: z.number(),
  topic: z.string().optional(),
  parent_id: z.string().optional(),
});

const EditChannelSchema = z.object({
  channel_id: z.string(),
  name: z.string().optional(),
  topic: z.string().optional(),
  slowmode: z.number().optional(),
  nsfw: z.boolean().optional(),
});

const DeleteChannelSchema = z.object({ channel_id: z.string() });

const SetPermissionsSchema = z.object({
  channel_id: z.string(),
  target_id: z.string(),
  target_type: z.enum(["role", "member"]),
  allow: z.string().optional(),
  deny: z.string().optional(),
});

export function registerChannelTools(server: McpServer): void {
  server.registerTool(
    "list_channels",
    {
      description: `List all channels (text, voice, forum, category, etc.) in a Discord guild (server).

Returns each channel's Discord snowflake ID (a 17-19 digit integer string like "1471337835444310187"), display name, and channel type number.

IMPORTANT — two different kinds of "channel ID" exist in this system:
  • Discord channel ID: a 17-19 digit snowflake number (e.g. "1471337835444310187"). This is what this tool uses.
  • Non-Discord channel ID: a short UUID like "bcdf5931-...". Used in other apps' internal routing — completely different.
Never confuse them. This tool only understands Discord snowflake IDs.

Required parameter:
  • guild_id — the Discord guild (server) snowflake ID (17-19 digits). Call discord-ext_list_guilds first if you don't know it.

Optional parameter:
  • type — filter by Discord ChannelType integer (0=text, 2=voice, 4=category, 5=announcement, 15=forum, etc.)

Typical workflow:
  1. discord-ext_list_guilds()                           → get guild_id (e.g. "1396724253621223584")
  2. discord-ext_list_channels({ guild_id: "1396..." })  → find channel by name, note its snowflake id
  3. discord-ext_list_messages({ channel_id: "1471..." }) → read messages

Example result item: { "id": "1471337835444310187", "name": "sportsnews", "type": 0 }`,
      inputSchema: ListChannelsSchema,
    },
    async (args) => {
      const parsed = ListChannelsSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        const channels = await guild.channels.fetch();
        const list = channels
          .filter((c): c is NonThreadGuildBasedChannel =>
            c !== null && (parsed.data.type === undefined || c.type === parsed.data.type)
          )
          .map((c) => ({ id: c.id, name: c.name, type: c.type }));
        return { content: [{ type: "text" as const, text: JSON.stringify(list) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "get_channel",
    {
      description: `Fetch metadata for a single Discord channel by its Discord snowflake ID.

Returns the channel's snowflake id, type, and (for guild channels) name and guild_id.

IMPORTANT — channel_id here is a Discord snowflake (17-19 digit integer string like "1471337835444310187"),
NOT a non-Discord channel UUID (like "bcdf5931-..."). These are completely different identifiers.

If you only know the channel name (e.g. "#sportsnews"), call discord-ext_list_channels first to look up its snowflake ID.

Example: discord-ext_get_channel({ channel_id: "1471337835444310187" })`,
      inputSchema: GetChannelSchema,
    },
    async (args) => {
      const parsed = GetChannelSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.channel_id);
        if (!channel) return toolError("Channel not found");
        const info = { id: channel.id, type: channel.type };
        return { content: [{ type: "text" as const, text: JSON.stringify(info) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "create_channel",
    {
      description: `Create a new channel in a Discord guild (server).

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digits, e.g. "1396724253621223584"). Call discord-ext_list_guilds to find it.
  • name — channel name (lowercase, hyphens for spaces)
  • type — Discord ChannelType integer: 0=text, 2=voice, 4=category, 5=announcement, 15=forum

Optional:
  • topic — channel description/topic shown in the channel header
  • parent_id — Discord snowflake ID of the parent category channel

Returns the new channel's snowflake ID and name.
Example: discord-ext_create_channel({ guild_id: "1396...", name: "new-alerts", type: 0 })`,
      inputSchema: CreateChannelSchema,
    },
    async (args) => {
      const parsed = CreateChannelSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        const type = parsed.data.type as ChannelType.GuildText;
        const created = await guild.channels.create({
          name: parsed.data.name,
          type,
          topic: parsed.data.topic,
          parent: parsed.data.parent_id,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify({ id: created.id, name: created.name }) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "edit_channel",
    {
      description: `Edit properties of an existing Discord channel (name, topic, slowmode, NSFW flag).

Required parameter:
  • channel_id — Discord channel snowflake ID (17-19 digits, e.g. "1471337835444310187").
    NOT a non-Discord channel UUID. Call discord-ext_list_channels to look up a channel snowflake by name.

Optional parameters (omit to leave unchanged):
  • name — new channel name
  • topic — new channel topic/description
  • slowmode — slow-mode delay in seconds (0 = off)
  • nsfw — mark channel as age-restricted

Returns updated channel id and name.`,
      inputSchema: EditChannelSchema,
    },
    async (args) => {
      const parsed = EditChannelSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.channel_id);
        if (!channel || !("edit" in channel)) return toolError("Channel not found or not editable");
        const edited = await (channel as GuildChannel).edit({
          name: parsed.data.name,
          topic: parsed.data.topic,
          rateLimitPerUser: parsed.data.slowmode,
          nsfw: parsed.data.nsfw,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify({ id: edited.id, name: edited.name }) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "delete_channel",
    {
      description: `Permanently delete a Discord channel by its snowflake ID. This action is irreversible.

Required parameter:
  • channel_id — Discord channel snowflake ID (17-19 digits, e.g. "1471337835444310187").
    NOT a non-Discord channel UUID. Use discord-ext_list_channels to look up the snowflake by channel name.

WARNING: Deletion is permanent. Confirm the correct snowflake before calling.`,
      inputSchema: DeleteChannelSchema,
    },
    async (args) => {
      const parsed = DeleteChannelSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.channel_id);
        if (!channel || !("delete" in channel)) return toolError("Channel not found");
        await (channel as GuildChannel).delete();
        return { content: [{ type: "text" as const, text: "Channel deleted" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "set_channel_permissions",
    {
      description: `Set a permission overwrite for a role or member on a specific Discord channel.

Required parameters:
  • channel_id — Discord channel snowflake ID (17-19 digits). NOT a non-Discord channel UUID.
  • target_id — snowflake ID of the role or member to set permissions for
  • target_type — "role" or "member"

Optional (at least one should be set):
  • allow — permission bit flag string to explicitly allow
  • deny — permission bit flag string to explicitly deny

Use discord-ext_list_channels to find channel snowflakes; discord-ext_list_members or discord-ext_list_roles to find target snowflakes.`,
      inputSchema: SetPermissionsSchema,
    },
    async (args) => {
      const parsed = SetPermissionsSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.channel_id);
        if (!channel || !("permissionOverwrites" in channel)) return toolError("Channel not found or not a guild channel");
        const gc = channel as GuildChannel;
        const overwriteType =
          parsed.data.target_type === "role"
            ? OverwriteType.Role
            : OverwriteType.Member;
        await gc.permissionOverwrites.create(parsed.data.target_id, {
          ...(parsed.data.allow ? { [parsed.data.allow]: true } : {}),
          ...(parsed.data.deny ? { [parsed.data.deny]: false } : {}),
        }, { type: overwriteType });
        return { content: [{ type: "text" as const, text: "Permissions updated" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );
}

export type { Guild };
