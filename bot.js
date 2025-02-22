import { Telegraf } from "telegraf";
import fetch from "node-fetch";
import express from "express";

// API Keys (Directly Added - Not Recommended for Production)
const TELEGRAM_BOT_TOKEN = "7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g";
const HF_API_KEY = "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";

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

// In-memory storage instead of Redis
const userSessions = new Map();
const imageHistory = new Map();

// Keep bot active by pinging every 5 minutes
const keepAlive = () => {
  setInterval(() => {
    fetch("https://imagicaaa-1.onrender.com").catch(console.error);
  }, 30000); // 5 minutes
};

// Start keepAlive immediately
keepAlive();

const updateActivity = (userId) => {
  userSessions.set(userId, {
    ...userSessions.get(userId),
    lastActive: Date.now()
  });
};

const checkInactivity = (userId) => {
  const session = userSessions.get(userId);
  if (!session) return true;
  
  const inactiveTime = Date.now() - session.lastActive;
  return inactiveTime > 30 * 60 * 1000; // 30 minutes
};

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Enhanced welcome message
bot.start((ctx) => {
  const userId = ctx.from.id;
  updateActivity(userId);
  ctx.reply("🎨 Welcome to the AI Image Generator! 🚀\n\n" +
    "Here's what I can do:\n\n" +
    "🖼 Generate high-quality images from descriptions\n" +
    "🔄 Create multiple artistic variations\n" +
    "🎯 Fine-tune image parameters\n" +
    "📊 Track your generation history\n" +
    "🔍 Advanced style controls\n\n" +
    "Commands:\n" +
    "/generate - Start image generation\n" +
    "/styles - View available styles\n" +
    "/history - View your recent generations\n" +
    "/help - Get detailed help\n\n" +
    "Send a description to begin creating!");
});

// Help command
bot.command('help', async (ctx) => {
  const userId = ctx.from.id;
  updateActivity(userId);
  
  ctx.reply("Need help? Here's a quick guide:\n\n" +
    "1. Write detailed descriptions\n" +
    "2. Specify art style if desired\n" +
    "3. Use /styles to see style options\n" +
    "4. Generate variations of results\n" +
    "5. Save favorites to history");
});

// Styles command
bot.command('styles', (ctx) => {
  ctx.reply("Available Styles 🎨\n\n" +
    "• Photorealistic\n" +
    "• Digital Art\n" +
    "• Oil Painting\n" +
    "• Watercolor\n" +
    "• Anime\n" +
    "• 3D Render\n" +
    "• Sketch\n" +
    "• Pop Art\n\n" +
    "Add style to your prompt like:\n" +
    "'mountain landscape in watercolor style'");
});

// Image generation
bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const prompt = ctx.message.text;
  
  if (await checkInactivity(userId)) {
    ctx.reply("Welcome back! Starting new session.");
  }
  
  updateActivity(userId);

  const negativePrompt = "low quality, blurry, distorted, ugly, bad anatomy";
  const quality = "premium";

  // Show processing message with style detection
  const styleMatch = prompt.match(/in (\w+) style/i);
  const detectedStyle = styleMatch ? styleMatch[1] : "default";
  
  await ctx.reply(`🎨 Processing your request...\n\nPrompt: ${prompt}\nStyle: ${detectedStyle}\nQuality: Premium\n\nPlease wait while I create your masterpiece!`);

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
          quality: "high",
          guidance_scale: 7.5,
          num_inference_steps: 50,
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 402) {
        throw new Error("The API quota has been exceeded. Please try again later or upgrade your plan.");
      }
      throw new Error(`HTTP Error! Status: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    
    // Store in memory
    if (!imageHistory.has(userId)) {
      imageHistory.set(userId, []);
    }
    const userHistory = imageHistory.get(userId);
    userHistory.push({
      prompt,
      timestamp: Date.now(),
      image: Buffer.from(buffer).toString('base64')
    });
    
    // Keep only last 10 images
    if (userHistory.length > 10) {
      userHistory.shift();
    }

    // Send response
    await ctx.replyWithPhoto(
      { source: Buffer.from(buffer) },
      {
        caption: `🎨 Here's your creation!\n\nPrompt: "${prompt}"\nStyle: ${detectedStyle}\nQuality: Premium`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🔄 Generate Variations", callback_data: "variations" },
              { text: "🎨 Change Style", callback_data: "style" }
            ]
          ]
        }
      }
    );

  } catch (error) {
    console.error(error);
    if (error.message.includes("API quota")) {
      ctx.reply("❌ Sorry, the service is currently at capacity. Please try again later.");
    } else {
      ctx.reply("❌ Generation failed. Please try again or check your prompt.");
    }
  }
});

// Variations handler
bot.action('variations', async (ctx) => {
  const userId = ctx.from.id;
  updateActivity(userId);

  const userHistory = imageHistory.get(userId);
  const lastImage = userHistory?.[userHistory.length - 1];
  
  if (!lastImage) {
    return ctx.reply("No recent image found. Please generate an image first!");
  }

  ctx.reply("🎨 Creating artistic variations...\n\nGenerating 3 unique interpretations of your image!");

  try {
    const variations = await Promise.all([
      generateImage(`${lastImage.prompt} in a different artistic style, high quality`),
      generateImage(`${lastImage.prompt} with dramatic lighting and composition`),
      generateImage(`${lastImage.prompt} with alternative perspective and mood`)
    ]);

    for (const buffer of variations) {
      await ctx.replyWithPhoto({ source: buffer });
    }
    
    ctx.reply("✨ Here are your variations! Which one do you like best?");
  } catch (error) {
    if (error.message.includes("API quota")) {
      ctx.reply("❌ Sorry, the service is currently at capacity. Please try again later.");
    } else {
      ctx.reply("Failed to generate variations. Please try again.");
    }
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
        negative_prompt: "low quality, blurry, distorted, ugly, bad anatomy",
        quality: "high",
        guidance_scale: 7.5,
        num_inference_steps: 50,
      },
    }),
  });

  if (!response.ok) {
    if (response.status === 402) {
      throw new Error("The API quota has been exceeded. Please try again later or upgrade your plan.");
    }
    throw new Error(`HTTP Error! Status: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

bot.launch().then(() => console.log("🚀 AI Image Generator is running..."));

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
