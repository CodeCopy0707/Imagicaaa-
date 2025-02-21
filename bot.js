import { Telegraf } from "telegraf";
import fetch from "node-fetch";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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
      "/help - Get help\n\n" +
      "Send a description to start!"
    );
  } catch (error) {
    console.error('Start command failed:', error);
    ctx.reply('Failed to start. Please try again.');
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

    await ctx.reply(
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
              { text: '🔄 Variations', callback_data: 'variations' },
              { text: '💡 Ideas', callback_data: 'ideas' }
            ],
            [
              { text: '🎨 Styles', callback_data: 'styles' },
              { text: '💾 Save', callback_data: 'save' }
            ]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Image generation failed:', error);
    ctx.reply('Failed to generate image. Please try again.');
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
