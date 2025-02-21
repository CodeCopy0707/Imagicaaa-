import express from 'express';
import { Telegraf } from 'telegraf';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());

const TELEGRAM_BOT_TOKEN = '7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g';
const HF_API_KEY = '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';
// const TELEGRAM_BOT_TOKEN = '';
const GEMINI_API_KEY = 'AIzaSyDc7u7wTVdDG3zP18xnELKs0HX7-hImkmc';
// const HF_API_KEY = 'YOUR_HUGGINGFACE_API_KEY';
const PORT = process.env.PORT || 3000;

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// 🏁 Bot Start
bot.start((ctx) => ctx.reply(
    "👋 Welcome to the AI Bot! Use these commands:\n\n" +
    "📸 /image <prompt> - Generate AI image\n" +
    "🎭 /style <prompt> - Generate image in a specific style\n" +
    "🔄 /regen - Regenerate last image\n" +
    "🎨 /variants <prompt> - Generate multiple image versions\n" +
    "🔍 /upscale - Improve image quality\n" +
    "💬 /chat <message> - Chat with AI\n"
));


// 🖼️ Generate AI Image (Advanced Features)
async function generateImage(prompt, style = "realistic", negativePrompt = "") {
    try {
        const response = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HF_API_KEY}`
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    style,  // Different styles: 'realistic', 'anime', '3d', 'digital painting'
                    negative_prompt: negativePrompt, // Avoid unwanted elements
                    quality: 'high'
                }
            }),
        });

        if (!response.ok) throw new Error('Failed to generate image!');
        return await response.arrayBuffer();
    } catch (error) {
        console.error("Error:", error);
        return null;
    }
}

// 📸 Image Generation Command
bot.command('image', async (ctx) => {
    const prompt = ctx.message.text.replace('/image ', '');
    if (!prompt) return ctx.reply("❌ Please provide a prompt. Example: /image cyberpunk city");

    ctx.reply("🎨 Generating image... Please wait!");
    const image = await generateImage(prompt);
    if (image) await ctx.replyWithPhoto({ source: Buffer.from(image) });
    else ctx.reply("❌ Image generation failed. Try again!");
});

// 🎭 Style-Based Image Generation
bot.command('style', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const style = args[1];
    const prompt = args.slice(2).join(' ');

    if (!style || !prompt) return ctx.reply("❌ Usage: /style <style> <prompt>\nExample: /style anime warrior with sword");

    ctx.reply(`🎭 Generating ${style} style image...`);
    const image = await generateImage(prompt, style);
    if (image) await ctx.replyWithPhoto({ source: Buffer.from(image) });
    else ctx.reply("❌ Failed to generate style image. Try again!");
});

// 🔄 Regenerate Last Image
let lastPrompt = "";
bot.command('regen', async (ctx) => {
    if (!lastPrompt) return ctx.reply("❌ No previous image found.");
    
    ctx.reply("🔄 Regenerating image...");
    const image = await generateImage(lastPrompt);
    if (image) await ctx.replyWithPhoto({ source: Buffer.from(image) });
    else ctx.reply("❌ Regeneration failed. Try again!");
});

// 🎨 Generate Multiple Variants
bot.command('variants', async (ctx) => {
    const prompt = ctx.message.text.replace('/variants ', '');
    if (!prompt) return ctx.reply("❌ Please provide a prompt. Example: /variants futuristic city");

    ctx.reply("🖼️ Generating multiple variations... Please wait!");
    for (let i = 0; i < 3; i++) { // Generate 3 variations
        const image = await generateImage(prompt);
        if (image) await ctx.replyWithPhoto({ source: Buffer.from(image) });
    }
});

// 🔍 Upscale Image (Placeholder)
bot.command('upscale', async (ctx) => {
    ctx.reply("🔍 Upscaling feature coming soon...");
});

// 💬 AI Chat Using Gemini
async function chatWithGemini(message) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateText?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: message })
        });

        const data = await response.json();
        return data.candidates?.[0]?.output || "🤖 I couldn't understand. Try again!";
    } catch (error) {
        console.error("Chat AI Error:", error);
        return "❌ Chat AI is not available now. Try again later!";
    }
}

// 🔹 AI Chat Command
bot.command('chat', async (ctx) => {
    const message = ctx.message.text.replace('/chat ', '');
    if (!message) return ctx.reply("💬 Please send a message. Example: /chat How are you?");

    ctx.reply("🤖 Thinking...");
    const reply = await chatWithGemini(message);
    ctx.reply(reply);
});

// ⚡ Keep Bot Alive (Bypass Render Shutdown)
setInterval(() => {
    fetch(`https://${process.env.RENDER_EXTERNAL_URL || 'https://imagicaaa-1.onrender.com'}`)
        .then(() => console.log("✅ Keep-alive ping sent."))
        .catch(err => console.error("❌ Keep-alive failed:", err));
}, 30000);

// 🚀 Start Bot
bot.launch();
console.log("🚀 Bot started using long polling...");

// 🌍 Express Server for Render
app.get('/', (req, res) => res.send('🤖 AI Telegram Bot is Running...'));
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
