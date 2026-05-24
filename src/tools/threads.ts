import { z } from "zod";
import { ChannelType, type TextChannel, type ThreadChannel } from "discord.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolError, toolErrorFromUnknown, zodError } from "../lib/errors.js";

const CreateThreadSchema = z.object({
  channel_id: z.string(),
  message_id: z.string(),
  name: z.string(),
  auto_archive_duration: z.number().optional(),
});

const CreateStandaloneThreadSchema = z.object({
  channel_id: z.string(),
  name: z.string(),
  type: z.number().optional(),
  auto_archive_duration: z.number().optional(),
});

const ListThreadsSchema = z.object({ guild_id: z.string() });
const ArchiveThreadSchema = z.object({ thread_id: z.string() });

const ThreadMemberSchema = z.object({
  thread_id: z.string(),
  user_id: z.string(),
});

export function registerThreadTools(server: McpServer): void {
  server.registerTool(
    "create_thread",
    { description: `Create a thread attached to an existing Discord message. The thread starts in the same channel as the message.

Required parameters:
  • channel_id — Discord channel snowflake ID (17-19 digit integer string, e.g. "1396725483621223584").
    NOT a non-Discord UUID. Call discord-ext_list_channels first if you don't know it.
  • message_id — Discord message snowflake ID to attach the thread to (17-19 digit integer string, e.g. "1396730001621223584").
    NOT a non-Discord UUID. Call discord-ext_list_messages first.
  • name — name for the new thread (e.g. "Bug Discussion")

Optional:
  • auto_archive_duration — auto-archive inactivity in minutes (60, 1440, 4320, or 10080, default 1440)

Returns: { id, name }

Example: discord-ext_create_thread({ channel_id: "1396725483621223584", message_id: "1396730001621223584", name: "Bug Discussion" })`, inputSchema: CreateThreadSchema },
    async (args) => {
      const parsed = CreateThreadSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.channel_id);
        if (!channel?.isTextBased()) return toolError("Channel not text-based");
        const msg = await (channel as TextChannel).messages.fetch(parsed.data.message_id);
        const thread = await msg.startThread({
          name: parsed.data.name,
          autoArchiveDuration: (parsed.data.auto_archive_duration ?? 1440) as 60 | 1440 | 4320 | 10080,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify({ id: thread.id, name: thread.name }) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "create_standalone_thread",
    { description: `Create a standalone thread in a Discord channel without attaching it to a specific message.

Required parameters:
  • channel_id — Discord channel snowflake ID (17-19 digit integer string, e.g. "1396725483621223584").
    NOT a non-Discord UUID. Call discord-ext_list_channels first if you don't know it.
  • name — name for the new thread (e.g. "General Discussion")

Optional:
  • type — Discord ChannelType number (11 = public thread, 12 = private thread, default 11)
  • auto_archive_duration — auto-archive inactivity in minutes (60, 1440, 4320, or 10080, default 1440)

Returns: { id, name }

Example: discord-ext_create_standalone_thread({ channel_id: "1396725483621223584", name: "General Discussion", type: 11 })`, inputSchema: CreateStandaloneThreadSchema },
    async (args) => {
      const parsed = CreateStandaloneThreadSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.channel_id);
        if (!channel?.isTextBased()) return toolError("Channel not text-based");
        const thread = await (channel as TextChannel).threads.create({
          name: parsed.data.name,
          type: (parsed.data.type ?? ChannelType.PublicThread) as ChannelType.PublicThread | ChannelType.PrivateThread,
          autoArchiveDuration: (parsed.data.auto_archive_duration ?? 1440) as 60 | 1440 | 4320 | 10080,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify({ id: thread.id, name: thread.name }) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "list_threads",
    { description: `List all active threads in a Discord guild (server).

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    NOT a non-Discord UUID. Call discord-ext_list_guilds first if you don't know it.

Returns: [{ id, name, archived }]

Example: discord-ext_list_threads({ guild_id: "1396724253621223584" })`, inputSchema: ListThreadsSchema },
    async (args) => {
      const parsed = ListThreadsSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        const threads = await guild.channels.fetchActiveThreads();
        const list = threads.threads.map((t) => ({ id: t.id, name: t.name, archived: t.archived }));
        return { content: [{ type: "text" as const, text: JSON.stringify(list) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "archive_thread",
    { description: `Archive a Discord thread. Archived threads are hidden but can be unarchived later.

Required parameters:
  • thread_id — Discord thread snowflake ID (17-19 digit integer string, e.g. "1396725500621223584").
    NOT a non-Discord UUID. Call discord-ext_list_threads first if you don't know it.

Returns: "Thread archived"

Example: discord-ext_archive_thread({ thread_id: "1396725500621223584" })`, inputSchema: ArchiveThreadSchema },
    async (args) => {
      const parsed = ArchiveThreadSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.thread_id);
        if (!channel?.isThread()) return toolError("Not a thread");
        await (channel as ThreadChannel).setArchived(true);
        return { content: [{ type: "text" as const, text: "Thread archived" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "unarchive_thread",
    { description: `Unarchive a previously archived Discord thread, making it active again.

Required parameters:
  • thread_id — Discord thread snowflake ID (17-19 digit integer string, e.g. "1396725500621223584").
    NOT a non-Discord UUID. Call discord-ext_list_threads first if you don't know it.

Returns: "Thread unarchived"

Example: discord-ext_unarchive_thread({ thread_id: "1396725500621223584" })`, inputSchema: ArchiveThreadSchema },
    async (args) => {
      const parsed = ArchiveThreadSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.thread_id);
        if (!channel?.isThread()) return toolError("Not a thread");
        await (channel as ThreadChannel).setArchived(false);
        return { content: [{ type: "text" as const, text: "Thread unarchived" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "add_thread_member",
    { description: `Add a member to a Discord thread. The user will be able to see and send messages in the thread.

Required parameters:
  • thread_id — Discord thread snowflake ID (17-19 digit integer string, e.g. "1396725500621223584").
    NOT a non-Discord UUID. Call discord-ext_list_threads first if you don't know it.
  • user_id — Discord user snowflake ID (17-19 digit integer string, e.g. "281937542917916673").
    NOT a non-Discord UUID. Call discord-ext_search_members first.

Returns: "Member added to thread"

Example: discord-ext_add_thread_member({ thread_id: "1396725500621223584", user_id: "281937542917916673" })`, inputSchema: ThreadMemberSchema },
    async (args) => {
      const parsed = ThreadMemberSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.thread_id);
        if (!channel?.isThread()) return toolError("Not a thread");
        await (channel as ThreadChannel).members.add(parsed.data.user_id);
        return { content: [{ type: "text" as const, text: "Member added to thread" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "remove_thread_member",
    { description: `Remove a member from a Discord thread. The user will no longer see the thread.

Required parameters:
  • thread_id — Discord thread snowflake ID (17-19 digit integer string, e.g. "1396725500621223584").
    NOT a non-Discord UUID. Call discord-ext_list_threads first if you don't know it.
  • user_id — Discord user snowflake ID (17-19 digit integer string, e.g. "281937542917916673").
    NOT a non-Discord UUID.

Returns: "Member removed from thread"

Example: discord-ext_remove_thread_member({ thread_id: "1396725500621223584", user_id: "281937542917916673" })`, inputSchema: ThreadMemberSchema },
    async (args) => {
      const parsed = ThreadMemberSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.thread_id);
        if (!channel?.isThread()) return toolError("Not a thread");
        await (channel as ThreadChannel).members.remove(parsed.data.user_id);
        return { content: [{ type: "text" as const, text: "Member removed from thread" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );
}
