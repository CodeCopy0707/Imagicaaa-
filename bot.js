
const express = require("express");
const fetch = require("node-fetch");
const { Telegraf } = require("telegraf");
require("dotenv").config();

const app = express();
app.use(express.json());

const BOT_TOKEN = '7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g';
const HF_API_KEY = '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';
const bot = new Telegraf(BOT_TOKEN);

// Hugging Face API URL
const HF_API_URL = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev";

// Function to generate image
async function generateImage(prompt) {
  try {
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HF_API_KEY}`,
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    if (!response.ok) throw new Error("Failed to generate image");

    const buffer = await response.buffer();
    return buffer;
  } catch (error) {
    console.error("Error generating image:", error);
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
  if (!image) return ctx.reply("❌ Failed to generate image.");

  ctx.replyWithPhoto({ source: image });
});

// Start Express & Bot
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
bot.launch();
