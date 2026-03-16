import type { Client, Guild, TextChannel, Message } from "discord.js";
import type { Campaign, CampaignStats, CampaignAggregation } from "../types.js";

/**
 * Campaign service handles aggregation of campaign data from SurrealDB
 * and real-time Discord metrics. Provides statistics and analytics for campaigns.
 */

// Store in-memory campaign metrics (supplements SurrealDB)
const campaignMetrics = new Map<
  string,
  {
    discord_reactions: Map<string, number>;
    message_ids: Set<string>;
    reaction_emoji: Map<string, number>;
    last_updated: Date;
  }
>();

export function initializeCampaignTracking(client: Client): void {
  client.on("messageReactionAdd", (reaction, user) => {
    if (user.bot) return;
    const campaignId = extractCampaignId(reaction.message.content || "");
    if (campaignId) {
      updateReactionMetric(campaignId, reaction.emoji.name || "unknown");
    }
  });

  client.on("messageCreate", (message) => {
    if (message.author.bot) return;
    const campaignId = extractCampaignId(message.content);
    if (campaignId) {
      updateMessageMetric(campaignId, message.id);
    }
  });
}

function extractCampaignId(content: string): string | undefined {
  const match = content.match(/campaign[_-]?id[:\s]+([a-zA-Z0-9-]+)/i);
  return match ? match[1] : undefined;
}

function updateReactionMetric(campaignId: string, emoji: string): void {
  if (!campaignMetrics.has(campaignId)) {
    campaignMetrics.set(campaignId, {
      discord_reactions: new Map(),
      message_ids: new Set(),
      reaction_emoji: new Map(),
      last_updated: new Date(),
    });
  }

  const metrics = campaignMetrics.get(campaignId)!;
  metrics.reaction_emoji.set(
    emoji,
    (metrics.reaction_emoji.get(emoji) || 0) + 1,
  );
  metrics.last_updated = new Date();
}

function updateMessageMetric(campaignId: string, messageId: string): void {
  if (!campaignMetrics.has(campaignId)) {
    campaignMetrics.set(campaignId, {
      discord_reactions: new Map(),
      message_ids: new Set(),
      reaction_emoji: new Map(),
      last_updated: new Date(),
    });
  }

  const metrics = campaignMetrics.get(campaignId)!;
  metrics.message_ids.add(messageId);
  metrics.last_updated = new Date();
}

/**
 * Get aggregated campaign stats from Discord and SurrealDB
 * Can be called with null when only computing Discord metrics
 */
export async function getCampaignStats(
  campaignId: string,
  surrealStats?: {
    total_interactions: number;
    total_participants: number;
    interactions_by_kind: Record<string, number>;
    top_participants?: Array<{
      user_id: string;
      username: string;
      interaction_count: number;
    }>;
  },
): Promise<CampaignStats> {
  const metrics = campaignMetrics.get(campaignId) || {
    discord_reactions: new Map(),
    message_ids: new Set(),
    reaction_emoji: new Map(),
    last_updated: new Date(),
  };

  const reactions = Array.from(metrics.reaction_emoji.entries()).map(
    ([emoji, count]) => ({
      emoji,
      count,
    }),
  );

  const total_reactions = Array.from(metrics.reaction_emoji.values()).reduce(
    (a, b) => a + b,
    0,
  );

  return {
    campaign_id: campaignId,
    total_interactions: surrealStats?.total_interactions ?? 0,
    total_participants: surrealStats?.total_participants ?? 0,
    interactions_by_kind: surrealStats?.interactions_by_kind ?? {},
    reactions,
    discord_metrics: {
      messages_count: metrics.message_ids.size,
      reactions_count: total_reactions,
      members_joined: 0,
    },
    top_participants: surrealStats?.top_participants ?? [],
    last_updated: new Date().toISOString(),
  };
}

/**
 * Format campaign stats for Discord embedded message
 */
export function formatCampaignStatsEmbed(stats: CampaignStats): {
  title: string;
  description: string;
  fields: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
  color?: number;
  timestamp?: string;
} {
  const fields = [
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
      name: "💬 Messages",
      value: `${stats.discord_metrics.messages_count}`,
      inline: true,
    },
    {
      name: "😊 Reactions",
      value: `${stats.discord_metrics.reactions_count}`,
      inline: true,
    },
  ];

  if (stats.reactions.length > 0) {
    const topReactions = stats.reactions.slice(0, 5);
    fields.push({
      name: "🔝 Top Reactions",
      value: topReactions.map((r) => `${r.emoji} (${r.count})`).join("\n"),
      inline: false,
    });
  }

  if (stats.top_participants.length > 0) {
    const topUsers = stats.top_participants.slice(0, 5);
    fields.push({
      name: "⭐ Top Participants",
      value: topUsers
        .map((u) => `<@${u.user_id}> - ${u.interaction_count}`)
        .join("\n"),
      inline: false,
    });
  }

  return {
    title: `📈 Campaign: ${stats.campaign_id}`,
    description: `Real-time engagement metrics`,
    fields,
    color: 0x5865f2, // Discord blue
    timestamp: new Date().toISOString(),
  };
}

/**
 * Search for campaign messages in a channel
 */
export async function findCampaignMessages(
  channel: TextChannel,
  campaignId: string,
  limit = 100,
): Promise<Message[]> {
  const messages: Message[] = [];
  let lastId: string | undefined;

  try {
    while (messages.length < limit) {
      const fetched = await channel.messages.fetch({
        limit: Math.min(100, limit - messages.length),
        ...(lastId && { before: lastId }),
      });

      if (fetched.size === 0) break;

      const campaignMessages = fetched.filter((msg) =>
        msg.content.includes(campaignId),
      );
      messages.push(...campaignMessages.values());

      lastId = fetched.last()?.id;
    }
  } catch (error) {
    console.error(`Failed to fetch messages for campaign ${campaignId}:`, error);
  }

  return messages;
}

/**
 * Calculate campaign performance with SurrealDB data
 */
export async function calculateCampaignPerformance(
  campaignId: string,
  dbStats?: {
    total_interactions: number;
    total_participants: number;
    interactions_by_kind: Record<string, number>;
  },
): Promise<{
  engagement_rate: number;
  avg_per_participant: number;
  primary_interaction?: string;
}> {
  const stats = await getCampaignStats(campaignId, dbStats);

  const avgPerParticipant =
    stats.total_participants > 0
      ? stats.total_interactions / stats.total_participants
      : 0;

  const interactionTypes = Object.entries(stats.interactions_by_kind);
  const primaryInteraction =
    interactionTypes.length > 0
      ? interactionTypes.sort((a, b) => b[1] - a[1])[0][0]
      : undefined;

  return {
    engagement_rate: stats.total_participants > 0 ? 100 : 0,
    avg_per_participant: Math.round(avgPerParticipant * 100) / 100,
    primary_interaction: primaryInteraction,
  };
}

/**
 * Get active campaigns from SurrealDB query results
 */
export function getActiveCampaigns(
  campaigns: Campaign[],
): Campaign[] {
  return campaigns.filter((c) => c.status === "active");
}

/**
 * Format campaign data for display
 */
export function formatCampaignInfo(campaign: Campaign | null): string {
  if (!campaign) return "❌ Campaign not found";

  const status_emoji =
    campaign.status === "active"
      ? "🟢"
      : campaign.status === "paused"
        ? "🟡"
        : "🏁";

  return (
    `${status_emoji} **${campaign.name}**\n` +
    (campaign.description ? `${campaign.description}\n` : "") +
    `Status: ${campaign.status}\n` +
    `Created: <t:${Math.floor(new Date(campaign.created_at).getTime() / 1000)}:R>\n` +
    (campaign.end_date ? `Ends: <t:${Math.floor(new Date(campaign.end_date).getTime() / 1000)}:R>` : "")
  );
}
