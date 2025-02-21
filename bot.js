import { Telegraf } from "telegraf";
import fetch from "node-fetch";

// API Keys (Directly Added - Not Recommended for Production)
const TELEGRAM_BOT_TOKEN = "7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g";
const HF_API_KEY = "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";

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply("👋 Welcome! Send me a text prompt, and I'll generate an image for you using AI.");
});

bot.on("text", async (ctx) => {
  const prompt = ctx.message.text;
  const negativePrompt = "low quality, blurry, distorted";
  const quality = "premium"; // Change to "standard" for normal quality

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
          quality: quality === "premium" ? "high" : "standard",
        },
      }),
    });

    if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);

    const buffer = await response.arrayBuffer();
    ctx.replyWithPhoto({ source: Buffer.from(buffer) });
  } catch (error) {
    console.error(error);
    ctx.reply("❌ Failed to generate image. Please try again later.");
  }
});

bot.launch().then(() => console.log("🚀 Telegram Bot is running..."));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
