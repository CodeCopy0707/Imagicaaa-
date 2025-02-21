import { Telegraf } from "telegraf";
import fetch from "node-fetch";
import { GoogleGenerativeAI } from "@google/generative-ai";

// API Keys from environment variables
const TELEGRAM_BOT_TOKEN = "7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g";
const HF_API_KEY = "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"; 
const GEMINI_API_KEY = "AIzaSyDc7u7wTVdDG3zP18xnELKs0HX7-hImkmc";

// Initialize AI models
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// In-memory storage with proper error handling
class Storage {
  constructor() {
    this.sessions = new Map();
    this.history = new Map();
    this.variants = new Map(); // Store image variants
    this.styles = new Map(); // Store user style preferences
  }

  updateSession(userId, data) {
    try {
      this.sessions.set(userId, {
        ...this.sessions.get(userId),
        lastActive: Date.now(),
        ...data
      });
    } catch (error) {
      console.error('Session update failed:', error);
    }
  }

  getSession(userId) {
    return this.sessions.get(userId);
  }

  addVariant(userId, originalImage, variantImage) {
    if (!this.variants.has(userId)) {
      this.variants.set(userId, new Map());
    }
    const userVariants = this.variants.get(userId);
    if (!userVariants.has(originalImage)) {
      userVariants.set(originalImage, []);
    }
    userVariants.get(originalImage).push(variantImage);
  }

  getVariants(userId, originalImage) {
    return this.variants.get(userId)?.get(originalImage) || [];
  }

  setStyle(userId, style) {
    this.styles.set(userId, style);
  }

  getStyle(userId) {
    return this.styles.get(userId) || 'default';
  }

  addToHistory(userId, data) {
    try {
      if (!this.history.has(userId)) {
        this.history.set(userId, []);
      }
      const userHistory = this.history.get(userId);
      userHistory.push({
        ...data,
        timestamp: Date.now(),
        variants: [] // Store variants for this image
      });
      
      // Keep last 10 items
      if (userHistory.length > 10) {
        userHistory.shift();
      }
    } catch (error) {
      console.error('History update failed:', error);
    }
  }

  getHistory(userId) {
    return this.history.get(userId) || [];
  }
}

const storage = new Storage();

// Enhanced Image Generator with variants
class ImageGenerator {
  constructor() {
    this.model = "stabilityai/stable-diffusion-xl-base-1.0";
    this.baseUrl = "https://api-inference.huggingface.co/models/";
    this.styles = {
      realistic: { strength: 0.7, prompt: "highly detailed, photorealistic, 8k" },
      anime: { strength: 0.8, prompt: "anime style, cel shaded, vibrant" },
      cartoon: { strength: 0.75, prompt: "cartoon style, colorful, simple" },
      oilPainting: { strength: 0.85, prompt: "oil painting, textured, artistic" },
      sketch: { strength: 0.6, prompt: "pencil sketch, detailed lines" },
      fantasy: { strength: 0.9, prompt: "fantasy art, magical, ethereal" },
      cyberpunk: { strength: 0.85, prompt: "cyberpunk style, neon, futuristic" },
      watercolor: { strength: 0.7, prompt: "watercolor painting, soft, flowing" },
      pop: { strength: 0.8, prompt: "pop art style, bold colors" },
      minimalist: { strength: 0.5, prompt: "minimalist style, clean lines" }
    };
  }

  async generate(prompt, options = {}) {
    try {
      const style = this.styles[options.style] || this.styles.realistic;
      const enhancedPrompt = `${prompt}, ${style.prompt}`;

      const response = await fetch(`${this.baseUrl}${this.model}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HF_API_KEY}`,
        },
        body: JSON.stringify({
          inputs: enhancedPrompt,
          parameters: {
            negative_prompt: options.negativePrompt || "low quality, blurry, distorted, ugly, bad anatomy",
            quality: options.quality || "high",
            guidance_scale: options.guidanceScale || style.strength * 10,
            num_inference_steps: options.steps || 50,
            seed: options.seed || Math.floor(Math.random() * 1000000),
            width: options.width || 512,
            height: options.height || 512,
            num_images: options.numVariants || 1
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      console.error('Image generation failed:', error);
      throw error;
    }
  }

  async generateVariants(originalImage, numVariants = 4) {
    // Generate variations of the original image
    const variants = [];
    for (let i = 0; i < numVariants; i++) {
      const variant = await this.generate(originalImage, {
        seed: Math.floor(Math.random() * 1000000),
        strength: 0.7
      });
      variants.push(variant);
    }
    return variants;
  }
}

const imageGen = new ImageGenerator();

// Initialize bot with enhanced features
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Error handler middleware
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('An error occurred. Please try again later.');
});

// Enhanced start command
bot.command('start', async (ctx) => {
  try {
    const userId = ctx.from.id;
    storage.updateSession(userId, { isActive: true });
    
    await ctx.reply(
      "🎨 Welcome to Advanced AI Image Generator Pro! 🚀\n\n" +
      "Enhanced Features:\n" +
      "🖼 Ultra HD Image Generation\n" +
      "🎯 10+ Professional Art Styles\n" +
      "💫 Multiple Image Variants\n" +
      "🔄 Style Transfer & Mixing\n" +
      "📊 Advanced History Tracking\n" +
      "🎛 Custom Parameters Control\n\n" +
      "Commands:\n" +
      "/create - Start new creation\n" +
      "/styles - Browse styles\n" +
      "/variants - Generate variations\n" +
      "/history - View gallery\n" +
      "/settings - Customize options\n" +
      "/ideas - Get inspiration\n" +
      "/help - Advanced guide\n\n" +
      "Pro Tip: Use the side panel for quick access to all features!"
    );

    // Send custom keyboard with quick access buttons
    await ctx.reply("Quick Access Menu:", {
      reply_markup: {
        keyboard: [
          ["🎨 New Creation", "✨ Generate Variants"],
          ["👨‍🎨 Change Style", "📐 Adjust Settings"],
          ["📱 Show Controls", "❓ Help Guide"]
        ],
        resize_keyboard: true,
        persistent: true
      }
    });
  } catch (error) {
    console.error('Start command failed:', error);
    ctx.reply('Failed to start. Please try again.');
  }
});

// Enhanced image generation handler with variants
bot.on('text', async (ctx) => {
  try {
    const userId = ctx.from.id;
    const prompt = ctx.message.text;

    if (prompt.startsWith('/')) return;

    storage.updateSession(userId, { lastPrompt: prompt });

    // Style detection
    const styleMatch = prompt.match(/in (\w+) style/i);
    const style = styleMatch ? styleMatch[1] : storage.getStyle(userId);

    const statusMessage = await ctx.reply(
      '🎨 Creating Your Masterpiece...\n\n' +
      `Prompt: ${prompt}\n` +
      `Style: ${style}\n` +
      'Generating multiple variations...'
    );

    // Generate main image and variants
    const mainImage = await imageGen.generate(prompt, { style });
    const variants = await imageGen.generateVariants(prompt, 3);
    
    storage.addToHistory(userId, {
      prompt,
      style,
      mainImage: mainImage.toString('base64'),
      variants: variants.map(v => v.toString('base64'))
    });

    // Send main image with inline controls
    await ctx.replyWithPhoto(
      { source: mainImage },
      {
        caption: `✨ Your Creation is Ready!\n\nPrompt: "${prompt}"\nStyle: ${style}`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Regenerate', callback_data: 'regenerate' },
              { text: '✨ More Variants', callback_data: 'variants' }
            ],
            [
              { text: '🎨 Change Style', callback_data: 'style_menu' },
              { text: '⚙️ Adjust Settings', callback_data: 'settings' }
            ],
            [
              { text: '💾 Save to Gallery', callback_data: 'save' },
              { text: '📤 Share', callback_data: 'share' }
            ]
          ]
        }
      }
    );

    // Send variants as a media group
    const mediaGroup = variants.map((variant, index) => ({
      type: 'photo',
      media: { source: variant },
      caption: `Variant ${index + 1}`
    }));

    await ctx.replyWithMediaGroup(mediaGroup);

    await ctx.telegram.deleteMessage(ctx.chat.id, statusMessage.message_id);

    // Show floating control panel
    await ctx.reply("🎛 Control Panel", {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎨 Styles', callback_data: 'styles' }],
          [{ text: '📏 Dimensions', callback_data: 'dimensions' }],
          [{ text: '✨ Effects', callback_data: 'effects' }],
          [{ text: '🔍 Quality', callback_data: 'quality' }]
        ]
      }
    });

  } catch (error) {
    console.error('Image generation failed:', error);
    ctx.reply('Failed to generate image. Please try again later.');
  }
});

// Enhanced callback query handler
bot.action(/.*/, async (ctx) => {
  try {
    const action = ctx.match[0];
    const userId = ctx.from.id;
    
    switch(action) {
      case 'regenerate':
        const session = storage.getSession(userId);
        if (session?.lastPrompt) {
          await ctx.answerCbQuery('Generating new versions...');
          await ctx.deleteMessage();
          const image = await imageGen.generate(session.lastPrompt);
          const variants = await imageGen.generateVariants(session.lastPrompt, 2);
          await ctx.replyWithPhoto({ source: image });
          await ctx.replyWithMediaGroup(variants.map(v => ({
            type: 'photo',
            media: { source: v }
          })));
        }
        break;

      case 'variants':
        await ctx.answerCbQuery('Creating variations...');
        const variants = await imageGen.generateVariants(storage.getSession(userId)?.lastPrompt, 4);
        await ctx.replyWithMediaGroup(variants.map(v => ({
          type: 'photo',
          media: { source: v }
        })));
        break;

      case 'style_menu':
        await ctx.answerCbQuery('Style selection...');
        await ctx.reply('Choose a Style:', {
          reply_markup: {
            inline_keyboard: Object.keys(imageGen.styles).map(style => ([
              { text: style.charAt(0).toUpperCase() + style.slice(1), callback_data: `style_${style}` }
            ]))
          }
        });
        break;

      // Add more handlers for other actions...
    }
  } catch (error) {
    console.error('Callback query failed:', error);
    ctx.answerCbQuery('An error occurred. Please try again.');
  }
});

// Start health checks
const healthCheck = new HealthCheck();
healthCheck.start();

// Launch bot
bot.launch()
  .then(() => console.log('🚀 Advanced Image Generator Bot is running...'))
  .catch(error => console.error('Bot launch failed:', error));

// Enable graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

