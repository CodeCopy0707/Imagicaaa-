import express from 'express';
import { Telegraf } from 'telegraf';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());

const TELEGRAM_BOT_TOKEN = '7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g';
const HF_API_KEY = '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';
const PORT = process.env.PORT || 3000;

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// Welcome Message
bot.start((ctx) => ctx.reply("👋 Welcome! Send me a prompt to generate an image or use commands:\n\n" +
    "/image <prompt> - Generate an AI image\n" +
    "/upscale - Upscale an image\n" +
    "/describe - Get an image description\n" +
    "/chat - Talk to AI"
));

// Generate AI Image
bot.command('image', async (ctx) => {
    const prompt = ctx.message.text.replace('/image ', '');
    if (!prompt) return ctx.reply("❌ Please provide a prompt. Example: /image futuristic city");

    ctx.reply("🎨 Generating image... Please wait!");
    try {
        const response = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HF_API_KEY}`
            },
            body: JSON.stringify({ inputs: prompt, parameters: { quality: 'standard' } }),
        });

        if (!response.ok) throw new Error('Failed to generate image!');
        const buffer = await response.arrayBuffer();
        await ctx.replyWithPhoto({ source: Buffer.from(buffer) });
    } catch (error) {
        console.error("Error:", error);
        ctx.reply("❌ Failed to generate image. Try again!");
    }
});

// Upscale Image (Placeholder API)
bot.command('upscale', async (ctx) => {
    ctx.reply("🔍 Upscaling feature coming soon...");
});

// Describe Image (Placeholder API)
bot.command('describe', async (ctx) => {
    ctx.reply("📜 Image description feature coming soon...");
});

// Chat with AI
bot.command('chat', async (ctx) => {
    const message = ctx.message.text.replace('/chat ', '');
    if (!message) return ctx.reply("💬 Please send a message. Example: /chat How are you?");

    ctx.reply("🤖 Thinking...");
    try {
        const response = await fetch('https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HF_API_KEY}`
            },
            body: JSON.stringify({ inputs: message }),
        });

        const result = await response.json();
        ctx.reply(result.generated_text || "🤖 I couldn't understand. Try again!");
    } catch (error) {
        console.error("Chat AI Error:", error);
        ctx.reply("❌ Chat AI is not available now. Try again later!");
    }
});

// Keep Bot Alive (Bypass Render Shutdown)
setInterval(() => {
    fetch(`https://${process.env.RENDER_EXTERNAL_URL || 'https://imagicaaa-1.onrender.com'}`)
        .then(() => console.log("✅ Keep-alive ping sent."))
        .catch(err => console.error("❌ Keep-alive failed:", err));
}, 30000); // Ping every 30s

// Start Bot
bot.launch();
console.log("🚀 Bot started using long polling...");

// Express Server
app.get('/', (req, res) => res.send('🤖 Telegram Bot is Running...'));
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
