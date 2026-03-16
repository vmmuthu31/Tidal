import {
  TwitterApi,
  ETwitterStreamEvent,
  TweetV2SingleStreamResult,
} from "twitter-api-v2";
import dotenv from "dotenv";
import type { CommunityEvent, TwitterConfig } from "./types.js";
import {
  enqueueCommunityEvent,
  startEventBatcher,
} from "./services/eventBatcher.js";

dotenv.config();
startEventBatcher();

const config: TwitterConfig = {
  apiKey: process.env.TWITTER_API_KEY!,
  apiSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!,
  bearerToken: process.env.TWITTER_BEARER_TOKEN!,
};

const client = new TwitterApi(config.bearerToken);
const trackedHashtags = (process.env.TRACKED_HASHTAGS || "")
  .split(",")
  .filter(Boolean);
const trackedAccounts = (process.env.TRACKED_ACCOUNTS || "")
  .split(",")
  .filter(Boolean);

async function setupStreamRules() {
  const rules = await client.v2.streamRules();

  if (rules.data?.length) {
    await client.v2.updateStreamRules({
      delete: { ids: rules.data.map((rule) => rule.id) },
    });
  }

  const newRules = [];

  if (trackedHashtags.length > 0) {
    newRules.push({
      value: trackedHashtags.join(" OR "),
      tag: "campaign-hashtags",
    });
  }

  if (trackedAccounts.length > 0) {
    const accountHandles = trackedAccounts.map((acc) => acc.replace("@", ""));
    newRules.push({
      value: accountHandles.map((handle) => `from:${handle}`).join(" OR "),
      tag: "tracked-accounts",
    });
  }

  if (newRules.length > 0) {
    await client.v2.updateStreamRules({
      add: newRules,
    });
  }

  console.log("✅ Stream rules configured");
}

async function handleTweet(tweet: TweetV2SingleStreamResult) {
  const campaignId = extractCampaignId(tweet.data.text);
  const userId = tweet.data.author_id || "unknown";

  const event: CommunityEvent = {
    external_id: userId,
    platform: "twitter",
    kind: campaignId ? "campaign_interaction" : "messaged",
    campaign_id: campaignId,
    timestamp: new Date().toISOString(),
    metadata: {
      tweet_id: tweet.data.id,
      tweet_text: tweet.data.text,
      hashtags: tweet.data.entities?.hashtags?.map((h) => h.tag),
      mentions: tweet.data.entities?.mentions?.map((m) => m.username),
    },
  };

  await enqueueCommunityEvent(event);
}

function extractCampaignId(text: string): string | undefined {
  const match = text.match(/campaign[_-]?id[:\s]+([a-zA-Z0-9-]+)/i);
  return match ? match[1] : undefined;
}

async function startStream() {
  try {
    await setupStreamRules();

    const stream = await client.v2.searchStream({
      "tweet.fields": ["author_id", "created_at", "entities", "public_metrics"],
      expansions: ["author_id"],
    });

    stream.on(ETwitterStreamEvent.Data, async (tweet) => {
      await handleTweet(tweet);
    });

    stream.on(ETwitterStreamEvent.Error, (error) => {
      console.error("Stream error:", error);
    });

    console.log("✅ Twitter stream started");
  } catch (error) {
    console.error("Failed to start stream:", error);
    process.exit(1);
  }
}

startStream();

process.on("SIGINT", () => {
  console.log("Shutting down Twitter bot...");
  process.exit(0);
});
