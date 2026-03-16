export type Platform = "discord" | "telegram" | "twitter" | "farcaster";

export type EventKind =
  | "joined"
  | "clicked"
  | "reacted"
  | "messaged"
  | "campaign_interaction"
  | "followed"
  | "retweeted"
  | "liked"
  | "quoted"
  | "mentioned"
  | "casted"
  | "recasted";

export interface CommunityEvent {
  external_id: string;
  platform: Platform;
  kind: EventKind;
  campaign_id?: string;
  timestamp: string;
  metadata?: {
    guild_id?: string;
    guild_name?: string;
    channel_id?: string;
    channel_name?: string;
    message_id?: string;
    reaction?: string;
    content?: string;
    username?: string;
    display_name?: string;
    [key: string]: unknown;
  };
}

export interface WebhookPayload {
  event: CommunityEvent;
  signature: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  created_by?: string;
  guild_id?: string;
  channel_id?: string;
  start_date?: string;
  end_date?: string;
  status: "active" | "paused" | "completed";
  created_at: string;
  updated_at: string;
}

export interface CampaignStats {
  campaign_id: string;
  total_interactions: number;
  total_participants: number;
  interactions_by_kind: Record<string, number>;
  reactions: {
    emoji: string;
    count: number;
  }[];
  discord_metrics: {
    messages_count: number;
    reactions_count: number;
    members_joined: number;
  };
  top_participants: {
    user_id: string;
    username: string;
    interaction_count: number;
  }[];
  last_updated: string;
}

export interface CampaignAggregation {
  campaign: Campaign | null;
  stats: CampaignStats;
}
