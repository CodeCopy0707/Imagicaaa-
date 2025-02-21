import { Telegraf, Markup } from "telegraf";
import fetch from "node-fetch";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Secure API Keys
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const HF_API_KEY = process.env.HF_API_KEY;
const PING_URL = process.env.PING_URL;

// In-memory session & image storage
const userSessions = new Map();
const imageHistory = new Map();

// Keep bot active by pinging every 5 minutes
setInterval(() => {
  if (PING_URL) fetch(PING_URL).catch(console.error);
}, 300000);

// Initialize Bot
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

// Start Command
bot.start((ctx) => {
  const userId = ctx.from.id;
  updateActivity(userId);
  ctx.reply(
    "🎨 Welcome to the **Advanced AI Image Generator**!\n\n" +
    "**Commands:**\n" +
    "🔹 /generate - Create AI images\n" +
    "🔹 /styles - View available styles\n" +
    "🔹 /history - View your image history\n" +
    "🔹 /variations - Generate variations\n" +
    "🔹 /help - Get more details",
    Markup.inlineKeyboard([
      [Markup.button.callback("Generate Ideas 💡", "ideas")]
    ])
  );
});

// Help Command
bot.command("help", (ctx) => {
  updateActivity(ctx.from.id);
  ctx.reply(
    "**AI Image Generator Guide:**\n" +
    "1️⃣ Describe your idea (e.g., 'Futuristic city at sunset')\n" +
    "2️⃣ Add a style (e.g., 'Cyberpunk style')\n" +
    "3️⃣ Use /generate to create your AI image!\n\n" +
    "**Example:**\n" +
    "`/generate A robotic warrior in anime style`"
  );
});

// Styles Command
bot.command("styles", (ctx) => {
  ctx.reply(
    "**🎨 Available Styles:**\n" +
    "🖼 Photorealistic\n" +
    "🎭 Digital Art\n" +
    "📖 Sketch\n" +
    "🌆 Cyberpunk\n" +
    "🎬 Anime\n\n" +
    "_Use styles in your prompt like: 'A dragon in anime style'._"
  );
});

// Generate Image Command
bot.command("generate", async (ctx) => {
  const userId = ctx.from.id;
  const prompt = ctx.message.text.replace("/generate", "").trim();

  if (!prompt) return ctx.reply("❌ Please provide a prompt! Example:\n`/generate A mystical forest with glowing trees in cyberpunk style`");

  if (checkInactivity(userId)) ctx.reply("Welcome back! Starting a new session.");
  updateActivity(userId);

  const detectedStyle = (prompt.match(/in (\w+) style/i) || [])[1] || "default";
  ctx.reply(`🎨 **Generating...**\n**Prompt:** ${prompt}\n**Style:** ${detectedStyle}`);

  try {
    const imageBuffer = await generateImage(prompt);

    if (!imageHistory.has(userId)) imageHistory.set(userId, []);
    const userImages = imageHistory.get(userId);
    userImages.push({ prompt, image: imageBuffer.toString("base64") });

    if (userImages.length > 10) userImages.shift();

    await ctx.replyWithPhoto({ source: imageBuffer }, { caption: `✨ **Your AI Art:**\n**Prompt:** "${prompt}"\n**Style:** ${detectedStyle}` });
  } catch (error) {
    console.error(error);
    ctx.reply("❌ Failed to generate image. Try again later.");
  }
});

// Generate Variations
bot.command("variations", async (ctx) => {
  const userId = ctx.from.id;
  updateActivity(userId);
  const userHistory = imageHistory.get(userId);
  const lastImage = userHistory?.[userHistory.length - 1];

  if (!lastImage) return ctx.reply("❌ No recent image found. Generate one first!");

  ctx.reply("🔄 Generating variations...");

  try {
    const variations = await Promise.all([
      generateImage(`${lastImage.prompt} with a different color scheme`),
      generateImage(`${lastImage.prompt} in a more detailed art style`),
      generateImage(`${lastImage.prompt} with a dramatic lighting effect`)
    ]);

    for (const buffer of variations) {
      await ctx.replyWithPhoto({ source: buffer });
    }
  } catch (error) {
    console.error(error);
    ctx.reply("❌ Failed to generate variations.");
  }
});

// Fetch Creative Ideas
bot.action("ideas", async (ctx) => {
  updateActivity(ctx.from.id);
  const ideas = [
    "🐉 A dragon flying over a futuristic city at night",
    "🌌 A cosmic nebula in watercolor painting style",
    "🏰 A fantasy castle surrounded by magical mist",
    "🕶️ A cyberpunk hacker working in a neon-lit room",
    "🌊 A giant sea creature emerging from the ocean"
  ];
  ctx.reply(`✨ **Try these AI image ideas:**\n\n${ideas.map((idea) => `- ${idea}`).join("\n")}`);
});

// Start the bot
bot.launch().then(() => console.log("🤖 Bot is running..."));

// Generate Image Function
async function generateImage(prompt) {
  const response = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HF_API_KEY}`,
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { guidance_scale: 7.5, num_inference_steps: 50 }
    }),
  });

  if (!response.ok) throw new Error(`Error: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
