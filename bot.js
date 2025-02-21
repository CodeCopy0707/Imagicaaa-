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

  addToHistory(userId, data) {
    try {
      if (!this.history.has(userId)) {
        this.history.set(userId, []);
      }
      const userHistory = this.history.get(userId);
      userHistory.push({
        ...data,
        timestamp: Date.now()
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

// Health check service
class HealthCheck {
  constructor() {
    this.endpoints = [
      process.env.APP_URL || 'https://imagicaaa-1.onrender.com'
    ];
    this.interval = 30000; // 30 seconds
  }

  start() {
    this.endpoints.forEach(endpoint => {
      setInterval(async () => {
        try {
          const response = await fetch(endpoint);
          if (!response.ok) {
            console.error(`Health check failed for ${endpoint}`);
          }
        } catch (error) {
          console.error(`Health check error for ${endpoint}:`, error);
        }
      }, this.interval);
    });
  }
}

// Image generation service
class ImageGenerator {
  constructor() {
    this.model = "stabilityai/stable-diffusion-xl-base-1.0";
    this.baseUrl = "https://api-inference.huggingface.co/models/";
  }

  async generate(prompt, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${this.model}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HF_API_KEY}`,
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            negative_prompt: options.negativePrompt || "low quality, blurry, distorted, ugly, bad anatomy",
            quality: options.quality || "high",
            guidance_scale: options.guidanceScale || 7.5,
            num_inference_steps: options.steps || 50,
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
}

const imageGen = new ImageGenerator();

// Initialize bot
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Error handler middleware
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('An error occurred. Please try again later.');
});

// Start command
bot.command('start', async (ctx) => {
  try {
    const userId = ctx.from.id;
    storage.updateSession(userId, { isActive: true });
    
    await ctx.reply(
      "🎨 Welcome to AI Image Generator Pro! 🚀\n\n" +
      "Features:\n" +
      "🖼 High-quality image generation\n" +
      "🎯 Multiple artistic styles\n" +
      "💡 Smart suggestions\n" +
      "🔄 Image variations\n" +
      "📊 History tracking\n\n" +
      "Commands:\n" +
      "/create - Generate new image\n" +
      "/styles - View styles\n" +
      "/history - View history\n" +
      "/ideas - Get creative ideas\n" +
      "/help - Get help\n\n" +
      "Send a description to start!"
    );
  } catch (error) {
    console.error('Start command failed:', error);
    ctx.reply('Failed to start. Please try again.');
  }
});

// Ideas command handler
bot.command('ideas', async (ctx) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro"});
    const prompt = "Give me 5 creative image generation ideas. Keep them short and interesting.";
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    await ctx.reply(text);
  } catch (error) {
    console.error('Ideas generation failed:', error);
    ctx.reply('Failed to generate ideas. Please try again.');
  }
});

// Styles command handler
bot.command('styles', async (ctx) => {
  try {
    await ctx.reply(
      "Available Styles:\n\n" +
      "🎨 Realistic\n" +
      "🖌 Anime\n" +
      "🎭 Cartoon\n" +
      "🖼 Oil Painting\n" +
      "✏️ Sketch\n" +
      "🌟 Fantasy\n\n" +
      "Use 'in [style] style' in your prompt to apply a style!"
    );
  } catch (error) {
    console.error('Styles command failed:', error);
    ctx.reply('Failed to show styles. Please try again.');
  }
});

// History command handler
bot.command('history', async (ctx) => {
  try {
    const userId = ctx.from.id;
    const history = storage.getHistory(userId);
    
    if (!history || history.length === 0) {
      await ctx.reply("You haven't generated any images yet!");
      return;
    }

    const historyText = history
      .map((item, index) => `${index + 1}. "${item.prompt}" (${item.style})`)
      .join('\n');

    await ctx.reply(
      "Your Recent Generations:\n\n" + historyText
    );
  } catch (error) {
    console.error('History command failed:', error);
    ctx.reply('Failed to show history. Please try again.');
  }
});

// Help command handler
bot.command('help', async (ctx) => {
  try {
    await ctx.reply(
      "🤖 Bot Help Guide:\n\n" +
      "1. To generate an image:\n" +
      "   - Simply send your description\n" +
      "   - Add 'in [style] style' for specific styles\n\n" +
      "2. Commands:\n" +
      "   /create - Start new generation\n" +
      "   /styles - View available styles\n" +
      "   /history - View your generations\n" +
      "   /ideas - Get creative suggestions\n\n" +
      "3. Tips:\n" +
      "   - Be specific in your descriptions\n" +
      "   - Try different styles\n" +
      "   - Use the variation button for alternatives\n\n" +
      "Need more help? Contact @support"
    );
  } catch (error) {
    console.error('Help command failed:', error);
    ctx.reply('Failed to show help. Please try again.');
  }
});

// Create command handler
bot.command('create', async (ctx) => {
  try {
    await ctx.reply(
      "🎨 Let's create something amazing!\n\n" +
      "Send me a description of what you want to generate.\n" +
      "For example:\n" +
      "- A sunset over mountains in oil painting style\n" +
      "- A cute cat in anime style\n" +
      "- A futuristic city in realistic style"
    );
  } catch (error) {
    console.error('Create command failed:', error);
    ctx.reply('Failed to start creation. Please try again.');
  }
});

// Image generation handler
bot.on('text', async (ctx) => {
  try {
    const userId = ctx.from.id;
    const prompt = ctx.message.text;

    if (prompt.startsWith('/')) return;

    storage.updateSession(userId, { lastPrompt: prompt });

    // Style detection
    const styleMatch = prompt.match(/in (\w+) style/i);
    const style = styleMatch ? styleMatch[1] : 'default';

    const statusMessage = await ctx.reply(
      '🎨 Processing...\n\n' +
      `Prompt: ${prompt}\n` +
      `Style: ${style}\n` +
      'Please wait...'
    );

    const image = await imageGen.generate(prompt);
    
    storage.addToHistory(userId, {
      prompt,
      style,
      image: image.toString('base64')
    });

    await ctx.replyWithPhoto(
      { source: image },
      {
        caption: `✨ Here's your creation!\n\nPrompt: "${prompt}"\nStyle: ${style}`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Generate Again', callback_data: 'regenerate' },
              { text: '💡 More Ideas', callback_data: 'ideas' }
            ],
            [
              { text: '🎨 Change Style', callback_data: 'styles' },
              { text: '❓ Help', callback_data: 'help' }
            ]
          ]
        }
      }
    );

    await ctx.telegram.deleteMessage(ctx.chat.id, statusMessage.message_id);
  } catch (error) {
    console.error('Image generation failed:', error);
    ctx.reply('Failed to generate image. Please try again later.');
  }
});

// Handle callback queries
bot.action(['regenerate', 'ideas', 'styles', 'help'], async (ctx) => {
  try {
    const action = ctx.match[0];
    
    switch(action) {
      case 'regenerate':
        const userId = ctx.from.id;
        const session = storage.getSession(userId);
        if (session?.lastPrompt) {
          await ctx.answerCbQuery('Generating new version...');
          await ctx.deleteMessage();
          await ctx.reply(`Regenerating: "${session.lastPrompt}"`);
          const image = await imageGen.generate(session.lastPrompt);
          await ctx.replyWithPhoto({ source: image });
        }
        break;
        
      case 'ideas':
        await ctx.answerCbQuery('Getting ideas...');
        await ctx.deleteMessage();
        ctx.command('ideas');
        break;
        
      case 'styles':
        await ctx.answerCbQuery('Showing styles...');
        await ctx.deleteMessage();
        ctx.command('styles');
        break;
        
      case 'help':
        await ctx.answerCbQuery('Showing help...');
        await ctx.deleteMessage();
        ctx.command('help');
        break;
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
  .then(() => console.log('🚀 Bot is running...'))
  .catch(error => console.error('Bot launch failed:', error));

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
