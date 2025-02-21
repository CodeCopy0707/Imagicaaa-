import { Telegraf } from "telegraf";
import fetch from "node-fetch";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Secure API Keys
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const HF_API_KEY = process.env.HF_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PING_URL = process.env.PING_URL;

// Initialize AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// In-memory session storage
const userSessions = new Map();
const imageHistory = new Map();

// Keep bot active by pinging every 5 minutes
setInterval(() => {
  if (PING_URL) fetch(PING_URL).catch(console.error);
}, 300000);

// Bot initialization
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Function to update user activity
const updateActivity = (userId) => {
  userSessions.set(userId, { lastActive: Date.now() });
};

// Function to check inactivity
const checkInactivity = (userId) => {
  const session = userSessions.get(userId);
  return !session || Date.now() - session.lastActive > 30 * 60 * 1000; // 30 min
};

// Welcome message
bot.start((ctx) => {
  const userId = ctx.from.id;
  updateActivity(userId);
  ctx.reply(
    "🎨 Welcome to AI Image Generator!\n\n" +
    "Commands:\n" +
    "/generate - Create AI images\n" +
    "/styles - View available styles\n" +
    "/history - View your images\n" +
    "/help - Get detailed help"
  );
});

// Help command
bot.command("help", async (ctx) => {
  updateActivity(ctx.from.id);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Explain AI image generation features.");
    ctx.reply(result.response.text());
  } catch (error) {
    ctx.reply("Here’s a guide:\n1. Describe your idea.\n2. Use styles (/styles).\n3. Generate unique images!");
  }
});

// Styles command
bot.command("styles", (ctx) => {
  ctx.reply("🎨 Available Styles:\n- Photorealistic\n- Digital Art\n- Anime\n- Sketch\n\nUse: 'A mountain in anime style'");
});

// Image generation command
bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const prompt = ctx.message.text;

  if (checkInactivity(userId)) ctx.reply("Welcome back! Starting new session.");
  updateActivity(userId);

  const detectedStyle = (prompt.match(/in (\w+) style/i) || [])[1] || "default";
  ctx.reply(`🎨 Generating...\nPrompt: ${prompt}\nStyle: ${detectedStyle}`);

  try {
    const response = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${HF_API_KEY}` },
      body: JSON.stringify({ inputs: prompt, parameters: { guidance_scale: 7.5, num_inference_steps: 50 } }),
    });

    if (!response.ok) throw new Error(`Error: ${response.status}`);

    const buffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);

    if (!imageHistory.has(userId)) imageHistory.set(userId, []);
    const userImages = imageHistory.get(userId);
    userImages.push({ prompt, image: imageBuffer.toString("base64") });

    if (userImages.length > 10) userImages.shift();

    await ctx.replyWithPhoto({ source: imageBuffer }, { caption: `✨ Your AI Art:\nPrompt: "${prompt}"\nStyle: ${detectedStyle}` });
  } catch (error) {
    console.error(error);
    ctx.reply("❌ Failed to generate image. Try again.");
  }
});

// Generate variations
bot.action("variations", async (ctx) => {
  const userId = ctx.from.id;
  updateActivity(userId);
  const userHistory = imageHistory.get(userId);
  const lastImage = userHistory?.[userHistory.length - 1];

  if (!lastImage) return ctx.reply("No recent image found.");

  ctx.reply("🔄 Generating variations...");
  try {
    const variations = await Promise.all([
      generateImage(`${lastImage.prompt} with new artistic interpretation`),
      generateImage(`${lastImage.prompt} with different color scheme`),
      generateImage(`${lastImage.prompt} with enhanced details`)
    ]);

    for (const buffer of variations) {
      await ctx.replyWithPhoto({ source: buffer });
    }
  } catch (error) {
    ctx.reply("❌ Failed to generate variations.");
  }
});

// Fetch Gemini AI Suggestions
bot.action("ideas", async (ctx) => {
  updateActivity(ctx.from.id);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Suggest creative AI-generated image ideas.");
    ctx.reply(result.response.text());
  } catch (error) {
    ctx.reply("❌ Failed to fetch ideas.");
  }
});

// Start bot
bot.launch().then(() => console.log("🤖 Bot is running..."));

// Generate Image Helper Function
async function generateImage(prompt) {
  const response = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${HF_API_KEY}` },
    body: JSON.stringify({ inputs: prompt, parameters: { guidance_scale: 7.5, num_inference_steps: 50 } }),
  });

  if (!response.ok) throw new Error(`Error: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
      }
