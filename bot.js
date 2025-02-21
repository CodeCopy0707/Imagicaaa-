const express = require("express");
const fetch = require("node-fetch");
const { Telegraf } = require("telegraf");
require("dotenv").config();

const app = express();
app.use(express.json());

const BOT_TOKEN = '7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g'
const HF_API_KEY = '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'
const bot = new Telegraf(BOT_TOKEN);

// Hugging Face API URL
const HF_API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";

// Function to generate image with error handling and logging
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

        return Buffer.from(data.image, "base64"); // Ensure correct response format
    } catch (error) {
        console.error("Error generating image:", error.message);
        return null;
    }
}

// **1️⃣ Web API Route**
app.post("/generate", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    const image = await generateImage(prompt);
    if (!image) return res.status(500).json({ error: "Image generation failed" });

    res.setHeader("Content-Type", "image/png");
    res.send(image);
});

// **2️⃣ Telegram Bot**
bot.start((ctx) => ctx.reply("👋 Welcome! Send me a text prompt to generate an AI image."));
bot.on("text", async (ctx) => {
    const prompt = ctx.message.text;
    ctx.reply("⏳ Generating your AI image...");

    const image = await generateImage(prompt);
    if (!image) return ctx.reply("❌ Failed to generate image. Please try again later.");

    ctx.replyWithPhoto({ source: image });
});

// Start Express & Bot
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
bot.launch().then(() => console.log("🤖 Telegram bot is live!"));
