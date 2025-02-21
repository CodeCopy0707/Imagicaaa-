import { Telegraf } from "telegraf";
import fetch from "node-fetch";
import express from "express"; // Keep bot alive
import dotenv from "dotenv";

dotenv.config();

// API Keys
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const HF_API_KEY = process.env.HF_API_KEY;

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// 🟢 Keep Bot Alive (Prevents 40s Timeout)
const app = express();
app.get("/", (req, res) => res.send("Bot is running..."));
app.listen(3000, () => console.log("✅ Keep-alive server running on port 3000"));

// 🔥 Start Command
bot.start((ctx) => {
  ctx.reply("👋 Welcome! Send me a text prompt, and I'll generate an AI image for you.");
});

// 🔥 Help Command
bot.command("help", (ctx) => {
  ctx.reply("📜 *Commands Available:*\n\n" +
    "/start - Start bot\n" +
    "/help - Show this message\n\n" +
    "✏️ *Usage:*\nSimply send a text prompt, and I'll generate an AI image.");
});

// 🔥 Image Generation Logic
bot.on("text", async (ctx) => {
  const prompt = ctx.message.text;
  const negativePrompt = "low quality, blurry, distorted";
  const quality = "high"; // Can be "standard" or "high"

  // Show typing indicator
  ctx.sendChatAction("typing");

  ctx.reply("⏳ Generating your image... Please wait!");

  try {
    const response = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HF_API_KEY}`,
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          negative_prompt: negativePrompt,
          quality: quality,
        },
      }),
    });

    if (!response.ok) throw new Error(`⚠️ API Error: ${response.status}`);

    const buffer = await response.arrayBuffer();
    ctx.replyWithPhoto({ source: Buffer.from(buffer) });

  } catch (error) {
    console.error(error);
    ctx.reply("❌ Image generation failed. Please try again later.");
  }
});

// 🟢 Launch Bot
bot.launch().then(() => console.log("🚀 Telegram Bot is running..."));

// 🛑 Handle Graceful Exit
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
