import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import {
  handleNewChatMembers,
  handleMessage,
  handleCallbackQuery,
} from "./handlers";
import { startEventBatcher } from "./services/eventBatcher.js";

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
startEventBatcher();

bot.on("new_chat_members", async (ctx) => {
  await handleNewChatMembers(ctx);
});

bot.on("message", async (ctx) => {
  await handleMessage(ctx);
});

bot.on("callback_query", async (ctx) => {
  await handleCallbackQuery(ctx);
});

bot.command("start", async (ctx) => {
  await ctx.reply(
    "Welcome to the Tidal Bot! 🎉\n\n" +
      "This bot tracks community engagement for Tidal CRM.\n\n" +
      "Commands:\n" +
      "/link - Link your wallet to your Telegram account\n" +
      "/campaign <id> - Interact with a campaign",
  );
});

bot.command("link", async (ctx) => {
  const userId = ctx.from.id.toString();
  const username = ctx.from.username || ctx.from.first_name;

  await ctx.reply(
    `🔗 To link your wallet:\n\n` +
      `1. Visit: ${process.env.WEBHOOK_URL?.replace("/webhooks/telegram", "/link")}\n` +
      `2. Use this code: ${userId}\n` +
      `3. Connect your wallet\n\n` +
      `Your Telegram ID: ${userId}\n` +
      `Username: ${username}`,
  );
});

bot.command("campaign", async (ctx) => {
  const args = ctx.message.text.split(" ");
  const campaignId = args[1];

  if (!campaignId) {
    await ctx.reply("Please provide a campaign ID: /campaign <id>");
    return;
  }

  await ctx.reply(
    `📢 Campaign: ${campaignId}\n\n` +
      `React to this message or click the button below to participate!`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Participate", callback_data: `campaign:${campaignId}` }],
        ],
      },
    },
  );
});

bot.launch();

console.log("✅ Telegram bot is running!");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
