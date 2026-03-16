import { getSSLHubRpcClient, Message } from "@farcaster/hub-nodejs";
import dotenv from "dotenv";
import type { CommunityEvent } from "./types.js";
import {
  enqueueCommunityEvent,
  startEventBatcher,
} from "./services/eventBatcher.js";

dotenv.config();
startEventBatcher();

const HUB_URL = process.env.FARCASTER_HUB_URL || "hub.farcaster.xyz:2281";
const trackedChannels = (process.env.TRACKED_CHANNELS || "")
  .split(",")
  .filter(Boolean);
const trackedUsers = (process.env.TRACKED_USERS || "")
  .split(",")
  .map(Number)
  .filter(Boolean);

const client = getSSLHubRpcClient(HUB_URL);

async function handleCast(message: Message) {
  if (message.data?.type !== 1) return;

  const castAddBody = message.data.castAddBody;
  if (!castAddBody) return;

  const fid = message.data.fid;
  const text = castAddBody.text || "";
  const campaignId = extractCampaignId(text);

  const shouldTrack =
    trackedUsers.includes(fid) ||
    (castAddBody.parentUrl &&
      trackedChannels.some((ch) => castAddBody.parentUrl?.includes(ch))) ||
    campaignId;

  if (!shouldTrack) return;

  const event: CommunityEvent = {
    external_id: fid.toString(),
    platform: "farcaster",
    kind: campaignId ? "campaign_interaction" : "casted",
    campaign_id: campaignId,
    timestamp: new Date(message.data.timestamp * 1000).toISOString(),
    metadata: {
      cast_hash: Buffer.from(message.hash).toString("hex"),
      cast_text: text,
      fid,
      channel: castAddBody.parentUrl,
      mentions: castAddBody.mentions,
      embeds: castAddBody.embeds?.map((e) => e.url).filter(Boolean) as string[],
    },
  };

  await enqueueCommunityEvent(event);
}

async function handleReaction(message: Message) {
  if (message.data?.type !== 3) return;

  const reactionBody = message.data.reactionBody;
  if (!reactionBody) return;

  const fid = message.data.fid;

  const event: CommunityEvent = {
    external_id: fid.toString(),
    platform: "farcaster",
    kind: "reacted",
    timestamp: new Date(message.data.timestamp * 1000).toISOString(),
    metadata: {
      fid,
      target_cast_hash: Buffer.from(
        reactionBody.targetCastId?.hash || [],
      ).toString("hex"),
      reaction_type: reactionBody.type === 1 ? "like" : "recast",
    },
  };

  await enqueueCommunityEvent(event);
}

async function handleFollow(message: Message) {
  if (message.data?.type !== 6) return;

  const linkBody = message.data.linkBody;
  if (!linkBody) return;

  const fid = message.data.fid;
  const targetFid = linkBody.targetFid;

  if (!trackedUsers.includes(targetFid || 0)) return;

  const event: CommunityEvent = {
    external_id: fid.toString(),
    platform: "farcaster",
    kind: "followed",
    timestamp: new Date(message.data.timestamp * 1000).toISOString(),
    metadata: {
      fid,
      target_fid: targetFid,
    },
  };

  await enqueueCommunityEvent(event);
}

function extractCampaignId(text: string): string | undefined {
  const match = text.match(/campaign[_-]?id[:\s]+([a-zA-Z0-9-]+)/i);
  return match ? match[1] : undefined;
}

async function subscribeToEvents() {
  try {
    const result = await client.subscribe({
      eventTypes: [1, 3, 6],
      fromId: 0,
    });

    if (result.isErr()) {
      console.error("Failed to subscribe:", result.error);
      process.exit(1);
    }

    const stream = result.value;

    stream.on("data", async (event) => {
      if (!event.messages || event.messages.length === 0) return;

      for (const message of event.messages) {
        try {
          switch (message.data?.type) {
            case 1:
              await handleCast(message);
              break;
            case 3:
              await handleReaction(message);
              break;
            case 6:
              await handleFollow(message);
              break;
          }
        } catch (error) {
          console.error("Error handling message:", error);
        }
      }
    });

    stream.on("error", (error: unknown) => {
      console.error("Stream error:", error);
    });

    console.log("✅ Farcaster event subscription started");
  } catch (error) {
    console.error("Failed to subscribe to events:", error);
    process.exit(1);
  }
}

subscribeToEvents();

process.on("SIGINT", () => {
  console.log("Shutting down Farcaster bot...");
  client.close();
  process.exit(0);
});
