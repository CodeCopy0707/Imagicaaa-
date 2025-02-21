import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs";

// Load environment variables
dotenv.config();

// Define API keys
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g";
const HF_API_KEY = process.env.HF_API_KEY || "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";

// Initialize Telegram Bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text.toLowerCase().startsWith("/generate")) {
        const prompt = text.replace("/generate", "").trim();

        if (!prompt) {
            bot.sendMessage(chatId, "⚠ Please provide a prompt! Example: `/generate futuristic city`");
            return;
        }

        bot.sendMessage(chatId, "🎨 Generating image... Please wait.");

        try {
            const imageUrl = await generateImage(prompt);
            bot.sendPhoto(chatId, imageUrl, { caption: `✨ AI-generated image for: "${prompt}"` });
        } catch (error) {
            bot.sendMessage(chatId, "❌ Error generating image. Please try again.");
            console.error(error);
        }
    } else if (text.toLowerCase() === "/start") {
        bot.sendMessage(chatId, "🚀 Welcome to the AI Image Generator Bot!\n\nUse `/generate <prompt>` to create an image.");
    } else {
        bot.sendMessage(chatId, `🤖 You said: ${text}`);
    }
});

console.log("🚀 Bot is running...");

// Hugging Face Image Generation Function
async function generateImage(prompt) {
    const response = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: prompt })
    });

    if (!response.ok) {
        throw new Error("Failed to generate image.");
    }

    // Save image locally
    const buffer = await response.arrayBuffer();
    const filePath = `./image_${Date.now()}.png`;
    fs.writeFileSync(filePath, Buffer.from(buffer));

    return filePath; // Returning local file path
}
