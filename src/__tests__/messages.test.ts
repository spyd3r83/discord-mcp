import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMcpServer } from "../server.js";
import { getClient } from "../client.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

vi.mock("../client.js", () => ({
  getClient: vi.fn(),
}));

interface MockAttachment {
  id: string;
  url: string;
  proxyURL: string;
  contentType: string;
  name: string;
  size: number;
  width: number | null;
  height: number | null;
}

interface MockMessageOverrides {
  id?: string;
  content?: string;
  authorTag?: string;
  createdAt?: Date;
  attachments?: MockAttachment[];
}

function createMockMessage(overrides: MockMessageOverrides = {}) {
  const attachmentMap = new Map(
    overrides.attachments?.map((a, i) => [String(i), a]) ?? []
  );
  const msg = {
    id: overrides.id ?? "msg_1",
    content: overrides.content ?? "test content",
    author: { tag: overrides.authorTag ?? "testuser#1234" },
    createdAt: overrides.createdAt ?? new Date("2024-01-01T00:00:00.000Z"),
    attachments: {
      values: () => attachmentMap.values(),
    },
    edit: vi.fn(),
    delete: vi.fn(),
    pin: vi.fn(),
    unpin: vi.fn(),
  };
  msg.edit.mockResolvedValue(msg);
  return msg;
}

function createMockChannel(messagesFetch?: unknown, sendReturn?: unknown) {
  return {
    isTextBased: () => true,
    messages: {
      fetch: vi.fn().mockResolvedValue(messagesFetch),
    },
    send: vi.fn().mockResolvedValue(sendReturn),
  };
}

function createMockCollection<T>(items: T[]) {
  const map = new Map(items.map((item, i) => [String(i), item]));
  return Object.assign(map, {
    map<R>(fn: (value: T, key: string) => R) {
      const results: R[] = [];
      for (const [key, value] of map.entries()) {
        results.push(fn(value, key));
      }
      return results;
    },
  });
}

function getToolHandler(server: McpServer, name: string) {
  const internal = server as unknown as {
    _registeredTools: Record<string, { handler: (...args: unknown[]) => Promise<unknown> }>;
  };
  const tool = internal._registeredTools[name];
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool.handler;
}

function extractJson(result: unknown) {
  const typed = result as { content: Array<{ type: string; text: string }> };
  const first = typed.content[0];
  if (!first) throw new Error("Missing content in tool result");
  return JSON.parse(first.text);
}

describe("message tools with attachments", () => {
  let server: McpServer;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMcpServer();
  });

  describe("get_message", () => {
    it("returns attachments in response", async () => {
      const attachments: MockAttachment[] = [
        {
          id: "att_1",
          url: "https://cdn.discordapp.com/image.png",
          proxyURL: "https://media.discordapp.net/image.png",
          contentType: "image/png",
          name: "image.png",
          size: 1024,
          width: 128,
          height: 128,
        },
        {
          id: "att_2",
          url: "https://cdn.discordapp.com/doc.pdf",
          proxyURL: "https://media.discordapp.net/doc.pdf",
          contentType: "application/pdf",
          name: "document.pdf",
          size: 2048,
          width: null,
          height: null,
        },
      ];
      const msg = createMockMessage({ id: "msg_1", content: "hello", attachments });
      const channel = createMockChannel(msg);
      vi.mocked(getClient).mockReturnValue({
        channels: { fetch: vi.fn().mockResolvedValue(channel) },
      } as unknown as ReturnType<typeof getClient>);

      const handler = getToolHandler(server, "get_message");
      const result = await handler({ channel_id: "ch_1", message_id: "msg_1" });
      const data = extractJson(result);

      expect(data.attachments).toHaveLength(2);
      expect(data.attachments[0]).toMatchObject({
        id: "att_1",
        url: "https://cdn.discordapp.com/image.png",
        proxyUrl: "https://media.discordapp.net/image.png",
        contentType: "image/png",
        filename: "image.png",
        size: 1024,
        width: 128,
        height: 128,
      });
      expect(data.attachments[1]).toMatchObject({
        id: "att_2",
        contentType: "application/pdf",
        filename: "document.pdf",
      });
    });

    it("returns empty attachments array when message has no attachments", async () => {
      const msg = createMockMessage({ id: "msg_2", content: "no attachments", attachments: [] });
      const channel = createMockChannel(msg);
      vi.mocked(getClient).mockReturnValue({
        channels: { fetch: vi.fn().mockResolvedValue(channel) },
      } as unknown as ReturnType<typeof getClient>);

      const handler = getToolHandler(server, "get_message");
      const result = await handler({ channel_id: "ch_1", message_id: "msg_2" });
      const data = extractJson(result);

      expect(data.attachments).toEqual([]);
    });
  });

  describe("list_messages", () => {
    it("returns attachments and timestamp for each message", async () => {
      const msg1 = createMockMessage({
        id: "msg_1",
        content: "with image",
        authorTag: "user1#1111",
        createdAt: new Date("2024-06-01T12:00:00.000Z"),
        attachments: [
          {
            id: "att_1",
            url: "https://cdn.discordapp.com/img.jpg",
            proxyURL: "https://media.discordapp.net/img.jpg",
            contentType: "image/jpeg",
            name: "img.jpg",
            size: 512,
            width: 64,
            height: 64,
          },
        ],
      });
      const msg2 = createMockMessage({
        id: "msg_2",
        content: "plain text",
        authorTag: "user2#2222",
        createdAt: new Date("2024-06-01T11:00:00.000Z"),
        attachments: [],
      });
      const collection = createMockCollection([msg1, msg2]);
      const channel = createMockChannel(collection);
      vi.mocked(getClient).mockReturnValue({
        channels: { fetch: vi.fn().mockResolvedValue(channel) },
      } as unknown as ReturnType<typeof getClient>);

      const handler = getToolHandler(server, "list_messages");
      const result = await handler({ channel_id: "ch_1", limit: 2 });
      const data = extractJson(result);

      expect(data).toHaveLength(2);
      expect(data[0].id).toBe("msg_1");
      expect(data[0].timestamp).toBe("2024-06-01T12:00:00.000Z");
      expect(data[0].attachments).toHaveLength(1);
      expect(data[0].attachments[0].contentType).toBe("image/jpeg");

      expect(data[1].id).toBe("msg_2");
      expect(data[1].timestamp).toBe("2024-06-01T11:00:00.000Z");
      expect(data[1].attachments).toEqual([]);
    });
  });

  describe("send_message", () => {
    it("returns empty attachments when sending plain text", async () => {
      const msg = createMockMessage({ id: "msg_3", content: "hello world" });
      const channel = createMockChannel(undefined, msg);
      vi.mocked(getClient).mockReturnValue({
        channels: { fetch: vi.fn().mockResolvedValue(channel) },
      } as unknown as ReturnType<typeof getClient>);

      const handler = getToolHandler(server, "send_message");
      const result = await handler({ channel_id: "ch_1", content: "hello world" });
      const data = extractJson(result);

      expect(data.id).toBe("msg_3");
      expect(data.content).toBe("hello world");
      expect(data.attachments).toEqual([]);
    });

    it("accepts optional attachments parameter", async () => {
      const msg = createMockMessage({ id: "msg_4", content: "with file" });
      const channel = createMockChannel(undefined, msg);
      vi.mocked(getClient).mockReturnValue({
        channels: { fetch: vi.fn().mockResolvedValue(channel) },
      } as unknown as ReturnType<typeof getClient>);

      const handler = getToolHandler(server, "send_message");
      await handler({
        channel_id: "ch_1",
        content: "here is an image",
        attachments: [{ url: "https://example.com/image.png" }],
      });

      expect(channel.send).toHaveBeenCalledOnce();
      const firstCall = vi.mocked(channel.send).mock.calls[0];
      if (!firstCall) throw new Error("Expected channel.send to have been called");
      const callArgs = firstCall[0] as { files: unknown[] };
      expect(callArgs.files).toBeDefined();
      expect(callArgs.files).toHaveLength(1);
    });
  });

  describe("edit_message", () => {
    it("returns attachments in edited message", async () => {
      const edited = createMockMessage({
        id: "msg_5",
        content: "edited text",
        attachments: [
          {
            id: "att_3",
            url: "https://cdn.discordapp.com/fig.gif",
            proxyURL: "https://media.discordapp.net/fig.gif",
            contentType: "image/gif",
            name: "fig.gif",
            size: 256,
            width: 32,
            height: 32,
          },
        ],
      });
      const msg = createMockMessage({ id: "msg_5", content: "original text" });
      msg.edit.mockResolvedValue(edited);
      const channel = createMockChannel(msg);
      vi.mocked(getClient).mockReturnValue({
        channels: { fetch: vi.fn().mockResolvedValue(channel) },
      } as unknown as ReturnType<typeof getClient>);

      const handler = getToolHandler(server, "edit_message");
      const result = await handler({ channel_id: "ch_1", message_id: "msg_5", content: "edited text" });
      const data = extractJson(result);

      expect(data.id).toBe("msg_5");
      expect(data.content).toBe("edited text");
      expect(data.attachments).toHaveLength(1);
      expect(data.attachments[0].contentType).toBe("image/gif");
    });
  });
});
