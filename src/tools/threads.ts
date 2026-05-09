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
    { description: "Create a thread from a message", inputSchema: CreateThreadSchema },
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
    { description: "Create a thread without a source message", inputSchema: CreateStandaloneThreadSchema },
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
    { description: "List active threads in a guild", inputSchema: ListThreadsSchema },
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
    { description: "Archive a thread", inputSchema: ArchiveThreadSchema },
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
    { description: "Unarchive a thread", inputSchema: ArchiveThreadSchema },
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
    { description: "Add a member to a thread", inputSchema: ThreadMemberSchema },
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
    { description: "Remove a member from a thread", inputSchema: ThreadMemberSchema },
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
