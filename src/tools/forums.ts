import { z } from "zod";
import { ChannelType, type ForumChannel, type ThreadChannel } from "discord.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolError, toolErrorFromUnknown, zodError } from "../lib/errors.js";

const ListForumPostsSchema = z.object({ channel_id: z.string() });

const CreateForumPostSchema = z.object({
  channel_id: z.string(),
  name: z.string(),
  content: z.string(),
  tags: z.array(z.string()).optional(),
});

const CloseForumPostSchema = z.object({ thread_id: z.string() });

export function registerForumTools(server: McpServer): void {
  server.registerTool(
    "list_forum_posts",
    {
      description: `List all active (non-archived) posts in a Discord forum channel.

Required parameter:
  • channel_id — Discord snowflake ID of the forum channel (17-19 digit integer string).
    Must be a ChannelType 15 (GuildForum) channel. NOT an OpenButler channel UUID.
    Call discord-ext_list_channels with type=15 to find forum channel snowflakes by name.

Returns: [{ id, name, archived }] — active forum thread posts.`,
      inputSchema: ListForumPostsSchema,
    },
    async (args) => {
      const parsed = ListForumPostsSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.channel_id);
        if (!channel || channel.type !== ChannelType.GuildForum) return toolError("Not a forum channel");
        const forum = channel as ForumChannel;
        const threads = await forum.threads.fetchActive();
        const list = threads.threads.map((t) => ({ id: t.id, name: t.name, archived: t.archived }));
        return { content: [{ type: "text" as const, text: JSON.stringify(list) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "create_forum_post",
    {
      description: `Create a new post (thread) inside a Discord forum channel.

Required parameters:
  • channel_id — Discord snowflake ID of the forum channel (17-19 digit integer, ChannelType 15).
    NOT an OpenButler channel UUID. Use discord-ext_list_channels with type=15 to find it.
  • name — title of the forum post
  • content — body text of the opening message

Optional:
  • tags — array of tag names to apply (must match the forum's available tag names exactly)

Returns: { id: "<thread snowflake>", name: "<post title>" }`,
      inputSchema: CreateForumPostSchema,
    },
    async (args) => {
      const parsed = CreateForumPostSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.channel_id);
        if (!channel || channel.type !== ChannelType.GuildForum) return toolError("Not a forum channel");
        const forum = channel as ForumChannel;
        const appliedTags = parsed.data.tags
          ? forum.availableTags
              .filter((t) => parsed.data.tags?.includes(t.name))
              .map((t) => t.id)
          : [];
        const thread = await forum.threads.create({
          name: parsed.data.name,
          message: { content: parsed.data.content },
          appliedTags,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify({ id: thread.id, name: thread.name }) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "close_forum_post",
    {
      description: `Archive (close) a forum post by its thread snowflake ID.

Required parameter:
  • thread_id — Discord snowflake ID of the forum thread/post to archive (17-19 digit integer).
    Call discord-ext_list_forum_posts to find the thread snowflake ID by name.

Archived posts are hidden from the active list but not deleted. The bot needs Manage Threads permission.`,
      inputSchema: CloseForumPostSchema,
    },
    async (args) => {
      const parsed = CloseForumPostSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const channel = await getClient().channels.fetch(parsed.data.thread_id);
        if (!channel?.isThread()) return toolError("Not a thread");
        await (channel as ThreadChannel).setArchived(true);
        return { content: [{ type: "text" as const, text: "Forum post closed" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );
}
