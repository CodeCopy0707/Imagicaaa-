


import { Telegraf, Markup } from "telegraf";
import fetch from "node-fetch";
import fs from "fs-extra";
import express from "express"; // Keep bot alive
import dotenv from "dotenv";

dotenv.config();

// API Keys
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const HF_API_KEY = process.env.HF_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// 🟢 Keep Bot Alive (Prevents 40s Timeout)
const app = express();
app.get("/", (req, res) => res.send("Bot is running..."));
app.listen(3000, () => console.log("✅ Keep-alive server running on port 3000"));

// 🖼️ Store Image History
const imageHistory = {}; // User-wise image storage

// 🔥 Start Command
bot.start((ctx) => {
  ctx.reply("👋 Welcome! Send me a text prompt, and I'll generate an AI image for you.");
});

// 🔥 Help Command
bot.command("help", (ctx) => {
  ctx.reply("📜 *Commands Available:*\n\n" +
    "/start - Start bot\n" +
    "/help - Show this message\n" +
    "/history - View your previously generated images\n\n" +
    "✏️ *Usage:*\nSimply send a text prompt, and I'll generate an AI image.", { parse_mode: "Markdown" });
});

// 🔥 Show Image History
bot.command("history", async (ctx) => {
  const userId = ctx.from.id;
  if (!imageHistory[userId] || imageHistory[userId].length === 0) {
    return ctx.reply("📂 You have no image history yet.");
  }

  for (const image of imageHistory[userId]) {
    await ctx.replyWithPhoto({ source: image });
  }
});

// 🔥 Generate Image from Prompt
bot.on("text", async (ctx) => {
  const prompt = ctx.message.text;
  const userId = ctx.from.id;
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
    const imagePath = `./images/${userId}_${Date.now()}.jpg`;
    await fs.outputFile(imagePath, Buffer.from(buffer));

    // Store in history
    if (!imageHistory[userId]) imageHistory[userId] = [];
    imageHistory[userId].push(imagePath);

    ctx.replyWithPhoto({ source: imagePath },
      Markup.inlineKeyboard([
        [Markup.button.callback("🔄 Generate More Variants", `variants_${imagePath}`)]
      ])
    );

  } catch (error) {
    console.error(error);
    ctx.reply("❌ Image generation failed. Please try again later.");
  }
});

// 🔄 Generate More Variants
bot.action(/variants_(.+)/, async (ctx) => {
  const imagePath = ctx.match[1];
  const prompt = "Generate more variations of this image.";
  
  ctx.sendChatAction("typing");
  ctx.reply("🔄 Generating more variants...");

  try {
    const response = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HF_API_KEY}`,
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { quality: "high" },
      }),
    });

    if (!response.ok) throw new Error(`⚠️ API Error: ${response.status}`);

    const buffer = await response.arrayBuffer();
    const variantPath = `./images/variant_${Date.now()}.jpg`;
    await fs.outputFile(variantPath, Buffer.from(buffer));

    ctx.replyWithPhoto({ source: variantPath });

  } catch (error) {
    console.error(error);
    ctx.reply("❌ Could not generate variants. Try again.");
  }
});

// 🤖 Gemini AI for Guidance
bot.command("ask", async (ctx) => {
  const question = ctx.message.text.replace("/ask", "").trim();
  if (!question) return ctx.reply("❓ Please ask a valid question.");

  ctx.sendChatAction("typing");
  ctx.reply("🤖 Thinking...");

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta3/models/gemini-pro:generateText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        prompt: { text: question },
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    if (!data || !data.candidates || data.candidates.length === 0) throw new Error("No response from Gemini AI.");

    ctx.reply(`🤖 *Gemini AI says:*\n${data.candidates[0].output.text}`, { parse_mode: "Markdown" });

  } catch (error) {
    console.error(error);
    ctx.reply("❌ Error getting AI response.");
  }
});

// 🟢 Launch Bot
bot.launch().then(() => console.log("🚀 Telegram Bot is running..."));

// 🛑 Handle Graceful Exit
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
