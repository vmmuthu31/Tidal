import { Client, GatewayIntentBits, Events, Partials } from "discord.js";
import dotenv from "dotenv";
import {
  handleGuildMemberAdd,
  handleMessageReactionAdd,
  handleMessageCreate,
} from "./handlers";

dotenv.config();

// Log Seal/Walrus integration status at startup
try {
  const { assertConfigured } = await import("./services/suiClient.js");
  assertConfigured();
} catch {
  console.warn("⚠️  Seal/Walrus integration unavailable (missing deps or config)");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Discord bot ready! Logged in as ${c.user.tag}`);
});

client.on(Events.GuildMemberAdd, async (member) => {
  await handleGuildMemberAdd(member);
});

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  await handleMessageReactionAdd(reaction, user);
});

client.on(Events.MessageCreate, async (message) => {
  await handleMessageCreate(message);
});

client.on(Events.Error, (error) => {
  console.error("Discord client error:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

client.login(process.env.DISCORD_TOKEN);
