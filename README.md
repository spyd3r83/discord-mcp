# discord-mcp

A full-featured Discord MCP (Model Context Protocol) server built with Bun and TypeScript. Exposes the complete Discord bot API surface as MCP tools over HTTP/SSE, ready to run as a standalone container.

## Features

- **50+ Discord tools** across messages, channels, guilds, roles, members, reactions, threads, webhooks, moderation, audit log, DMs, and forum channels
- **Streamable HTTP transport** — works over the network, runs as a container
- **MCP endpoint**: `http://localhost:3000/mcp`
- **Health endpoint**: `http://localhost:3000/health`
- Strict TypeScript, Zod validation on all inputs, structured error responses

## Quick Start

```bash
git clone https://github.com/your-org/discord-mcp
cd discord-mcp
cp .env.example .env
# Edit .env and set DISCORD_BOT_TOKEN
bun install
bun dev
```

## Docker

```bash
docker build -t discord-mcp .
docker run -e DISCORD_BOT_TOKEN=your-token-here -p 3000:3000 discord-mcp
```

## MCP Endpoint

Configure your MCP client to connect to:

```
http://localhost:3000/mcp
```

## Required Bot Permissions & Gateway Intents

Enable the following **Privileged Gateway Intents** in the Discord Developer Portal:

- `GUILD_MEMBERS` (Server Members Intent)
- `MESSAGE_CONTENT` (Message Content Intent)

**Required Bot Permissions**: `Administrator` (or selectively: Send Messages, Manage Messages, Manage Channels, Manage Roles, Manage Guild, Ban Members, Kick Members, Moderate Members, View Audit Log, Create Webhooks, Manage Webhooks, Add Reactions, Read Message History, Manage Threads)

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DISCORD_BOT_TOKEN` | ✅ | — | Discord bot token |
| `PORT` | ❌ | `3000` | HTTP server port |
| `LOG_LEVEL` | ❌ | `info` | Log level: `debug`, `info`, `warn`, `error` |

## Tool Reference

### Messages

| Tool | Description | Key Parameters |
|---|---|---|
| `send_message` | Send a text message | `channel_id`, `content`, `reply_to_id?` |
| `edit_message` | Edit a message | `channel_id`, `message_id`, `content` |
| `delete_message` | Delete a message | `channel_id`, `message_id` |
| `get_message` | Fetch a single message | `channel_id`, `message_id` |
| `list_messages` | Fetch recent messages | `channel_id`, `limit?`, `before?`, `after?` |
| `pin_message` | Pin a message | `channel_id`, `message_id` |
| `unpin_message` | Unpin a message | `channel_id`, `message_id` |
| `send_embed` | Send an embed | `channel_id`, `title?`, `description?`, `color?`, `fields?`, `url?`, `image_url?`, `footer?` |

### Channels

| Tool | Description | Key Parameters |
|---|---|---|
| `list_channels` | List all channels in a guild | `guild_id`, `type?` |
| `get_channel` | Get channel info | `channel_id` |
| `create_channel` | Create a channel | `guild_id`, `name`, `type`, `topic?`, `parent_id?` |
| `edit_channel` | Edit a channel | `channel_id`, `name?`, `topic?`, `slowmode?`, `nsfw?` |
| `delete_channel` | Delete a channel | `channel_id` |
| `set_channel_permissions` | Set permission overwrite | `channel_id`, `target_id`, `target_type`, `allow?`, `deny?` |

### Guilds

| Tool | Description | Key Parameters |
|---|---|---|
| `get_guild` | Get guild information | `guild_id` |
| `list_guilds` | List all guilds the bot is in | — |
| `get_guild_member_count` | Get member count | `guild_id` |

### Roles

| Tool | Description | Key Parameters |
|---|---|---|
| `list_roles` | List roles in a guild | `guild_id` |
| `get_role` | Get role info | `guild_id`, `role_id` |
| `create_role` | Create a role | `guild_id`, `name`, `color?`, `hoist?`, `mentionable?`, `permissions?` |
| `edit_role` | Edit a role | `guild_id`, `role_id`, `name?`, `color?`, `hoist?`, `mentionable?` |
| `delete_role` | Delete a role | `guild_id`, `role_id` |
| `assign_role` | Assign role to member | `guild_id`, `user_id`, `role_id` |
| `remove_role` | Remove role from member | `guild_id`, `user_id`, `role_id` |

### Members

| Tool | Description | Key Parameters |
|---|---|---|
| `get_member` | Get member info | `guild_id`, `user_id` |
| `list_members` | List members | `guild_id`, `limit?` |
| `search_members` | Search members by username | `guild_id`, `query`, `limit?` |
| `edit_member` | Edit member | `guild_id`, `user_id`, `nick?`, `mute?`, `deaf?` |

### Reactions

| Tool | Description | Key Parameters |
|---|---|---|
| `add_reaction` | Add reaction | `channel_id`, `message_id`, `emoji` |
| `remove_reaction` | Remove bot's reaction | `channel_id`, `message_id`, `emoji` |
| `remove_user_reaction` | Remove a user's reaction | `channel_id`, `message_id`, `emoji`, `user_id` |
| `list_reactions` | List users who reacted | `channel_id`, `message_id`, `emoji`, `limit?` |
| `clear_reactions` | Clear all reactions | `channel_id`, `message_id` |

### Threads

| Tool | Description | Key Parameters |
|---|---|---|
| `create_thread` | Create a thread from a message | `channel_id`, `message_id`, `name`, `auto_archive_duration?` |
| `create_standalone_thread` | Create a thread without a message | `channel_id`, `name`, `type?`, `auto_archive_duration?` |
| `list_threads` | List active threads in a guild | `guild_id` |
| `archive_thread` | Archive a thread | `thread_id` |
| `unarchive_thread` | Unarchive a thread | `thread_id` |
| `add_thread_member` | Add member to thread | `thread_id`, `user_id` |
| `remove_thread_member` | Remove member from thread | `thread_id`, `user_id` |

### Webhooks

| Tool | Description | Key Parameters |
|---|---|---|
| `list_webhooks` | List webhooks in a channel | `channel_id` |
| `create_webhook` | Create a webhook | `channel_id`, `name`, `avatar_url?` |
| `delete_webhook` | Delete a webhook | `webhook_id` |
| `send_webhook_message` | Send via webhook | `webhook_id`, `webhook_token`, `content`, `username?`, `avatar_url?`, `embeds?` |

### Moderation

| Tool | Description | Key Parameters |
|---|---|---|
| `ban_member` | Ban a user | `guild_id`, `user_id`, `reason?`, `delete_message_days?` |
| `unban_member` | Unban a user | `guild_id`, `user_id` |
| `kick_member` | Kick a user | `guild_id`, `user_id`, `reason?` |
| `timeout_member` | Timeout a user | `guild_id`, `user_id`, `duration_minutes`, `reason?` |
| `remove_timeout` | Remove timeout | `guild_id`, `user_id` |
| `list_bans` | List bans | `guild_id`, `limit?` |

### Audit Log

| Tool | Description | Key Parameters |
|---|---|---|
| `get_audit_log` | Fetch audit log entries | `guild_id`, `action_type?`, `user_id?`, `limit?` |

### Direct Messages

| Tool | Description | Key Parameters |
|---|---|---|
| `send_dm` | Send a DM to a user | `user_id`, `content` |
| `get_user` | Get user info | `user_id` |

### Forums

| Tool | Description | Key Parameters |
|---|---|---|
| `list_forum_posts` | List active posts in a forum | `channel_id` |
| `create_forum_post` | Create a new forum post | `channel_id`, `name`, `content`, `tags?` |
| `close_forum_post` | Close/archive a forum post | `thread_id` |

## License

MIT
