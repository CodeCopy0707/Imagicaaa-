import { Telegraf } from "telegraf";
import fetch from "node-fetch";
import express from "express";

// Create Express app and define port
const app = express();
const port = process.env.PORT || 3000;

// Basic route to keep the server alive
app.get("/", (req, res) => {
  res.send("Bot is running!");
});

// Start Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const bot = new Telegraf("7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g");

// Enhanced welcome message
bot.start((ctx) => {
  ctx.reply("🎨 Welcome to the AI Image Generator! 🚀\n\n" +
    "Send me a text description and I'll generate an image for you!");
});

// Image generation
bot.on("text", async (ctx) => {
  const prompt = ctx.message.text;

  // Add tuning text for better quality
  const tuningText = ", ultra high resolution, 4K, realistic, professional lighting, cinematic";
  const fullPrompt = prompt + tuningText;

  try {
    const response = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?w=1024&h=1024`);
    
    if (response.ok) {
      const imageUrl = response.url;
      await ctx.replyWithPhoto(imageUrl, {
        caption: `🎨 Here's your creation!\n\nPrompt: "${prompt}"`
      });
    } else {
      ctx.reply("❌ Failed to generate image. Please try again.");
    }

  } catch (error) {
    console.error(error);
    ctx.reply("❌ Generation failed. Please try again or check your prompt.");
  }
});

// Initialize bot
bot.launch().then(() => console.log("🚀 AI Image Generator is running..."));

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
