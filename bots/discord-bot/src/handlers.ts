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
import {
  encryptAndUpload,
  downloadAndDecrypt,
  isConfigured as isSealConfigured,
} from "./services/sealService.js";
import { handleCampaignCommand } from "./services/campaignHandler.js";
import { enqueueCommunityEvent } from "./services/eventBatcher.js";

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

  await enqueueCommunityEvent(event);
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

  await enqueueCommunityEvent(event);
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

  // ── Campaign commands ──────────────────────────────────────────────
  if (message.content.startsWith("!campaign")) {
    const parts = message.content.split(/\s+/);
    const command = parts[1];
    const args = parts.slice(2);
    await handleCampaignCommand(message, `campaign-${command || 'help'}`, args);
    return;
  }

  // ── Seal + Walrus commands ──────────────────────────────────────────────
  if (message.content.startsWith("!encrypt ") && isSealConfigured()) {
    const text = message.content.slice("!encrypt ".length).trim();
    if (!text) { await message.reply("Usage: `!encrypt <text>`"); return; }
    try {
      await message.reply("🔒 Encrypting and uploading to Walrus…");
      const data = new TextEncoder().encode(text);
      const result = await encryptAndUpload(data);
      await message.reply(
        `✅ Encrypted & stored on Walrus\n` +
        `**Blob ID:** \`${result.blobId}\`\n` +
        `**Encryption ID:** \`${result.encryptionId}\`\n` +
        `**Sui Ref:** \`${result.suiRef}\``
      );
    } catch (err) {
      console.error("Encrypt command failed:", err);
      await message.reply(`❌ Encryption failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    return;
  }

  if (message.content.startsWith("!decrypt ") && isSealConfigured()) {
    const args = message.content.slice("!decrypt ".length).trim().split(/\s+/);
    if (args.length < 2) {
      await message.reply("Usage: `!decrypt <blobId> <resourceObjectId>`");
      return;
    }
    const [blobId, resourceId] = args;
    try {
      await message.reply("🔓 Downloading and decrypting…");
      const decrypted = await downloadAndDecrypt(blobId, resourceId);
      const text = new TextDecoder().decode(decrypted);
      const preview = text.length > 1500 ? text.slice(0, 1500) + "…" : text;
      await message.reply(`✅ Decrypted content:\n\`\`\`\n${preview}\n\`\`\``);
    } catch (err) {
      console.error("Decrypt command failed:", err);
      await message.reply(`❌ Decryption failed: ${err instanceof Error ? err.message : String(err)}`);
    }
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

  await enqueueCommunityEvent(event);
}

function extractCampaignId(content: string): string | undefined {
  const match = content.match(/campaign[_-]?id[:\s]+([a-zA-Z0-9-]+)/i);
  return match ? match[1] : undefined;
}
