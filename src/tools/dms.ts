import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolErrorFromUnknown, zodError } from "../lib/errors.js";

const SendDMSchema = z.object({
  user_id: z.string(),
  content: z.string(),
});

const GetUserSchema = z.object({ user_id: z.string() });

export function registerDMTools(server: McpServer): void {
  server.registerTool(
    "send_dm",
    { description: "Send a DM to a user", inputSchema: SendDMSchema },
    async (args) => {
      const parsed = SendDMSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const user = await getClient().users.fetch(parsed.data.user_id);
        const dm = await user.createDM();
        const msg = await dm.send(parsed.data.content);
        return { content: [{ type: "text" as const, text: JSON.stringify({ id: msg.id }) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "get_user",
    { description: "Get user info", inputSchema: GetUserSchema },
    async (args) => {
      const parsed = GetUserSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const user = await getClient().users.fetch(parsed.data.user_id);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ id: user.id, username: user.username, discriminator: user.discriminator, bot: user.bot }),
          }],
        };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );
}
