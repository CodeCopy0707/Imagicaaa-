import { Telegraf } from "telegraf";
import fetch from "node-fetch";
import { GoogleGenerativeAI } from "@google/generative-ai";

// API Keys (Directly Added - Not Recommended for Production)
const TELEGRAM_BOT_TOKEN = "7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g";
const HF_API_KEY = "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"; 
const GEMINI_API_KEY = "AIzaSyDc7u7wTVdDG3zP18xnELKs0HX7-hImkmc";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// In-memory storage instead of Redis
const userSessions = new Map();
const imageHistory = new Map();

// Keep bot active by pinging every 30 seconds
const keepAlive = () => {
  setInterval(() => {
    fetch("https://imagicaaa-1.onrender.com").catch(console.error);
  }, 30000);
};

// Start keepAlive immediately
keepAlive();

// Additional ping to another URL as backup
setInterval(() => {
  fetch("https://imagicaaa-1.onrender.com").catch(console.error);
}, 30000);

// Ping multiple endpoints to ensure uptime
const pingEndpoints = [
  "https://imagicaaa-1.onrender.com",
];

setInterval(() => {
  pingEndpoints.forEach(endpoint => {
    fetch(endpoint).catch(console.error);
  });
}, 30000);

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
  ctx.reply("🎨 Welcome to the Advanced AI Image Generator! 🚀\n\n" +
    "Here's what I can do:\n\n" +
    "🖼 Generate high-quality images from descriptions\n" +
    "🔄 Create multiple artistic variations\n" +
    "💡 Provide creative suggestions\n" +
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

// Enhanced help command with Gemini
bot.command('help', async (ctx) => {
  const userId = ctx.from.id;
  updateActivity(userId);
  
  const model = genAI.getGenerativeModel({ model: "gemini-pro"});
  const prompt = "You are an advanced AI image generation assistant. Provide a detailed guide about your capabilities including: image generation, style control, variations, best practices for prompts, and advanced features. Make it engaging and informative.";
  
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    ctx.reply(response.text());
  } catch (error) {
    ctx.reply("Need help? Here's a quick guide:\n\n" +
      "1. Write detailed descriptions\n" +
      "2. Specify art style if desired\n" +
      "3. Use /styles to see style options\n" +
      "4. Generate variations of results\n" +
      "5. Save favorites to history");
  }
});

// New styles command
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

// Enhanced image generation
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

    if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);

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

    // Enhanced response with more options
    await ctx.replyWithPhoto(
      { source: Buffer.from(buffer) },
      {
        caption: `🎨 Here's your creation!\n\nPrompt: "${prompt}"\nStyle: ${detectedStyle}\nQuality: Premium`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🔄 Generate Variations", callback_data: "variations" },
              { text: "💡 Get Ideas", callback_data: "ideas" }
            ],
            [
              { text: "🎨 Change Style", callback_data: "style" },
              { text: "⚙️ Advanced Settings", callback_data: "settings" }
            ]
          ]
        }
      }
    );

  } catch (error) {
    console.error(error);
    ctx.reply("❌ Generation failed. Please try again or check your prompt.");
  }
});

// Enhanced variations with style control
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
    ctx.reply("Failed to generate variations. Please try again.");
  }
});

// Enhanced idea generation
bot.action('ideas', async (ctx) => {
  const userId = ctx.from.id;
  updateActivity(userId);

  const userHistory = imageHistory.get(userId);
  const lastImage = userHistory?.[userHistory.length - 1];
  
  if (!lastImage) {
    return ctx.reply("No recent prompts found!");
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(
      `As a creative AI art director, suggest 5 unique and detailed variations of this image prompt: "${lastImage.prompt}". Include specific style suggestions and artistic elements. Make them diverse and interesting.`
    );
    const response = await result.response;
    ctx.reply("🎨 Creative Suggestions:\n\n" + response.text());
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
        negative_prompt: "low quality, blurry, distorted, ugly, bad anatomy",
        quality: "high",
        guidance_scale: 7.5,
        num_inference_steps: 50,
      },
    }),
  });

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

// Keep bot active on Render
keepAlive();

bot.launch().then(() => console.log("🚀 Advanced AI Image Generator is running..."));

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
