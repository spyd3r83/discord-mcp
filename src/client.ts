import {
  Client,
  GatewayIntentBits,
  Partials,
  type ClientOptions,
} from "discord.js";
import { logger } from "./lib/logger.js";

let instance: Client | null = null;

const INTENTS: ClientOptions["intents"] = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildModeration,
  GatewayIntentBits.GuildWebhooks,
  GatewayIntentBits.DirectMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMessageReactions,
];

export function getClient(): Client {
  if (instance) return instance;

  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) {
    throw new Error(
      "DISCORD_BOT_TOKEN environment variable is required but not set."
    );
  }

  instance = new Client({
    intents: INTENTS,
    partials: [Partials.Channel, Partials.Message, Partials.Reaction],
  });

  instance.once("ready", (c) => {
    logger.info(`Discord bot ready: ${c.user.tag}`);
  });

  instance.on("error", (err) => {
    logger.error("Discord client error", err.message);
  });

  instance.login(token).catch((err: unknown) => {
    logger.error("Discord login failed — server will continue without a connected bot", String(err));
    instance = null;
  });
  return instance;
}
