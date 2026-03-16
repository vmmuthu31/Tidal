import type {
  Message,
} from "discord.js";
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import {
  getCampaignStats,
} from "../services/campaignService.js";
import type { Campaign } from "../types.js";

/**
 * Campaign Commands Handler
 * Supports both slash commands and message commands
 */

export async function handleCampaignCommand(
  message: Message,
  command: string,
  args: string[],
): Promise<void> {
  try {
    switch (command.toLowerCase()) {
      case "campaign-stats":
      case "campstats":
        await sendCampaignStats(message, args[0]);
        break;

      case "campaign-create":
      case "campcreate":
        await createCampaign(message, args);
        break;

      case "campaign-list":
      case "camplist":
        await listCampaigns(message);
        break;

      case "campaign-announce":
      case "campannounce":
        await announceCampaign(message, args[0], args.slice(1).join(" "));
        break;

      case "campaign-leaderboard":
      case "campleaderboard":
        await showCampaignLeaderboard(message, args[0]);
        break;

      default:
        await message.reply(
          "❌ Unknown campaign command. Try: `!campaign-stats [id]`, `!campaign-list`, `!campaign-create`, `!campaign-announce`, `!campaign-leaderboard`",
        );
    }
  } catch (error) {
    console.error("Campaign command error:", error);
    await message.reply(
      `❌ Error processing campaign command: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function sendCampaignStats(
  message: Message,
  campaignId?: string,
): Promise<void> {
  if (!campaignId) {
    await message.reply(
      "❌ Usage: `!campaign-stats <campaign_id>`\nExample: `!campaign-stats campaign_2024_launch`",
    );
    return;
  }

  try {
    await message.reply("🔍 Loading campaign stats...");

    // In a real implementation, you would fetch from SurrealDB
    // For now, we'll show Discord-based metrics
    const stats = await getCampaignStats(campaignId);

    const embed = new EmbedBuilder()
      .setTitle(`📈 Campaign Stats: ${campaignId}`)
      .setDescription("Real-time engagement metrics")
      .addFields([
        {
          name: "📊 Total Interactions",
          value: `${stats.total_interactions}`,
          inline: true,
        },
        {
          name: "👥 Participants",
          value: `${stats.total_participants}`,
          inline: true,
        },
        {
          name: "💬 Discord Messages",
          value: `${stats.discord_metrics.messages_count}`,
          inline: true,
        },
        {
          name: "😊 Discord Reactions",
          value: `${stats.discord_metrics.reactions_count}`,
          inline: true,
        },
        {
          name: "🔄 Last Updated",
          value: new Date(stats.last_updated).toLocaleString(),
          inline: false,
        },
      ])
      .setColor(0x5865f2)
      .setTimestamp();

    if (stats.reactions.length > 0) {
      const topReactions = stats.reactions
        .slice(0, 5)
        .map((r: { emoji: string; count: number }) => `${r.emoji} (${r.count})`)
        .join("\n");
      embed.addFields({
        name: "🔝 Top Reactions",
        value: topReactions || "None",
        inline: false,
      });
    }

    await message.reply({ embeds: [embed] });
  } catch (error) {
    await message.reply(
      `❌ Failed to fetch campaign stats: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function createCampaign(
  message: Message,
  args: string[],
): Promise<void> {
  if (args.length < 1) {
    await message.reply(
      "❌ Usage: `!campaign-create <campaign_name> [description]`\nExample: `!campaign-create Q1_2024_Launch Launch campaign for Q1`",
    );
    return;
  }

  const campaignName = args[0];
  const description = args.slice(1).join(" ") || "";

  try {
    const campaign: Campaign = {
      id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: campaignName,
      description,
      created_by: message.author.id,
      guild_id: message.guildId || undefined,
      channel_id: message.channelId,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // In a real implementation, save to SurrealDB
    // db.create('campaign', campaign)

    const embed = new EmbedBuilder()
      .setTitle("✅ Campaign Created")
      .setDescription(`Campaign **${campaign.name}** has been created`)
      .addFields([
        { name: "Campaign ID", value: `\`${campaign.id}\`` },
        { name: "Name", value: campaign.name },
        ...(description ? [{ name: "Description", value: description }] : []),
        {
          name: "Created By",
          value: `<@${campaign.created_by}>`,
        },
        { name: "Status", value: "🟢 Active" },
      ])
      .setColor(0x57f287)
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`campaign_${campaign.id}_stats`)
        .setLabel("View Stats")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`campaign_${campaign.id}_announce`)
        .setLabel("Announce")
        .setStyle(ButtonStyle.Secondary),
    );

    await message.reply({ embeds: [embed], components: [row] });
  } catch (error) {
    await message.reply(
      `❌ Failed to create campaign: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function listCampaigns(message: Message): Promise<void> {
  try {
    // In a real implementation, fetch from SurrealDB
    // const campaigns = await db.select('campaign:*')
    // const activeCampaigns = getActiveCampaigns(campaigns)

    const activeCampaigns: Campaign[] = [];

    if (activeCampaigns.length === 0) {
      await message.reply("❌ No active campaigns found");
      return;
    }

    const fields = activeCampaigns.slice(0, 25).map((campaign) => ({
      name: `${campaign.status === "active" ? "🟢" : "🟡"} ${campaign.name}`,
      value: `\`${campaign.id}\`\n${campaign.description || "No description"}`,
    }));

    const embed = new EmbedBuilder()
      .setTitle("📋 Active Campaigns")
      .setDescription(`Found ${activeCampaigns.length} active campaign(s)`)
      .addFields(fields)
      .setColor(0x5865f2)
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  } catch (error) {
    await message.reply(
      `❌ Failed to fetch campaigns: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function announceCampaign(
  message: Message,
  campaignId?: string,
  announcementText?: string,
): Promise<void> {
  if (!campaignId) {
    await message.reply(
      "❌ Usage: `!campaign-announce <campaign_id> [announcement_text]`",
    );
    return;
  }

  try {
    const campaign = await getCampaignById(campaignId);

    if (!campaign) {
      await message.reply(`❌ Campaign \`${campaignId}\` not found`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📢 Campaign Announcement: ${campaign.name}`)
      .setDescription(announcementText || "New campaign has started!")
      .addFields({
        name: "Campaign ID",
        value: `\`${campaign.id}\``,
      })
      .setColor(0xfaa61a)
      .setTimestamp();

    // Post to campaign channel
    if (message.guild && campaign.channel_id) {
      const channel = await message.guild.channels.fetch(campaign.channel_id);
      if (channel?.isTextBased()) {
        await channel.send({ embeds: [embed] });
        await message.reply(`✅ Announcement posted to <#${campaign.channel_id}>`);
      }
    }
  } catch (error) {
    await message.reply(
      `❌ Failed to announce campaign: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function getCampaignById(_campaignId: string): Promise<Campaign | null> {
  return null;
}

async function showCampaignLeaderboard(
  message: Message,
  campaignId?: string,
): Promise<void> {
  if (!campaignId) {
    await message.reply(
      "❌ Usage: `!campaign-leaderboard <campaign_id>`\nExample: `!campaign-leaderboard campaign_2024_launch`",
    );
    return;
  }

  try {
    await message.reply("🏆 Loading leaderboard...");

    const stats = await getCampaignStats(campaignId);

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Campaign Leaderboard: ${campaignId}`)
      .setDescription("Top participants in this campaign")
      .setColor(0xfaa61a);

    if (stats.top_participants.length === 0) {
      embed.addFields({
        name: "No Data",
        value: "No participants tracked yet",
      });
    } else {
      const leaderboard = stats.top_participants
        .slice(0, 10)
        .map(
          (
            participant: { user_id: string; interaction_count: number },
            index: number,
          ) =>
            `${index + 1}. <@${participant.user_id}> - ${participant.interaction_count} interactions`,
        )
        .join("\n");

      embed.addFields({
        name: "Rankings",
        value: leaderboard,
      });
    }

    embed.addFields({
      name: "📊 Campaign Stats",
      value:
        `Total Interactions: ${stats.total_interactions}\n` +
        `Total Participants: ${stats.total_participants}\n` +
        `Average per Participant: ${stats.total_participants > 0 ? (stats.total_interactions / stats.total_participants).toFixed(2) : "0"}`,
    });

    embed.setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`campaign_${campaignId}_refresh`)
        .setLabel("Refresh")
        .setStyle(ButtonStyle.Primary),
    );

    await message.reply({ embeds: [embed], components: [row] });
  } catch (error) {
    await message.reply(
      `❌ Failed to fetch leaderboard: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Slash command definitions for Discord application commands
 */
export function getCampaignSlashCommands(): any[] {
  return [
    {
      name: "campaign",
      description: "Campaign management and analytics",
      options: [
        {
          name: "stats",
          description: "View campaign statistics",
          type: 1,
          options: [
            {
              name: "campaign_id",
              description: "Campaign ID",
              type: 3,
              required: true,
            },
          ],
        },
        {
          name: "list",
          description: "List all active campaigns",
          type: 1,
        },
        {
          name: "create",
          description: "Create a new campaign",
          type: 1,
          options: [
            {
              name: "name",
              description: "Campaign name",
              type: 3,
              required: true,
            },
            {
              name: "description",
              description: "Campaign description",
              type: 3,
              required: false,
            },
          ],
        },
        {
          name: "announce",
          description: "Announce a campaign",
          type: 1,
          options: [
            {
              name: "campaign_id",
              description: "Campaign ID",
              type: 3,
              required: true,
            },
            {
              name: "message",
              description: "Announcement message",
              type: 3,
              required: false,
            },
          ],
        },
        {
          name: "leaderboard",
          description: "View campaign leaderboard",
          type: 1,
          options: [
            {
              name: "campaign_id",
              description: "Campaign ID",
              type: 3,
              required: true,
            },
          ],
        },
      ],
    },
  ];
}
