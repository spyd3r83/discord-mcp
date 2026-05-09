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
    { description: "List all channels in a guild", inputSchema: ListChannelsSchema },
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
    { description: "Get channel info", inputSchema: GetChannelSchema },
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
    { description: "Create a channel in a guild", inputSchema: CreateChannelSchema },
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
    { description: "Edit a channel", inputSchema: EditChannelSchema },
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
    { description: "Delete a channel", inputSchema: DeleteChannelSchema },
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
    { description: "Set permission overwrite on a channel", inputSchema: SetPermissionsSchema },
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
