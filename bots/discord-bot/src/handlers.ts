import type {
  GuildMember,
  MessageReaction,
  User,
  Message,
  PartialMessageReaction,
  PartialUser,
} from "discord.js";
import type { CommunityEvent } from "./types.js";
import {
  encryptAndUpload,
  downloadAndDecrypt,
  isConfigured as isSealConfigured,
} from "./services/sealService.js";
import { handleCampaignCommand } from "./handlers/campaignHandler.js";
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
    const parts = message.content.trim().split(/\s+/);
    const firstToken = parts[0].toLowerCase();

    let command = "campaign-help";
    let args: string[] = [];

    if (firstToken === "!campaign") {
      command = `campaign-${parts[1]?.toLowerCase() || "help"}`;
      args = parts.slice(2);
    } else if (firstToken.startsWith("!campaign-")) {
      command = firstToken.slice(1);
      args = parts.slice(1);
    }

    await handleCampaignCommand(message, command, args);
    return;
  }

  // ── Seal + Walrus commands ──────────────────────────────────────────────
  if (message.content.startsWith("!encrypt") && isSealConfigured()) {
    let data: Uint8Array;
    let description: string;

    if (message.attachments.size > 0) {
      const attachment = message.attachments.first()!;
      await message.reply(`🔒 Downloading **${attachment.name}** (${(attachment.size / 1024).toFixed(1)} KB) and encrypting with Sui SEAL…`);
      const res = await fetch(attachment.url);
      data = new Uint8Array(await res.arrayBuffer());
      description = `file: ${attachment.name} (${(attachment.size / 1024).toFixed(1)} KB)`;
    } else {
      const text = message.content.slice("!encrypt ".length).trim();
      if (!text) {
        await message.reply("Usage: `!encrypt <text>` or attach a file and type `!encrypt`");
        return;
      }
      await message.reply("🔒 Encrypting and uploading to Walrus…");
      data = new TextEncoder().encode(text);
      description = `text (${data.length} bytes)`;
    }

    try {
      const result = await encryptAndUpload(data);
      await message.reply(
        `✅ Encrypted & stored on Walrus\n` +
          `**Payload:** \`${description}\`\n` +
          `**Blob ID:** \`${result.blobId}\`\n` +
          `**Encryption ID:** \`${result.encryptionId}\`\n` +
          `**Sui Ref:** \`${result.suiRef}\``,
      );
    } catch (err) {
      console.error("Encrypt command failed:", err);
      await message.reply(
        `❌ Encryption failed: ${err instanceof Error ? err.message : String(err)}`,
      );
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
      await message.reply(
        `❌ Decryption failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return;
  }

  const campaignId = extractCampaignId(message.content);

  // For the demo, we'll allow all messages to be processed
  // if (!campaignId && !message.content.includes("!campaign")) {
  //   return;
  // }

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
        : (message.channel as import("discord.js").TextChannel).name,
      message_id: message.id,
      content: message.content.substring(0, 200),
      username: message.author.username,
    },
  };

  await enqueueCommunityEvent(event);

  try {
    const replyText = campaignId
      ? `✅ Lead securely captured for campaign **${campaignId}**.\n🔒 Encrypting payload with **Sui SEAL** and archiving to **Walrus Testnet**...`
      : `✅ Message securely captured.\n🔒 Encrypting payload with **Sui SEAL** and archiving to **Walrus Testnet**...`;
    
    await message.reply(replyText);
  } catch (err) {
    console.error("Failed to send demo reply:", err);
  }
}

function extractCampaignId(content: string): string | undefined {
  const match = content.match(/campaign[_-]?id[:\s]+([a-zA-Z0-9-]+)/i);
  return match ? match[1] : undefined;
}
