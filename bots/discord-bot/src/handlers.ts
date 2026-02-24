import type {
  GuildMember,
  MessageReaction,
  User,
  Message,
  PartialMessageReaction,
  PartialUser,
} from "discord.js";
import { sendWebhook } from "./webhook.js";
import type { CommunityEvent } from "./types.js";

export async function handleGuildMemberAdd(member: GuildMember): Promise<void> {
  const event: CommunityEvent = {
    external_id: member.user.id,
    platform: "discord",
    kind: "joined",
    timestamp: new Date().toISOString(),
    metadata: {
      guild_id: member.guild.id,
      guild_name: member.guild.name,
      username: member.user.username,
      display_name: member.displayName,
    },
  };

  await sendWebhook(event);
}

export async function handleMessageReactionAdd(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
): Promise<void> {
  if (user.bot) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error("Failed to fetch reaction:", error);
      return;
    }
  }

  const campaignId = extractCampaignId(reaction.message.content || "");

  const event: CommunityEvent = {
    external_id: user.id,
    platform: "discord",
    kind: campaignId ? "campaign_interaction" : "reacted",
    campaign_id: campaignId,
    timestamp: new Date().toISOString(),
    metadata: {
      guild_id: reaction.message.guildId || undefined,
      channel_id: reaction.message.channelId,
      message_id: reaction.message.id,
      reaction: reaction.emoji.name || "unknown",
      username: user.username || "",
    },
  };

  await sendWebhook(event);
}

export async function handleMessageCreate(message: Message): Promise<void> {
  if (message.author.bot) return;

  if (message.content.startsWith("!link")) {
    const userId = message.author.id;
    const username = message.author.username;
    const webUrl =
      process.env.WEBHOOK_URL?.replace("/api/webhooks/discord", "/link") ||
      "http://localhost:3000/link";

    await message.reply(
      `🔗 To link your wallet:\n\n` +
        `1. Visit: ${webUrl}\n` +
        `2. Use this code: ${userId}\n` +
        `3. Connect your wallet\n\n` +
        `Your Discord ID: ${userId}\n` +
        `Username: ${username}`,
    );
    return;
  }

  const campaignId = extractCampaignId(message.content);

  if (!campaignId && !message.content.includes("!campaign")) {
    return;
  }

  const event: CommunityEvent = {
    external_id: message.author.id,
    platform: "discord",
    kind: campaignId ? "campaign_interaction" : "messaged",
    campaign_id: campaignId,
    timestamp: new Date().toISOString(),
    metadata: {
      guild_id: message.guildId || undefined,
      guild_name: message.guild?.name,
      channel_id: message.channelId,
      channel_name: message.channel.isDMBased()
        ? "DM"
        : (message.channel as any).name,
      message_id: message.id,
      content: message.content.substring(0, 200),
      username: message.author.username,
    },
  };

  await sendWebhook(event);
}

function extractCampaignId(content: string): string | undefined {
  const match = content.match(/campaign[_-]?id[:\s]+([a-zA-Z0-9-]+)/i);
  return match ? match[1] : undefined;
}
