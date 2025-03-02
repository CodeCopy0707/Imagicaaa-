const { Telegraf } = require('telegraf');
const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");

// 🚀 **Telegram Bot Setup**
const BOT_TOKEN = "7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g";
const bot = new Telegraf(BOT_TOKEN);

// Keep alive mechanism - Increased ping interval to prevent inactivity timeout
const PING_INTERVAL = 60000; // 60 seconds - Increased to avoid 40-second timeout
setInterval(() => {
    fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/getMe")
        .catch(err => console.log("Keep alive ping failed:", err));
}, PING_INTERVAL);

const app = express();
app.use(express.json());

// In-memory storage for tracking generation status (alternative to a database for simplicity)
const generationStatus = {};

// Enhanced image generation with progress updates
async function generateImage(prompt, ctx) {
    const chatId = ctx.chat.id;
    const messageId = ctx.message.message_id;

    try {
        // Send initial progress message
        const progressMsg = await ctx.reply("🎨 Starting image generation process...");
        generationStatus[chatId] = { messageId: progressMsg.message_id, stage: "starting" };

        // Enhanced prompt with more details
        const enhancementText = ", ultra high resolution, 8K, hyperrealistic, professional studio lighting, cinematic composition, dramatic atmosphere, detailed textures, photorealistic rendering, trending on artstation";
        prompt += enhancementText;

        // Update progress
        await ctx.telegram.editMessageText(
            chatId,
            generationStatus[chatId].messageId,
            null,
            "🔄 Connecting to AI service..."
        );
        generationStatus[chatId].stage = "connecting";

        // Fetch image with enhanced quality
        const response = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?w=2048&h=2048`);
        if (!response.ok) throw new Error("Failed to generate image from AI service");

        await ctx.telegram.editMessageText(
            chatId,
            generationStatus[chatId].messageId,
            null,
            "⚙️ Processing image..."
        );
        generationStatus[chatId].stage = "processing";

        const imageUrl = response.url;
        const imageBuffer = await fetch(imageUrl).then(res => res.buffer());

        // Enhanced image processing
        const img = await loadImage(imageBuffer);
        const cropHeight = Math.floor(img.height * 0.85); // Remove watermark more precisely
        const canvas = createCanvas(img.width, cropHeight);
        const ctx2d = canvas.getContext("2d");

        // Apply image enhancements
        ctx2d.drawImage(img, 0, 0, img.width, cropHeight, 0, 0, img.width, cropHeight);
        ctx2d.globalCompositeOperation = 'overlay';
        ctx2d.fillStyle = 'rgba(255,255,255,0.15)'; // Slightly stronger overlay
        ctx2d.fillRect(0, 0, canvas.width, canvas.height);

        // Add a subtle border
        ctx2d.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx2d.lineWidth = 3;
        ctx2d.strokeRect(0, 0, canvas.width, canvas.height);

        // Delete progress message
        await ctx.telegram.deleteMessage(chatId, generationStatus[chatId].messageId);
        delete generationStatus[chatId];

        return canvas.toBuffer("image/png");
    } catch (error) {
        console.error("❌ Error in image generation:", error);
        if (generationStatus[chatId] && generationStatus[chatId].messageId) {
            try {
                await ctx.telegram.editMessageText(
                    chatId,
                    generationStatus[chatId].messageId,
                    null,
                    "❌ Image generation failed! Please try again."
                );
            } catch (editError) {
                console.error("Failed to edit error message:", editError);
                await ctx.reply("❌ Image generation failed! Please try again.");
            }
            delete generationStatus[chatId];
        } else {
            await ctx.reply("❌ Image generation failed! Please try again.");
        }
        return null;
    }
}

// Enhanced bot commands
bot.start(async (ctx) => {
    await ctx.reply(
        "👋 Welcome to the Advanced AI Image Generator Bot!\n\n" +
        "Available commands:\n" +
        "🎨 /generate [prompt] - Generate an AI image\n" +
        "ℹ️ /help - Show help information\n" +
        "🔄 /status - Check bot status\n" +
        "⚙️ /settings - Show current settings\n" +
	    "✨ /enhance [prompt] - Generate and enhance an AI image"
    );
});

bot.help((ctx) => {
    ctx.reply(
        "🔮 How to use the bot:\n\n" +
        "1. Use /generate followed by your description\n\n" +
        "2. Wait for the AI to create your image\n\n" +
        "3. The bot will send you the enhanced result\n\n" +
        "Tips for better results:\n\n" +
        "- Be specific in your descriptions\n\n" +
        "- Include style preferences\n\n" +
        "- Mention colors and moods"
    );
});

bot.command('status', (ctx) => {
    ctx.reply("✅ Bot is running normally\n🔄 Last ping: " + new Date().toLocaleString());
});

bot.settings((ctx) => {
    ctx.reply(
        "⚙️ Current Settings:\n" +
        "Image Resolution: 2048x2048\n" +
        "Enhancement Level: Maximum\n" +
        "Auto-Improvement: Enabled"
    );
});

bot.generate(async (ctx) => {
    const prompt = ctx.message.text.split('/generate ')[1];
    if (!prompt) {
        return ctx.reply(
            '⚠️ Please provide a prompt after /generate command\n' +
            'Example: /generate a beautiful sunset over mountains'
        );
    }

    const imageBuffer = await generateImage(prompt, ctx);
    if (imageBuffer) {
        const img = await loadImage(imageBuffer);
        const canvas = createCanvas(img.width, Math.floor(img.height * 0.95)); // Crop 5% from bottom
        const ctx2d = canvas.getContext("2d");
        ctx2d.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
        const croppedImageBuffer = canvas.toBuffer("image/png");

        await ctx.replyWithPhoto(
            { source: croppedImageBuffer },
            {
                caption: "🎨 Here's your AI masterpiece!\n" +
                    "Prompt: " + prompt + "\n\n" +
                    "Use /generate to create another image!"
            }
        );
    } else {
        await ctx.reply("❌ Image generation failed! Please try again.");
    }
});

bot.command('enhance', async (ctx) => {
    const prompt = ctx.message.text.split('/enhance ')[1];
    if (!prompt) {
        return ctx.reply(
            '⚠️ Please provide a prompt after /enhance command\n' +
            'Example: /enhance a beautiful sunset over mountains'
        );
    }

    // Send "typing" status
    ctx.sendChatAction('upload_photo');

    const imageBuffer = await generateImage(prompt, ctx);
    if (imageBuffer) {
        const img = await loadImage(imageBuffer);
        const canvas = createCanvas(img.width, Math.floor(img.height * 0.95)); // Crop 5% from bottom
        const ctx2d = canvas.getContext("2d");
        ctx2d.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
        const croppedImageBuffer = canvas.toBuffer("image/png");

        await ctx.replyWithPhoto(
            { source: croppedImageBuffer },
            {
                caption: "✨ Here's your enhanced AI masterpiece!\n" +
                    "Prompt: " + prompt + "\n\n" +
                    "Use /enhance to create another image!"
            }
        );
    } else {
        await ctx.reply("❌ Image generation failed! Please try again.");
    }
});

// Error handling
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply("⚠️ An error occurred. Please try again later.");
});

// Start the bot with error handling
bot.launch().catch(err => {
    console.error('Failed to start bot:', err);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Enhanced Express server
const PORT = process.env.PORT || 3000;
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', uptime: process.uptime() });
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
