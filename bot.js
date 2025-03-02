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
async function generateImage(prompt, ctx, style = 'hyperrealistic', width = 2048, height = 2048) {
    const chatId = ctx.chat.id;
    const messageId = ctx.message.message_id;

    try {
        // Send initial progress message
        const progressMsg = await ctx.reply("🎨 Starting image generation process...");
        generationStatus[chatId] = { messageId: progressMsg.message_id, stage: "starting" };

        // Enhanced prompt with more details
        let enhancementText = "";
        switch (style) {
            case 'realistic':
                enhancementText = ", ultra high resolution, 8K, photorealistic, professional studio lighting, cinematic composition, detailed textures";
                break;
            case 'cartoon':
                enhancementText = ", vibrant colors, high detail, cartoon style, smooth lines, playful";
                break;
            case 'anime':
                enhancementText = ", anime style, detailed eyes, vibrant colors, trending on pixiv, smooth shading";
                break;
            case 'abstract':
                enhancementText = ", abstract art, colorful, geometric shapes, modern art, high contrast";
                break;
            case 'pixelart':
                enhancementText = ", pixel art, 8-bit, retro style, video game sprite, low resolution";
                break;
            case 'cyberpunk':
                enhancementText = ", cyberpunk, neon lights, futuristic, dystopian, highly detailed";
                break;
            case 'fantasy':
                enhancementText = ", fantasy, magical, mythical creatures, epic, detailed";
                break;
            case 'steampunk':
                enhancementText = ", steampunk, Victorian era, gears, brass, intricate details";
                break;
            case 'watercolor':
                enhancementText = ", watercolor painting, soft colors, artistic, detailed brush strokes";
                break;
            case 'sketch':
                enhancementText = ", pencil sketch, detailed, monochrome, hand-drawn";
                break;
            case 'oilpainting':
                enhancementText = ", oil painting, rich colors, textured, classic art";
                break;
            case 'popart':
                enhancementText = ", pop art, vibrant, bold colors, iconic, Warhol style";
                break;
            case 'renaissance':
                enhancementText = ", renaissance painting, classic, detailed, historical";
                break;
            default:
                enhancementText = ", ultra high resolution, 8K, hyperrealistic, professional studio lighting, cinematic composition, dramatic atmosphere, detailed textures, photorealistic rendering, trending on artstation";
        }
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
        const response = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?w=${width}&h=${height}`);
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
    const availableStyles = ['hyperrealistic', 'realistic', 'cartoon', 'anime'];
    let styleOptions = availableStyles.map(style => `/${style} [prompt] - Generate image in ${style} style`).join('\n');

    await ctx.reply(
        "👋 Welcome to the Advanced AI Image Generator Bot!\n\n" +
        "Available commands:\n" +
        "🎨 /generate [prompt] - Generate an AI image\n" +
        "✨ /enhance [prompt] - Generate and enhance an AI image\n" +
        styleOptions + "\n\n" +
        "ℹ️ /help - Show help information\n" +
        "🔄 /status - Check bot status\n" +
        "⚙️ /settings - Show current settings"
    );
});

bot.help((ctx) => {
    ctx.reply(
        "🔮 How to use the bot:\n\n" +
        "1. Use /generate or /enhance followed by your description\n\n" +
        "2. For specific styles, use commands like /realistic, /cartoon, /anime\n\n" +
        "3. Wait for the AI to create your image\n\n" +
        "4. The bot will send you the enhanced result\n\n" +
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

bot.command('generate', async (ctx) => {
    // Prompt the user for input in the chat
    ctx.reply('Please enter your image prompt:');

    // Use a promise to handle the asynchronous nature of getting user input
    const getPrompt = () => {
        return new Promise((resolve) => {
            bot.on('text', (msg) => {
                bot.removeListener('text', arguments.callee); // Remove listener after first response
                resolve(msg.message.text);
            });
        });
    };

    const prompt = await getPrompt();

    if (!prompt) {
        return ctx.reply(
            '⚠️ Please provide a prompt.\n' +
            'Example: a beautiful sunset over mountains'
        );
    }

    ctx.reply('Please enter the desired image width (e.g., 1024):');

    const getWidth = () => {
        return new Promise((resolve) => {
            bot.on('text', (msg) => {
                bot.removeListener('text', arguments.callee);
                resolve(parseInt(msg.message.text));
            });
        });
    };

    const width = await getWidth();

    if (isNaN(width) || width <= 0) {
        ctx.reply('Invalid width. Using default width 2048.');
    }

    ctx.reply('Please enter the desired image height (e.g., 1024):');

    const getHeight = () => {
        return new Promise((resolve) => {
            bot.on('text', (msg) => {
                bot.removeListener('text', arguments.callee);
                resolve(parseInt(msg.message.text));
            });
        });
    };

    const height = await getHeight();

    if (isNaN(height) || height <= 0) {
        return ctx.reply('Invalid height. Using default height 2048.');
    }

    const imageBuffer = await generateImage(prompt, ctx, 'hyperrealistic', width, height);
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

['realistic', 'cartoon', 'anime'].forEach(style => {
    bot.command(style, async (ctx) => {
        const prompt = ctx.message.text.split(`/${style} `)[1];
        if (!prompt) {
            return ctx.reply(
                `⚠️ Please provide a prompt after /${style} command\n` +
                `Example: /${style} a beautiful sunset over mountains`
            );
        }

        // Send "typing" status
        ctx.sendChatAction('upload_photo');

        const imageBuffer = await generateImage(prompt, ctx, style);
        if (imageBuffer) {
            const img = await loadImage(imageBuffer);
            const canvas = createCanvas(img.width, Math.floor(img.height * 0.95)); // Crop 5% from bottom
            const ctx2d = canvas.getContext("2d");
            ctx2d.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
            const croppedImageBuffer = canvas.toBuffer("image/png");

            await ctx.replyWithPhoto(
                { source: croppedImageBuffer },
                {
                    caption: `✨ Here's your ${style} AI masterpiece!\n` +
                        "Prompt: " + prompt + "\n\n" +
                        `Use /${style} to create another image!`
                }
            );
        } else {
            await ctx.reply("❌ Image generation failed! Please try again.");
        }
    });
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
