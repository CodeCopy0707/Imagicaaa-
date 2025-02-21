const express = require("express");
const fetch = require("node-fetch");
const { Telegraf } = require("telegraf");
require("dotenv").config();

const app = express();
app.use(express.json());

const BOT_TOKEN = '7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g';
const HF_API_KEY = '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';
const ADMIN_CHAT_ID =7498724465;
const DOMAIN = process.env.DOMAIN; // Your server domain
const bot = new Telegraf(BOT_TOKEN);

// Set Telegram Webhook
bot.telegram.setWebhook(`${DOMAIN}/bot${BOT_TOKEN}`);
app.use(bot.webhookCallback(`/bot${BOT_TOKEN}`));

// Hugging Face API URL
const HF_API_URL = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev";

// Function to generate image
async function generateImage(prompt) {
    try {
        console.log("Generating image for prompt:", prompt);
        
        const response = await fetch(HF_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${HF_API_KEY}`,
            },
            body: JSON.stringify({ inputs: prompt }),
        });

        const data = await response.json();
        console.log("HF API Response:", data);

        if (!response.ok || !data) {
            throw new Error(data.error || "Failed to generate image");
        }

        return Buffer.from(data.image, "base64");
    } catch (error) {
        console.error("Error generating image:", error.message);
        return null;
    }
}

// Web API Route
app.post("/generate", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    const image = await generateImage(prompt);
    if (!image) return res.status(500).json({ error: "Image generation failed" });

    res.setHeader("Content-Type", "image/png");
    res.send(image);
});

// Telegram Bot Commands
bot.start((ctx) => ctx.reply("👋 Welcome! Send me a text prompt to generate an AI image."));
bot.help((ctx) => ctx.reply("🤖 Send me any text, and I will generate an AI image for you!"));

bot.on("text", async (ctx) => {
    const prompt = ctx.message.text;
    const userId = ctx.message.from.id;
    const username = ctx.message.from.username || "Unknown";

    ctx.reply("⏳ Generating your AI image...");
    await bot.telegram.sendMessage(ADMIN_CHAT_ID, `📩 New Request from @${username} (ID: ${userId}):\n${prompt}`);

    const image = await generateImage(prompt);
    if (!image) {
        await bot.telegram.sendMessage(ADMIN_CHAT_ID, `⚠️ Image generation failed for @${username}.`);
        return ctx.reply("❌ Failed to generate image. Please try again later.");
    }

    ctx.replyWithPhoto({ source: image });
    await bot.telegram.sendPhoto(ADMIN_CHAT_ID, { source: image }, { caption: `✅ Image generated for @${username}` });
});

// Start Express Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
