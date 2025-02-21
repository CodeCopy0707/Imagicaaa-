import { Telegraf } from "telegraf";
import fetch from "node-fetch";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Redis from "ioredis";

// API Keys (Directly Added - Not Recommended for Production)
const TELEGRAM_BOT_TOKEN = "7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g";
const HF_API_KEY = "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";
const GEMINI_API_KEY = "AIzaSyDc7u7wTVdDG3zP18xnELKs0HX7-hImkmc";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const redis = new Redis();

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Store user sessions and activity timestamps
const userSessions = new Map();

// Check user inactivity
const INACTIVE_TIMEOUT = 40 * 1000; // 40 seconds

const checkInactivity = async (userId) => {
  const lastActive = userSessions.get(userId)?.lastActive;
  if (lastActive && Date.now() - lastActive > INACTIVE_TIMEOUT) {
    await redis.del(`user:${userId}:context`);
    userSessions.delete(userId);
    return true;
  }
  return false;
};

// Update user activity
const updateActivity = (userId) => {
  userSessions.set(userId, {
    ...userSessions.get(userId),
    lastActive: Date.now()
  });
};

bot.start((ctx) => {
  const userId = ctx.from.id;
  updateActivity(userId);
  ctx.reply("👋 Welcome! I'm your AI Image Generation assistant. Here's what I can do:\n\n" +
    "🎨 Generate images from text descriptions\n" +
    "🔄 Create variations of generated images\n" + 
    "💡 Provide creative ideas and suggestions\n" +
    "❓ Answer questions about image generation\n\n" +
    "Send me a text prompt to get started!");
});

bot.command('help', async (ctx) => {
  const userId = ctx.from.id;
  updateActivity(userId);
  
  const model = genAI.getGenerativeModel({ model: "gemini-pro"});
  const prompt = "You are an AI image generation bot assistant. Provide a helpful response about your capabilities and how to use you effectively.";
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    ctx.reply(response.text());
  } catch (error) {
    ctx.reply("I'm here to help! Send me text prompts to generate images, or ask questions about image generation.");
  }
});

bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const prompt = ctx.message.text;
  
  // Check inactivity
  if (await checkInactivity(userId)) {
    ctx.reply("Session expired due to inactivity. Starting new session.");
  }
  
  updateActivity(userId);

  const negativePrompt = "low quality, blurry, distorted";
  const quality = "premium";

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
    
    // Store image context in Redis
    await redis.set(`user:${userId}:lastPrompt`, prompt);
    await redis.set(`user:${userId}:lastImage`, Buffer.from(buffer).toString('base64'));

    // Send image with variation options
    await ctx.replyWithPhoto(
      { source: Buffer.from(buffer) },
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🔄 Generate Variations", callback_data: "variations" },
              { text: "💡 Get Ideas", callback_data: "ideas" }
            ]
          ]
        }
      }
    );

  } catch (error) {
    console.error(error);
    ctx.reply("❌ Failed to generate image. Please try again later.");
  }
});

// Handle variation requests
bot.action('variations', async (ctx) => {
  const userId = ctx.from.id;
  updateActivity(userId);

  const lastPrompt = await redis.get(`user:${userId}:lastPrompt`);
  if (!lastPrompt) {
    return ctx.reply("No recent image found to create variations from.");
  }

  ctx.reply("🎨 Generating variations of your last image...");

  try {
    // Generate 3 variations with slightly modified prompts
    const variations = await Promise.all([
      generateImage(`${lastPrompt} in a different style`),
      generateImage(`${lastPrompt} with different colors`),
      generateImage(`${lastPrompt} from another angle`)
    ]);

    for (const buffer of variations) {
      await ctx.replyWithPhoto({ source: buffer });
    }
  } catch (error) {
    ctx.reply("Failed to generate variations. Please try again.");
  }
});

// Handle idea requests
bot.action('ideas', async (ctx) => {
  const userId = ctx.from.id;
  updateActivity(userId);

  const lastPrompt = await redis.get(`user:${userId}:lastPrompt`);
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(
      `Based on this prompt: "${lastPrompt}", suggest 3 creative variations or new ideas for image generation.`
    );
    const response = await result.response;
    ctx.reply(response.text());
  } catch (error) {
    ctx.reply("Failed to generate ideas. Please try again.");
  }
});

async function generateImage(prompt) {
  const response = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HF_API_KEY}`,
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        negative_prompt: "low quality, blurry, distorted",
        quality: "high",
      },
    }),
  });

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

bot.launch().then(() => console.log("🚀 Telegram Bot is running..."));

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
