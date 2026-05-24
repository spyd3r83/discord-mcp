import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";
import { toolErrorFromUnknown, zodError } from "../lib/errors.js";

const GuildRoleSchema = z.object({ guild_id: z.string() });
const GetRoleSchema = z.object({ guild_id: z.string(), role_id: z.string() });

const CreateRoleSchema = z.object({
  guild_id: z.string(),
  name: z.string(),
  color: z.number().optional(),
  hoist: z.boolean().optional(),
  mentionable: z.boolean().optional(),
  permissions: z.string().optional(),
});

const EditRoleSchema = z.object({
  guild_id: z.string(),
  role_id: z.string(),
  name: z.string().optional(),
  color: z.number().optional(),
  hoist: z.boolean().optional(),
  mentionable: z.boolean().optional(),
});

const DeleteRoleSchema = z.object({ guild_id: z.string(), role_id: z.string() });

const AssignRoleSchema = z.object({
  guild_id: z.string(),
  user_id: z.string(),
  role_id: z.string(),
});

export function registerRoleTools(server: McpServer): void {
  server.registerTool(
    "list_roles",
    { description: `List all roles in a Discord guild (server).

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    NOT an OpenButler UUID. Call discord-ext_list_guilds first if you don't know it.

Returns: [{ id, name, color }]

Example: discord-ext_list_roles({ guild_id: "1396724253621223584" })`, inputSchema: GuildRoleSchema },
    async (args) => {
      const parsed = GuildRoleSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        const roles = await guild.roles.fetch();
        const list = roles.map((r) => ({ id: r.id, name: r.name, color: r.color }));
        return { content: [{ type: "text" as const, text: JSON.stringify(list) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "get_role",
    { description: `Get detailed information about a specific Discord role.

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    NOT an OpenButler UUID. Call discord-ext_list_guilds first if you don't know it.
  • role_id — Discord role snowflake ID (17-19 digit integer string, e.g. "1396724253621223800").
    NOT an OpenButler UUID. Call discord-ext_list_roles first if you don't know it.

Returns: { id, name, color, hoist, mentionable }

Example: discord-ext_get_role({ guild_id: "1396724253621223584", role_id: "1396724253621223800" })`, inputSchema: GetRoleSchema },
    async (args) => {
      const parsed = GetRoleSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        const role = await guild.roles.fetch(parsed.data.role_id);
        if (!role) return { isError: true as const, content: [{ type: "text" as const, text: "Role not found" }] };
        return { content: [{ type: "text" as const, text: JSON.stringify({ id: role.id, name: role.name, color: role.color, hoist: role.hoist, mentionable: role.mentionable }) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "create_role",
    { description: `Create a new role in a Discord guild (server).

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    NOT an OpenButler UUID. Call discord-ext_list_guilds first if you don't know it.
  • name — name for the new role (e.g. "Moderator")

Optional:
  • color — RGB color integer for the role (e.g. 16711680 for red)
  • hoist — display role members separately in the sidebar (boolean)
  • mentionable — allow anyone to @mention this role (boolean)
  • permissions — Discord permission bitfield as a string (e.g. "8" for Administrator)

Returns: { id, name }

Example: discord-ext_create_role({ guild_id: "1396724253621223584", name: "Moderator", color: 16711680, hoist: true })`, inputSchema: CreateRoleSchema },
    async (args) => {
      const parsed = CreateRoleSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        const role = await guild.roles.create({
          name: parsed.data.name,
          color: parsed.data.color,
          hoist: parsed.data.hoist,
          mentionable: parsed.data.mentionable,
          permissions: parsed.data.permissions ? BigInt(parsed.data.permissions) : undefined,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify({ id: role.id, name: role.name }) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "edit_role",
    { description: `Edit an existing Discord role's properties.

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    NOT an OpenButler UUID. Call discord-ext_list_guilds first if you don't know it.
  • role_id — Discord role snowflake ID (17-19 digit integer string, e.g. "1396724253621223800").
    NOT an OpenButler UUID. Call discord-ext_list_roles first if you don't know it.

Optional:
  • name — new name for the role
  • color — new RGB color integer (e.g. 16711680 for red)
  • hoist — display role members separately in the sidebar (boolean)
  • mentionable — allow anyone to @mention this role (boolean)

Returns: { id, name }

Example: discord-ext_edit_role({ guild_id: "1396724253621223584", role_id: "1396724253621223800", name: "Admin", color: 16711680 })`, inputSchema: EditRoleSchema },
    async (args) => {
      const parsed = EditRoleSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        const role = await guild.roles.fetch(parsed.data.role_id);
        if (!role) return { isError: true as const, content: [{ type: "text" as const, text: "Role not found" }] };
        const edited = await role.edit({
          name: parsed.data.name,
          color: parsed.data.color,
          hoist: parsed.data.hoist,
          mentionable: parsed.data.mentionable,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify({ id: edited.id, name: edited.name }) }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "delete_role",
    { description: `Delete a role from a Discord guild (server). Members who only had this role will lose it.

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    NOT an OpenButler UUID. Call discord-ext_list_guilds first if you don't know it.
  • role_id — Discord role snowflake ID (17-19 digit integer string, e.g. "1396724253621223800").
    NOT an OpenButler UUID. Call discord-ext_list_roles first if you don't know it.

Returns: "Role deleted"

Example: discord-ext_delete_role({ guild_id: "1396724253621223584", role_id: "1396724253621223800" })`, inputSchema: DeleteRoleSchema },
    async (args) => {
      const parsed = DeleteRoleSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        const role = await guild.roles.fetch(parsed.data.role_id);
        if (!role) return { isError: true as const, content: [{ type: "text" as const, text: "Role not found" }] };
        await role.delete();
        return { content: [{ type: "text" as const, text: "Role deleted" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "assign_role",
    { description: `Assign a role to a Discord guild member. The member gains all permissions and properties of that role.

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    NOT an OpenButler UUID. Call discord-ext_list_guilds first if you don't know it.
  • user_id — Discord user snowflake ID (17-19 digit integer string, e.g. "281937542917916673").
    NOT an OpenButler UUID. Call discord-ext_search_members first.
  • role_id — Discord role snowflake ID (17-19 digit integer string, e.g. "1396724253621223800").
    NOT an OpenButler UUID. Call discord-ext_list_roles first.

Returns: "Role assigned"

Example: discord-ext_assign_role({ guild_id: "1396724253621223584", user_id: "281937542917916673", role_id: "1396724253621223800" })`, inputSchema: AssignRoleSchema },
    async (args) => {
      const parsed = AssignRoleSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        const member = await guild.members.fetch(parsed.data.user_id);
        await member.roles.add(parsed.data.role_id);
        return { content: [{ type: "text" as const, text: "Role assigned" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );

  server.registerTool(
    "remove_role",
    { description: `Remove a role from a Discord guild member. The member loses all permissions and properties of that role.

Required parameters:
  • guild_id — Discord guild snowflake ID (17-19 digit integer string, e.g. "1396724253621223584").
    NOT an OpenButler UUID. Call discord-ext_list_guilds first if you don't know it.
  • user_id — Discord user snowflake ID (17-19 digit integer string, e.g. "281937542917916673").
    NOT an OpenButler UUID. Call discord-ext_search_members first.
  • role_id — Discord role snowflake ID (17-19 digit integer string, e.g. "1396724253621223800").
    NOT an OpenButler UUID. Call discord-ext_list_roles first.

Returns: "Role removed"

Example: discord-ext_remove_role({ guild_id: "1396724253621223584", user_id: "281937542917916673", role_id: "1396724253621223800" })`, inputSchema: AssignRoleSchema },
    async (args) => {
      const parsed = AssignRoleSchema.safeParse(args);
      if (!parsed.success) return zodError(parsed.error.issues);
      try {
        const guild = await getClient().guilds.fetch(parsed.data.guild_id);
        const member = await guild.members.fetch(parsed.data.user_id);
        await member.roles.remove(parsed.data.role_id);
        return { content: [{ type: "text" as const, text: "Role removed" }] };
      } catch (err) {
        return toolErrorFromUnknown(err);
      }
    }
  );
}
