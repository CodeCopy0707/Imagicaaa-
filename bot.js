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

bot.start((ctx) => ctx.reply("👋 Welcome! Send me a prompt to generate an image."));

bot.on('text', async (ctx) => {
    const prompt = ctx.message.text;
    ctx.reply("🎨 Generating image... Please wait!");

    try {
        const response = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${HF_API_KEY}`
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: { quality: 'standard' }
            }),
        });

        if (!response.ok) throw new Error('Failed to generate image!');

        const buffer = await response.arrayBuffer();
        await ctx.replyWithPhoto({ source: Buffer.from(buffer) });

    } catch (error) {
        console.error("Error:", error);
        ctx.reply("❌ Failed to generate image. Try again!");
    }
});

// Start Long Polling (No Need for ngrok)
bot.launch();
console.log("🚀 Bot started using long polling...");

app.get('/', (req, res) => res.send('🤖 Telegram Bot is Running...'));
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
