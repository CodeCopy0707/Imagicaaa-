import { Telegraf } from "telegraf";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

// API Keys (Directly Added - Not Recommended for Production)
const TELEGRAM_BOT_TOKEN = "7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g";
const HF_API_KEY = "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";
const GEMINI_API_KEY = "AIzaSyDc7u7wTVdDG3zP18xnELKs0HX7-hImkmc";

// Bot Initialization
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// User Data Storage (In-Memory for Simplicity; Use a Database in Production)
const userHistory = {};

// Helper Function: Save Image Locally
function saveImageLocally(userId, buffer) {
  const dir = path.join(__dirname, "images", userId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${Date.now()}.png`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// Start Command
bot.start((ctx) => {
  ctx.reply(
    "👋 Welcome! Send me a text prompt, and I'll generate an image for you using AI.\n\n" +
      "Features:\n" +
      "- Generate image variants\n" +
      "- Get help with ideas or prompts\n" +
      "- View your image history"
  );
});

// Text Input Handler
bot.on("text", async (ctx) => {
  const userId = ctx.from.id.toString();
  const prompt = ctx.message.text;

  // Check for Special Commands
  if (prompt.toLowerCase() === "/history") {
    return showHistory(ctx, userId);
  }

  if (prompt.toLowerCase().startsWith("/help")) {
    return getHelp(ctx, prompt);
  }

  // Generate Image
  ctx.reply("⏳ Generating your image... Please wait!");
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
      {
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
      }
    );

    if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);
    const buffer = await response.arrayBuffer();

    // Save Image Locally and Update History
    const filePath = saveImageLocally(userId, Buffer.from(buffer));
    if (!userHistory[userId]) userHistory[userId] = [];
    userHistory[userId].push({ prompt, filePath });

    // Send Image to User
    ctx.replyWithPhoto({ source: filePath }, {
      caption: "Here's your image! Use /history to view past images.",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Generate Variants", callback_data: `variants:${filePath}` }],
        ],
      },
    });
  } catch (error) {
    console.error(error);
    ctx.reply("❌ Failed to generate image. Please try again later.");
  }
});

// Show Image History
function showHistory(ctx, userId) {
  if (!userHistory[userId] || userHistory[userId].length === 0) {
    return ctx.reply("No image history found.");
  }

  const historyMessage = userHistory[userId]
    .map((item, index) => `${index + 1}. Prompt: "${item.prompt}"`)
    .join("\n");

  ctx.reply(`Your Image History:\n${historyMessage}`);
}

// Get Help Using Gemini API
async function getHelp(ctx, query) {
  const question = query.replace("/help", "").trim();
  if (!question) {
    return ctx.reply("Please provide a specific question after /help.");
  }

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: question }] }],
        key: GEMINI_API_KEY,
      }),
    });

    if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);
    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't find an answer.";
    ctx.reply(`💡 Help: ${answer}`);
  } catch (error) {
    console.error(error);
    ctx.reply("❌ Failed to fetch help. Please try again later.");
  }
}

// Callback Query Handler for Variants
bot.action(/variants:(.+)/, async (ctx) => {
  const filePath = ctx.match[1];
  ctx.reply("⏳ Generating image variants... Please wait!");

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HF_API_KEY}`,
        },
        body: JSON.stringify({
          inputs: "variant of previous image",
          parameters: {
            init_image: fs.readFileSync(filePath),
            strength: 0.7,
          },
        }),
      }
    );

    if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);
    const buffer = await response.arrayBuffer();
    ctx.replyWithPhoto({ source: Buffer.from(buffer) });
  } catch (error) {
    console.error(error);
    ctx.reply("❌ Failed to generate image variants. Please try again later.");
  }
});

// Timeout Handling
bot.use(async (ctx, next) => {
  const timeout = setTimeout(() => {
    ctx.reply("⚠️ You have been inactive for 40 seconds. Type anything to continue.");
  }, 40000);
  await next();
  clearTimeout(timeout);
});

// Launch Bot
bot.launch().then(() => console.log("🚀 Telegram Bot is running..."));

// Graceful Shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
