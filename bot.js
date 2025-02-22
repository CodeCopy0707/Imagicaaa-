import express from 'express';
import { Telegraf } from 'telegraf';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';


// ✅ Load Environment Variables


const TELEGRAM_BOT_TOKEN = '7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g';
const HF_API_KEY ='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';
const GEMINI_API_KEY = 'AIzaSyDc7u7wTVdDG3zP18xnELKs0HX7-hImkmc';
const PORT = 3000;
const SERVER_URL = "https://imagicaaa-1.onrender.com";

// ✅ Initialize Express & Bot
const app = express();
app.use(bodyParser.json());

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// 🔹 Bot Commands
bot.start((ctx) => ctx.reply(
    "👋 Welcome to AI Bot!\n\n" +
    "📸 /image <prompt> - Generate AI Image\n" +
    "💬 /chat <message> - Chat with AI\n"
));

// 🎨 AI Image Generation Function
async function generateImage(prompt) {
    try {
        const response = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HF_API_KEY}`
            },
            body: JSON.stringify({ inputs: prompt })
        });

        if (!response.ok) throw new Error(`Failed with status: ${response.status}`);

        return await response.arrayBuffer();
    } catch (error) {
        console.error("❌ Image Generation Error:", error);
        return null;
    }
}

// 📸 Handle /image Command
bot.command('image', async (ctx) => {
    const prompt = ctx.message.text.replace('/image ', '').trim();
    if (!prompt) return ctx.reply("❌ Please provide a prompt. Example: /image cyberpunk city");

    ctx.reply("🎨 Generating image...");
    const image = await generateImage(prompt);
    if (image) {
        await ctx.replyWithPhoto({ source: Buffer.from(image) });
    } else {
        ctx.reply("❌ Image generation failed!");
    }
});

// 💬 AI Chat Function Using Gemini API
async function chatWithGemini(message) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateText?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: message })
        });

        const data = await response.json();
        return data.candidates?.[0]?.output || "🤖 AI is unable to respond!";
    } catch (error) {
        console.error("❌ Chat AI Error:", error);
        return "❌ AI Chat is not available right now!";
    }
}

// 💬 Handle /chat Command
bot.command('chat', async (ctx) => {
    const message = ctx.message.text.replace('/chat ', '').trim();
    if (!message) return ctx.reply("💬 Please send a message. Example: /chat How are you?");

    ctx.reply("🤖 Thinking...");
    const reply = await chatWithGemini(message);
    ctx.reply(reply);
});

// 🔄 Keep Bot Alive (Prevent Render Sleep)
setInterval(() => {
    fetch(SERVER_URL)
        .then(() => console.log(`✅ Keep-alive ping sent to ${SERVER_URL}`))
        .catch(err => console.error("❌ Keep-alive failed:", err));
}, 25000); // Ping every 25 sec

// 🚀 Auto-Restart if Bot Crashes
process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:", err);
    console.log("🔄 Restarting bot...");
    setTimeout(() => process.exit(1), 1000);
});

// 🌍 Express Server for Hosting
app.get('/', (req, res) => res.send('🤖 AI Telegram Bot is Running...'));
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// 🚀 Start Bot
console.log("🚀 Bot started using long polling...");
