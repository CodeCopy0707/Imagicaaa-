import { Telegraf, Markup } from "telegraf";
import fetch from "node-fetch";
import express from "express";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app and define port
const app = express();
const port = process.env.PORT || 3000;

// Admin chat ID for monitoring and error reporting
const ADMIN_CHAT_ID = "749824465"; // Replace with your actual admin chat ID

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Enable JSON parsing and serve static files
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

// Basic route to keep the server alive
app.get("/", (req, res) => {
  res.send("Bot is running!");
});

// Ping endpoint to keep the bot active
app.get("/ping", (req, res) => {
  res.status(200).send("Pong!");
});

// Start Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Initialize Telegraf bot.  Replace with *your* bot token.
const bot = new Telegraf("7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g");

// Keep-alive mechanism to prevent timeout
const KEEP_ALIVE_INTERVAL = 30000; // 30 seconds
setInterval(() => {
  fetch(`${process.env.WEBHOOK_DOMAIN || "https://imagicaaa-1.onrender.com"}/ping`) // Replace with your actual domain
    .then(() => console.log("Keep-alive ping sent"))
    .catch(err => console.error("Keep-alive ping failed:", err));
}, KEEP_ALIVE_INTERVAL);

// User session storage (consider using a database for production)
const userSessions = {};

// Style options for image generation
const styleOptions = {
  "Realistic": ", ultra detailed, hyperrealistic, 8K UHD, professional photography, cinematic lighting, ray tracing, detailed textures",
  "Anime": ", anime style, vibrant colors, detailed anime art, studio ghibli inspired, 2D animation style",
  "Cartoon": ", cartoon style, vibrant colors, stylized, disney pixar style, 3D rendering",
  "Oil Painting": ", oil painting style, detailed brushstrokes, canvas texture, artistic, museum quality",
  "Watercolor": ", watercolor painting, soft colors, flowing pigments, artistic, hand-painted look",
  "Sketch": ", pencil sketch, detailed linework, grayscale, hand-drawn appearance",
  "Cyberpunk": ", cyberpunk style, neon lights, futuristic, high tech, dystopian, digital art",
  "Fantasy": ", fantasy art style, magical, mystical, ethereal lighting, detailed fantasy elements",
  "Vintage": ", vintage photography, retro style, old film grain, nostalgic colors, 70s aesthetic",
  "Abstract": ", abstract art, non-representational, bold colors, geometric shapes, modern art style",
  "3D Render": ", 3D render, octane render, detailed textures, realistic lighting, volumetric effects",
  "Photorealistic": ", photorealistic, indistinguishable from reality, perfect details, studio lighting",
  "Cinematic": ", cinematic, movie scene, dramatic lighting, film grain, widescreen composition"
};

// --- Bot Command Handlers ---

// Welcome message
bot.start((ctx) => {
  const userId = ctx.from.id;
  userSessions[userId] = { lastActivity: Date.now() };

  ctx.reply("🎨 Welcome to the Advanced AI Image Generator! 🚀\n\n" +
    "Send me a text description and I'll generate a high-quality image for you!\n\n" +
    "You can also select different styles for your image generation.\n\n" +
    "💡 Pro tip: Be detailed in your descriptions for better results!",
    Markup.keyboard([
      ['🎨 Generate Image', '🔍 View Samples'],
      ['⚙️ Settings', '❓ Help']
    ]).resize()
  );
});

// Help command
bot.help((ctx) => {
  const userId = ctx.from.id;
  userSessions[userId] = { lastActivity: Date.now() };

  ctx.reply("🌟 *Advanced AI Image Generator Help* 🌟\n\n" +
    "*How to use this bot:*\n\n" +
    "1️⃣ Send me a text description of the image you want to create\n" +
    "2️⃣ Select a style from the options that appear\n" +
    "3️⃣ Wait for your image to be generated\n" +
    "4️⃣ Enhance your image with additional options (optional)\n\n" +
    "*Available styles:* Realistic, Anime, Cartoon, Oil Painting, Watercolor, Sketch, Cyberpunk, Fantasy, Vintage, Abstract, 3D Render, Photorealistic, Cinematic\n\n" +
    "*Tips for better results:*\n" +
    "• Be specific and detailed in your descriptions\n" +
    "• Mention colors, lighting, and composition\n" +
    "• Use descriptive adjectives\n\n" +
    "*Commands:*\n" +
    "/start - Start the bot\n" +
    "/help - Show this help message\n" +
    "/settings - Adjust your preferences (not yet implemented)\n" +
    "/cancel - Cancel current operation",
    { parse_mode: "Markdown" }
  );
});

// Settings command (placeholder - add actual settings functionality)
bot.command("settings", (ctx) => {
  const userId = ctx.from.id;
  userSessions[userId] = { lastActivity: Date.now() };

  ctx.reply("⚙️ *Settings*\n\nCustomization options are under development. Stay tuned!", {
    parse_mode: "Markdown",
  });
});

// Cancel command
bot.command("cancel", (ctx) => {
  const userId = ctx.from.id;
  userSessions[userId] = { lastActivity: Date.now() };

  ctx.reply("🚫 Current operation canceled. What would you like to do next?");
});

// --- Button Handlers ---

// Handle main menu keyboard buttons
bot.hears('🎨 Generate Image', (ctx) => {
  const userId = ctx.from.id;
  userSessions[userId] = { lastActivity: Date.now() };

  ctx.reply("Please describe the image you want to generate in detail:");
});

bot.hears('🔍 View Samples', (ctx) => {
  const userId = ctx.from.id;
  userSessions[userId] = { lastActivity: Date.now() };

  ctx.reply("Here are some sample prompts you can try:\n\n" +
    "• A majestic lion standing on a cliff at sunset\n" +
    "• Futuristic cityscape with flying cars and neon lights\n" +
    "• Enchanted forest with glowing mushrooms and fairy lights\n" +
    "• Underwater scene with colorful coral reef and exotic fish\n" +
    "• Space station orbiting a ringed planet with stars in background");
});

// Redirect settings and help button presses to commands
bot.hears('⚙️ Settings', (ctx) => ctx.reply('/settings'));
bot.hears('❓ Help', (ctx) =>  ctx.reply('/help'));

// --- Image Generation Logic ---

// Handle text messages (image prompts)
bot.on("text", async (ctx) => {
  const prompt = ctx.message.text;
  const userId = ctx.from.id;
  const username = ctx.from.username || "Unknown";

  // Update user activity
  userSessions[userId] = {
    lastActivity: Date.now(),
    currentPrompt: prompt
  };

  // Ignore command-like messages and predefined button texts
  if (prompt.startsWith('/') || ['🎨 Generate Image', '🔍 View Samples', '⚙️ Settings', '❓ Help'].includes(prompt)) {
    return;
  }

  // Show typing indicator
  ctx.telegram.sendChatAction(ctx.chat.id, "typing");

  // Notify admin about the generation request
  bot.telegram.sendMessage(ADMIN_CHAT_ID,
    `🔔 New Image Generation Request\nUser: @${username} (${userId})\nPrompt: "${prompt}"`
  ).catch(error => console.error("Error notifying admin:", error));

  // Create style selection buttons
  const styleButtons = Object.keys(styleOptions).map(style =>
    Markup.button.callback(style, `style:${style}:${prompt}`)
  );

  // Arrange buttons in rows of 3
  const keyboard = [];
  for (let i = 0; i < styleButtons.length; i += 3) {
    keyboard.push(styleButtons.slice(i, i + 3));
  }

  // Send style selection message
  await ctx.reply("🎨 Choose a style for your image:",
    Markup.inlineKeyboard([
      ...keyboard,
      [Markup.button.callback("🎲 Random Style", `style:random:${prompt}`)]
    ])
  );
});

// Handle style selection callback queries
bot.action(/style:(.+):(.+)/, async (ctx) => {
  const styleChoice = ctx.match[1];
  const prompt = ctx.match[2];
  const userId = ctx.from.id;
  const username = ctx.callbackQuery.from.username || "Unknown";

  // Update user activity
  userSessions[userId] = {
    lastActivity: Date.now(),
    currentPrompt: prompt,
    currentStyle: styleChoice
  };

  // Handle random style selection
  let style = styleChoice;
  if (style === "random") {
    const styles = Object.keys(styleOptions);
    style = styles[Math.floor(Math.random() * styles.length)];
  }

  // Acknowledge the callback query
  await ctx.answerCbQuery(`Preparing your ${style} masterpiece...`);

  // Show typing indicator
  ctx.telegram.sendChatAction(ctx.chat.id, "typing");

  // Send detailed waiting message with progress updates
  const waitingMsg = await ctx.reply(
    `🎨 *Creating your ${style} masterpiece...*\n\n` +
    `🔄 *Status:* Initializing generation\n` +
    `⏱️ *Estimated time:* 15-30 seconds\n\n` +
    `Your prompt: "${prompt}"`,
    { parse_mode: "Markdown" }
  );

  // Update waiting message to show progress (simulated)
  const updateInterval = setInterval(async () => {
    try {
      const stages = [
        "Analyzing prompt",
        "Generating composition",
        "Adding details",
        "Applying style",
        "Finalizing image"
      ];
      const randomStage = stages[Math.floor(Math.random() * stages.length)];

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        waitingMsg.message_id,
        undefined, // Use undefined instead of null
        `🎨 *Creating your ${style} masterpiece...*\n\n` +
        `🔄 *Status:* ${randomStage}\n` +
        `⏱️ *Estimated time:* A few more seconds\n\n` +
        `Your prompt: "${prompt}"`,
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      console.error("Error updating waiting message:", error);
      clearInterval(updateInterval); // Stop updates on error
    }
  }, 5000);

  // Add style-specific tuning text to the prompt
  const tuningText = styleOptions[style] || ""; // Use empty string if style not found
  const fullPrompt = prompt + tuningText;

  try {
    // Show photo uploading status after a delay
    setTimeout(() => {
      ctx.telegram.sendChatAction(ctx.chat.id, "upload_photo");
    }, 10000);

    // Fetch image from Pollinations API
    const response = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?w=1024&h=1024`);

    // Clear the update interval *before* processing the response
    clearInterval(updateInterval);

    if (response.ok) {
      const imageBuffer = await response.buffer();

      // Process image to remove watermark (crop 60px from bottom)
      const processedImage = await sharp(imageBuffer)
        .extract({
          width: 1024,
          height: 964,
          left: 0,
          top: 0
        })
        .toBuffer();

      // Save image to file
      const fileName = `${userId}_${Date.now()}.jpg`;
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, processedImage);

      // Store image info in user session
      if (!userSessions[userId].images) {
          userSessions[userId].images = [];
      }
      userSessions[userId].images.push({
        path: filePath,
        prompt: prompt,
        style: style,
        timestamp: Date.now()
      });

      // Send processed image
      await ctx.replyWithPhoto({ source: processedImage }, {
        caption: `🎨 *Here's your ${style} creation!*\n\n` +
                `*Prompt:* "${prompt}"\n\n` +
                `✨ Generated with advanced AI technology\n` +
                `🔄 Use the buttons below to enhance or modify`,
        parse_mode: "Markdown"
      });

      // Delete waiting message
      await ctx.telegram.deleteMessage(ctx.chat.id, waitingMsg.message_id);

      // Notify admin about successful generation
      bot.telegram.sendMessage(ADMIN_CHAT_ID,
        `✅ Image Generated Successfully\nUser: @${username} (${userId})\nStyle: ${style}\nPrompt: "${prompt}"`
      ).catch(error => console.error("Error notifying admin (success):", error));

      // Offer enhancement options
      const enhancementKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔍 Enhance Resolution', `enhance:resolution:${prompt}`),
         Markup.button.callback('🌈 Enhance Colors', `enhance:colors:${prompt}`)],
        [Markup.button.callback('✨ Add Details', `enhance:details:${prompt}`),
         Markup.button.callback('🖼️ Change Aspect Ratio', `enhance:aspect:${prompt}`)],
        [Markup.button.callback('🔄 Regenerate', `regenerate:${style}:${prompt}`),
         Markup.button.callback('🎭 Try Different Style', `tryStyle:${prompt}`)]
      ]);

      await ctx.reply('Would you like to enhance this image?', enhancementKeyboard);

    } else {
      // Handle API errors
      console.error(`API Error: ${response.status} - ${response.statusText}`);
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        waitingMsg.message_id,
        undefined, // Use undefined instead of null
        `❌ Failed to generate image.  API Error: ${response.status} - ${response.statusText}. Please try again.`
      );

      bot.telegram.sendMessage(ADMIN_CHAT_ID,
        `❌ Generation Failed\nUser: @${username} (${userId})\nStyle: ${style}\nPrompt: "${prompt}"\nAPI Status: ${response.status}`
      ).catch(error => console.error("Error notifying admin (failure):", error));
    }

  } catch (error) {
    // Handle other errors (e.g., network issues)
    clearInterval(updateInterval); // Ensure interval is cleared
    console.error("Generation Error:", error);
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      waitingMsg.message_id,
      undefined,
      "❌ Generation failed. An unexpected error occurred. Please try again later."
    );

    bot.telegram.sendMessage(ADMIN_CHAT_ID,
      `❌ Error in Generation\nUser: @${username} (${userId})\nStyle: ${style}\nPrompt: "${prompt}"\nError: ${error.message}`
    ).catch(error => console.error("Error notifying admin (exception):", error));
  }
});

// Handle regeneration request
bot.action(/regenerate:(.+):(.+)/, async (ctx) => {
  const style = ctx.match[1];
  const prompt = ctx.match[2];
  const userId = ctx.from.id;

    userSessions[userId] = {
        lastActivity: Date.now(),
        currentPrompt: prompt,
        currentStyle: style
    };

  // Acknowledge and give feedback
  await ctx.answerCbQuery(`Regenerating with ${style} style...`);
  await ctx.deleteMessage(); // Clean up previous message

  // Re-trigger the style selection, which starts the generation process.
    ctx.telegram.sendMessage(ctx.chat.id, prompt, Markup.inlineKeyboard([
        [Markup.button.callback(style, `style:${style}:${prompt}`)]
    ]));
});

// Handle "Try Different Style" request
bot.action(/tryStyle:(.+)/, async (ctx) => {
  const prompt = ctx.match[1];
  const userId = ctx.from.id;

  userSessions[userId] = {
    lastActivity: Date.now(),
    currentPrompt: prompt
  };

  // Acknowledge
  await ctx.answerCbQuery("Select a new style");

  // Re-use the style selection keyboard logic
  const styleButtons = Object.keys(styleOptions).map(style =>
    Markup.button.callback(style, `style:${style}:${prompt}`)
  );

  const keyboard = [];
  for (let i = 0; i < styleButtons.length; i += 3) {
    keyboard.push(styleButtons.slice(i, i + 3));
  }

  // Edit the existing message to show style options
  await ctx.editMessageText("🎨 Choose a different style for your image:",
    Markup.inlineKeyboard([
      ...keyboard,
      [Markup.button.callback("🎲 Random Style", `style:random:${prompt}`)]
    ])
  );
});

// --- Enhancement Logic ---

// Handle enhancement option selections
bot.action(/enhance:(.+):(.+)/, async (ctx) => {
  const enhanceType = ctx.match[1];
  const prompt = ctx.match[2];
  const userId = ctx.from.id;

  userSessions[userId] = {
    lastActivity: Date.now(),
    currentPrompt: prompt,
    enhancing: enhanceType
  };

  // Acknowledge
  await ctx.answerCbQuery(`Enhancing with ${enhanceType}...`);

  // Enhancement logic
  let enhancementText = "";
  let aspectRatio = "1024x1024"; // Default

  switch (enhanceType) {
    case "resolution":
      enhancementText = ", ultra high resolution, 8K UHD, extremely detailed, sharp focus";
      break;
    case "colors":
      enhancementText = ", vibrant colors, high contrast, color grading, perfect lighting, HDR";
      break;
    case "details":
      enhancementText = ", extremely detailed, intricate details, fine textures, sharp focus, hyperdetailed";
      break;
    case "aspect":
      enhancementText = ", cinematic composition, widescreen format";
      aspectRatio = "1280x720"; // 16:9
      break;
  }

  // Show typing indicator
  ctx.telegram.sendChatAction(ctx.chat.id, "typing");

  // Send waiting message
  const waitingMsg = await ctx.reply(
    `🔄 *Enhancing image with ${enhanceType} optimization...*\n\n` +
    `🔍 *Enhancement:* Applying ${enhanceType} improvements\n` +
    `⏱️ *Estimated time:* 10-20 seconds\n\n` +
    `Your prompt: "${prompt}"`,
    { parse_mode: "Markdown" }
  );

  // Update waiting message (simulated progress)
  const updateInterval = setInterval(async () => {
    try {
      const stages = [
        "Processing image",
        "Applying enhancements",
        "Refining details",
        "Optimizing output",
        "Finalizing enhancements"
      ];
      const randomStage = stages[Math.floor(Math.random() * stages.length)];

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        waitingMsg.message_id,
        undefined,
        `🔄 *Enhancing image with ${enhanceType} optimization...*\n\n` +
        `🔍 *Status:* ${randomStage}\n` +
        `⏱️ *Estimated time:* A few more seconds\n\n` +
        `Your prompt: "${prompt}"`,
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      console.error("Error updating waiting message:", error);
      clearInterval(updateInterval);
    }
  }, 4000);

  const fullPrompt = prompt + enhancementText;

  try {
    // Show photo uploading status
    setTimeout(() => {
      ctx.telegram.sendChatAction(ctx.chat.id, "upload_photo");
    }, 8000);

    const [width, height] = aspectRatio.split('x').map(Number);
    const response = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?w=${width}&h=${height}`);

    clearInterval(updateInterval);

    if (response.ok) {
      const imageBuffer = await response.buffer();

      // Process image (remove watermark)
      const processedImage = await sharp(imageBuffer)
        .extract({
          width: width,
          height: height - 60,
          left: 0,
          top: 0
        })
        .toBuffer();

      // Save enhanced image
      const fileName = `${userId}_enhanced_${enhanceType}_${Date.now()}.jpg`;
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, processedImage);

      // Store image info
      if (!userSessions[userId].images) {
          userSessions[userId].images = [];
      }
      userSessions[userId].images.push({
        path: filePath,
        prompt: prompt,
        enhancement: enhanceType,
        timestamp: Date.now()
      });

      // Send processed image
      await ctx.replyWithPhoto({ source: processedImage }, {
        caption: `✨ *Enhanced image (${enhanceType})*\n\n` +
                `*Prompt:* "${prompt}"\n\n` +
                `🔮 Generated with advanced AI technology\n` +
                `💡 Enhancement: ${enhanceType}`,
        parse_mode: "Markdown"
      });

      // Delete waiting message
      await ctx.telegram.deleteMessage(ctx.chat.id, waitingMsg.message_id);

      // Offer further enhancement options
      const furtherEnhancementKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Try Another Enhancement', `tryEnhance:${prompt}`),
         Markup.button.callback('📥 Download High Quality', `download:${fileName}`)],
        [Markup.button.callback('🆕 Create New Image', 'new')]
      ]);

      await ctx.reply('Would you like to further enhance this image?', furtherEnhancementKeyboard);

    } else {
      clearInterval(updateInterval);
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        waitingMsg.message_id,
        undefined,
        "❌ Failed to enhance image. Please try again."
      );
    }
  } catch (error) {
    clearInterval(updateInterval);
    console.error(error);
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      waitingMsg.message_id,
      undefined,
      "❌ Enhancement failed. Please try again later."
    );
  }
});

// Handle "Try Another Enhancement" request
bot.action(/tryEnhance:(.+)/, async (ctx) => {
  const prompt = ctx.match[1];
  const userId = ctx.from.id;
    userSessions[userId] = {
        lastActivity: Date.now(),
        currentPrompt: prompt
    };

  // Acknowledge
  await ctx.answerCbQuery("Select an enhancement");

  // Offer enhancement options
  const enhancementKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🔍 Enhance Resolution', `enhance:resolution:${prompt}`),
     Markup.button.callback('🌈 Enhance Colors', `enhance:colors:${prompt}`)],
    [Markup.button.callback('✨ Add Details', `enhance:details:${prompt}`),
     Markup.button.callback('🖼️ Change Aspect Ratio', `enhance:aspect:${prompt}`)],
    [Markup.button.callback('🔄 Regenerate Image', `regenerate:random:${prompt}`)] // Added regenerate
  ]);

  await ctx.editMessageText('Select an enhancement to apply:', enhancementKeyboard);
});

// Handle download request
bot.action(/download:(.+)/, async (ctx) => {
  const fileName = ctx.match[1];
  const filePath = path.join(uploadsDir, fileName);
  const userId = ctx.from.id;

  userSessions[userId] = { lastActivity: Date.now() };

  // Acknowledge
  await ctx.answerCbQuery("Preparing download...");

  try {
    if (fs.existsSync(filePath)) {
      await ctx.replyWithDocument({ source: filePath, filename: "enhanced_image.jpg" });
      await ctx.reply("Here's your high-quality image download!");
    } else {
      await ctx.reply("Sorry, the image file is no longer available.");
    }
  } catch (error) {
    console.error("Download error:", error);
    await ctx.reply("Sorry, there was an error preparing your download.");
  }
});

// Handle new image request
bot.action('new', async (ctx) => {
  const userId = ctx.from.id;
  userSessions[userId] = { lastActivity: Date.now() };

  // Acknowledge
  await ctx.answerCbQuery("Starting new image generation");

  await ctx.reply("Please describe the new image you want to generate:");
});

// --- Bot Initialization ---

const webhookDomain = process.env.WEBHOOK_DOMAIN || "https://imagicaaa-1.onrender.com"; // Your domain
const webhookPath = "/bot-webhook"; // Keep this consistent

// Use webhooks in production, polling in development
if (process.env.NODE_ENV === 'production') {
  // Set webhook
  bot.telegram.setWebhook(`${webhookDomain}${webhookPath}`)
    .then(() => console.log('Webhook set successfully'))
    .catch(err => console.error('Failed to set webhook:', err));

  // Set up webhook endpoint
  app.use(bot.webhookCallback(webhookPath));
  console.log(`🚀 Advanced AI Image Generator is running in webhook mode on ${webhookDomain}${webhookPath}`);
} else {
  // Use polling for development
  bot.launch()
    .then(() => console.log("🚀 Advanced AI Image Generator is running in polling mode..."))
    .catch(err => console.error("Failed to start bot:", err));
}

// --- Periodic Tasks and Cleanup ---

// Periodic task to clean up old files and keep the bot active
setInterval(() => {
  // Clean up files older than 24 hours
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
        console.error("Error reading uploads directory:", err);
        return;
    }

    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
            console.error(`Error getting stats for ${file}:`, err);
            return;
        }

        if (now - stats.mtimeMs > ONE_DAY) {
          fs.unlink(filePath, err => {
            if (err) console.error(`Error deleting ${file}:`, err);
            else console.log(`Deleted old file: ${file}`);
          });
        }
      });
    });
  });

  // Send a keep-alive request
  fetch(`${webhookDomain}/ping`)
    .then(() => console.log("Periodic keep-alive ping sent"))
    .catch(err => console.error("Periodic keep-alive ping failed:", err));

}, 15 * 60 * 1000); // Every 15 minutes (adjust as needed)

// --- Graceful Shutdown ---

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
