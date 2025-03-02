import { Telegraf, Markup } from "telegraf";
import fetch from "node-fetch";
import express from "express";
import sharp from "sharp";

// Create Express app and define port
const app = express();
const port = process.env.PORT || 3000;

// Admin chat ID for monitoring
const ADMIN_CHAT_ID = "749824465"; // Replace with actual admin chat ID

// Basic route to keep the server alive
app.get("/", (req, res) => {
  res.send("Bot is running!");
});

// Start Express server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const bot = new Telegraf("7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g");

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
  "3D Render": ", 3D render, octane render, detailed textures, realistic lighting, volumetric effects"
};

// Enhanced welcome message
bot.start((ctx) => {
  ctx.reply("🎨 Welcome to the Advanced AI Image Generator! 🚀\n\n" +
    "Send me a text description and I'll generate a high-quality image for you!\n\n" +
    "You can also select different styles for your image generation.");
});

// Help command
bot.help((ctx) => {
  ctx.reply("How to use this bot:\n\n" +
    "1. Send me a text description of the image you want to create\n" +
    "2. Select a style from the options that appear\n" +
    "3. Wait for your image to be generated\n\n" +
    "Available styles: Realistic, Anime, Cartoon, Oil Painting, Watercolor, Sketch, Cyberpunk, Fantasy, Vintage, Abstract, 3D Render");
});

// Image generation
bot.on("text", async (ctx) => {
  const prompt = ctx.message.text;
  const userId = ctx.from.id;
  const username = ctx.from.username || "Unknown";

  // Notify admin about the generation request
  bot.telegram.sendMessage(ADMIN_CHAT_ID, 
    `🔔 New Image Generation Request\nUser: @${username} (${userId})\nPrompt: "${prompt}"`
  );

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
  await ctx.reply("Choose a style for your image:", 
    Markup.inlineKeyboard(keyboard)
  );
});

// Handle style selection
bot.action(/style:(.+):(.+)/, async (ctx) => {
  const style = ctx.match[1];
  const prompt = ctx.match[2];
  const userId = ctx.from.id;
  const username = ctx.callbackQuery.from.username || "Unknown";
  
  // Send waiting message
  const waitingMsg = await ctx.reply(`🎨 Creating your ${style} masterpiece... Please wait!`);
  
  // Add style-specific tuning text
  const tuningText = styleOptions[style] || styleOptions["Realistic"];
  const fullPrompt = prompt + tuningText;

  try {
    const response = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?w=1024&h=1024`);
    
    if (response.ok) {
      const imageBuffer = await response.buffer();
      
      // Process image to remove watermark by cropping bottom portion
      const processedImage = await sharp(imageBuffer)
        .extract({ 
          width: 1024,
          height: 964, // Crop 60 pixels from bottom to remove watermark
          left: 0,
          top: 0
        })
        .toBuffer();

      // Send processed image
      await ctx.replyWithPhoto({ source: processedImage }, {
        caption: `🎨 Here's your ${style} creation!\n\nPrompt: "${prompt}"\n\n✨ Generated with advanced AI technology`
      });

      // Delete waiting message
      ctx.telegram.deleteMessage(ctx.chat.id, waitingMsg.message_id);

      // Notify admin about successful generation
      bot.telegram.sendMessage(ADMIN_CHAT_ID,
        `✅ Image Generated Successfully\nUser: @${username} (${userId})\nStyle: ${style}\nPrompt: "${prompt}"`
      );

      // Offer enhancement options
      const enhancementKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔍 Enhance Resolution', `enhance:resolution:${prompt}`),
         Markup.button.callback('🌈 Enhance Colors', `enhance:colors:${prompt}`)],
        [Markup.button.callback('✨ Add Details', `enhance:details:${prompt}`),
         Markup.button.callback('🖼️ Change Aspect Ratio', `enhance:aspect:${prompt}`)]
      ]);
      
      await ctx.reply('Would you like to enhance this image?', enhancementKeyboard);

    } else {
      ctx.reply("❌ Failed to generate image. Please try again.");
      bot.telegram.sendMessage(ADMIN_CHAT_ID,
        `❌ Generation Failed\nUser: @${username} (${userId})\nStyle: ${style}\nPrompt: "${prompt}"`
      );
    }

  } catch (error) {
    console.error(error);
    ctx.reply("❌ Generation failed. Please try again or check your prompt.");
    bot.telegram.sendMessage(ADMIN_CHAT_ID,
      `❌ Error in Generation\nUser: @${username} (${userId})\nStyle: ${style}\nPrompt: "${prompt}"\nError: ${error.message}`
    );
  }
});

// Handle enhancement options
bot.action(/enhance:(.+):(.+)/, async (ctx) => {
  const enhanceType = ctx.match[1];
  const prompt = ctx.match[2];
  
  // Different enhancement logic based on type
  let enhancementText = "";
  let aspectRatio = "1024x1024";
  
  switch(enhanceType) {
    case "resolution":
      enhancementText = ", ultra high resolution, 8K UHD, extremely detailed";
      break;
    case "colors":
      enhancementText = ", vibrant colors, high contrast, color grading, perfect lighting";
      break;
    case "details":
      enhancementText = ", extremely detailed, intricate details, fine textures, sharp focus";
      break;
    case "aspect":
      enhancementText = ", cinematic composition";
      aspectRatio = "1024x768"; // 4:3 aspect ratio
      break;
  }
  
  // Send waiting message
  const waitingMsg = await ctx.reply(`🔄 Enhancing image with ${enhanceType} optimization... Please wait!`);
  
  const fullPrompt = prompt + enhancementText;
  
  try {
    const [width, height] = aspectRatio.split('x').map(Number);
    const response = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?w=${width}&h=${height}`);
    
    if (response.ok) {
      const imageBuffer = await response.buffer();
      
      // Process image to remove watermark
      const processedImage = await sharp(imageBuffer)
        .extract({ 
          width: width,
          height: height - 60, // Crop 60 pixels from bottom to remove watermark
          left: 0,
          top: 0
        })
        .toBuffer();

      // Send processed image
      await ctx.replyWithPhoto({ source: processedImage }, {
        caption: `✨ Enhanced image (${enhanceType})\n\nPrompt: "${prompt}"\n\n🔮 Generated with advanced AI technology`
      });

      // Delete waiting message
      ctx.telegram.deleteMessage(ctx.chat.id, waitingMsg.message_id);
    } else {
      ctx.reply("❌ Failed to enhance image. Please try again.");
    }
  } catch (error) {
    console.error(error);
    ctx.reply("❌ Enhancement failed. Please try again later.");
  }
});

// Initialize bot
bot.launch().then(() => console.log("🚀 Advanced AI Image Generator is running..."));

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
