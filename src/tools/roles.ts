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
    { description: "List roles in a guild", inputSchema: GuildRoleSchema },
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
    { description: "Get role info", inputSchema: GetRoleSchema },
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
    { description: "Create a role in a guild", inputSchema: CreateRoleSchema },
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
    { description: "Edit a role", inputSchema: EditRoleSchema },
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
    { description: "Delete a role", inputSchema: DeleteRoleSchema },
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
    { description: "Assign a role to a member", inputSchema: AssignRoleSchema },
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
    { description: "Remove a role from a member", inputSchema: AssignRoleSchema },
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
