import type { Context } from "telegraf";
import type { CommunityEvent } from "./types.js";
import { enqueueCommunityEvent } from "./services/eventBatcher.js";

export async function handleNewChatMembers(ctx: Context): Promise<void> {
  if (!("new_chat_members" in ctx.message!)) return;

  const newMembers = ctx.message.new_chat_members;

  for (const member of newMembers) {
    if (member.is_bot) continue;

    const event: CommunityEvent = {
      external_id: member.id.toString(),
      platform: "telegram",
      kind: "joined",
      timestamp: new Date().toISOString(),
      metadata: {
        chat_id: ctx.chat?.id.toString(),
        chat_title: "title" in ctx.chat! ? ctx.chat.title : undefined,
        username: member.username,
        first_name: member.first_name,
        last_name: member.last_name,
      },
    };

    await enqueueCommunityEvent(event);
  }
}

export async function handleMessage(ctx: Context): Promise<void> {
  if (!ctx.from || ctx.from.is_bot) return;
  if (!("text" in ctx.message!)) return;

  const text = ctx.message.text;
  const campaignId = extractCampaignId(text);

  if (!campaignId && !text.startsWith("/campaign")) {
    return;
  }

  const event: CommunityEvent = {
    external_id: ctx.from.id.toString(),
    platform: "telegram",
    kind: campaignId ? "campaign_interaction" : "messaged",
    campaign_id: campaignId,
    timestamp: new Date().toISOString(),
    metadata: {
      chat_id: ctx.chat?.id.toString(),
      chat_title: "title" in ctx.chat! ? ctx.chat.title : undefined,
      message_id: ctx.message.message_id,
      username: ctx.from.username,
      first_name: ctx.from.first_name,
      last_name: ctx.from.last_name,
      content: text.substring(0, 200),
    },
  };

  await enqueueCommunityEvent(event);
}

export async function handleCallbackQuery(ctx: Context): Promise<void> {
  if (!ctx.from || ctx.from.is_bot) return;
  if (!("data" in ctx.callbackQuery!)) return;

  const data = ctx.callbackQuery.data;
  const campaignMatch = data.match(/^campaign:(.+)$/);

  if (!campaignMatch) return;

  const campaignId = campaignMatch[1];

  const event: CommunityEvent = {
    external_id: ctx.from.id.toString(),
    platform: "telegram",
    kind: "campaign_interaction",
    campaign_id: campaignId,
    timestamp: new Date().toISOString(),
    metadata: {
      chat_id: ctx.chat?.id.toString(),
      username: ctx.from.username,
      first_name: ctx.from.first_name,
      last_name: ctx.from.last_name,
      action: "button_click",
    },
  };

  await enqueueCommunityEvent(event);
  await ctx.answerCbQuery("✅ Participation recorded!");
}

function extractCampaignId(text: string): string | undefined {
  const match = text.match(/campaign[_-]?id[:\s]+([a-zA-Z0-9-]+)/i);
  return match ? match[1] : undefined;
}
