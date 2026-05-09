import { describe, it, expect, vi } from "vitest";
import { createMcpServer } from "../server.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

vi.mock("../client.js", () => ({
  getClient: vi.fn(() => ({
    channels: { fetch: vi.fn() },
    guilds: { fetch: vi.fn() },
    users: { fetch: vi.fn() },
    fetchWebhook: vi.fn(),
    isReady: vi.fn(() => false),
  })),
}));

type ServerInternal = McpServer & {
  _registeredTools: Record<string, unknown>;
};

function registeredToolNames(server: McpServer): string[] {
  return Object.keys((server as ServerInternal)._registeredTools);
}

describe("MCP server", () => {
  it("creates without error", () => {
    const server = createMcpServer();
    expect(server).toBeDefined();
  });

  it("registers a non-empty set of tools", () => {
    const server = createMcpServer();
    const names = registeredToolNames(server);
    expect(names.length).toBeGreaterThan(0);
  });

  it("registers expected core tool names", () => {
    const server = createMcpServer();
    const names = registeredToolNames(server);
    expect(names).toContain("send_message");
    expect(names).toContain("list_channels");
    expect(names).toContain("ban_member");
    expect(names).toContain("send_dm");
    expect(names).toContain("create_forum_post");
  });

  it("registers all 54 tools across all categories", () => {
    const server = createMcpServer();
    const names = registeredToolNames(server);
    const expectedTools = [
      "send_message", "edit_message", "delete_message", "get_message",
      "list_messages", "pin_message", "unpin_message", "send_embed",
      "list_channels", "get_channel", "create_channel", "edit_channel",
      "delete_channel", "set_channel_permissions",
      "get_guild", "list_guilds", "get_guild_member_count",
      "list_roles", "get_role", "create_role", "edit_role", "delete_role",
      "assign_role", "remove_role",
      "get_member", "list_members", "search_members", "edit_member",
      "add_reaction", "remove_reaction", "remove_user_reaction",
      "list_reactions", "clear_reactions",
      "create_thread", "create_standalone_thread", "list_threads",
      "archive_thread", "unarchive_thread", "add_thread_member", "remove_thread_member",
      "list_webhooks", "create_webhook", "delete_webhook", "send_webhook_message",
      "ban_member", "unban_member", "kick_member", "timeout_member", "remove_timeout", "list_bans",
      "get_audit_log",
      "send_dm", "get_user",
      "list_forum_posts", "create_forum_post", "close_forum_post",
    ];
    for (const name of expectedTools) {
      expect(names, `Missing tool: ${name}`).toContain(name);
    }
  });
});
