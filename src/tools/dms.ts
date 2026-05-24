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
    {
      description: `Send a direct message (DM) to a Discord user by their user snowflake ID.

Required parameters:
  • user_id — Discord user snowflake ID (17-19 digit integer string, e.g. "123456789012345678").
    This is the user's Discord account ID, NOT a channel ID or OpenButler UUID.
    If you only know a username, call discord-ext_search_members or discord-ext_get_member to find the snowflake.
  • content — message text to send (max 2000 characters)

Note: The bot must share at least one guild with the user OR have the MESSAGE_CONTENT intent to send DMs to non-guild members.
Returns: { id: "<message snowflake>" }

Example: discord-ext_send_dm({ user_id: "123456789012345678", content: "Hello from the bot!" })`,
      inputSchema: SendDMSchema,
    },
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
    {
      description: `Fetch public profile information for a Discord user by their snowflake ID.

Required parameter:
  • user_id — Discord user snowflake ID (17-19 digit integer string, e.g. "123456789012345678").
    NOT an OpenButler agent/user ID — this is a Discord account snowflake.

Returns: { id, username, discriminator, bot }

Example: discord-ext_get_user({ user_id: "123456789012345678" })
Result:  { "id": "123456789012345678", "username": "jfi", "discriminator": "0", "bot": false }`,
      inputSchema: GetUserSchema,
    },
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
