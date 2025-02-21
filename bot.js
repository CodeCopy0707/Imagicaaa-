import { Telegraf } from "telegraf";
import fetch from "node-fetch";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const HF_API_KEY = process.env.HF_API_KEY;

const bot = new Telegraf(BOT_TOKEN);
const app = express();
const port = 3000;

let userImageHistory = {}; // User-wise image history

// 🟢 Keep-Alive Server (40 sec inactivity issue fix)
app.get("/", (req, res) => res.send("Bot is running..."));
app.listen(port, () => console.log(`✅ Keep-alive server running on port ${port}`));

/**
 * 🖼️ Image Generation using Hugging Face API
 */
async function generateImage(prompt, negativePrompt = "", quality = "standard") {
    try {
        const response = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${HF_API_KEY}`
            },
            body: JSON.stringify({
                inputs: { prompt },
                parameters: {
                    negative_prompt: negativePrompt,
                    quality: quality === "premium" ? "high" : "standard"
                }
            }),
        });

        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        const data = await response.json();
        return data.image_url; // Assuming response contains an image URL
    } catch (error) {
        console.error("Error generating image:", error);
        return null;
    }
}

/**
 * 🤖 Gemini AI Assistance for Bot Usage Help
 */
async function getGeminiSuggestions(userMessage) {
    return `🤖 Gemini AI: "${userMessage}" se related aap advanced image prompts use kar sakte hain!`;
}

// 🛠️ Telegram Bot Command Handlers
bot.start((ctx) => {
    ctx.reply("👋 Welcome! Send me a text prompt and I'll generate an image for you.");
});

bot.on("text", async (ctx) => {
    const userId = ctx.message.from.id;
    const prompt = ctx.message.text;

    ctx.reply("🎨 Generating your image... Please wait ⏳");

    const imageUrl = await generateImage(prompt);
    if (imageUrl) {
        if (!userImageHistory[userId]) userImageHistory[userId] = [];
        userImageHistory[userId].push(imageUrl);

        ctx.replyWithPhoto(imageUrl, {
            caption: `✅ Here is your generated image!\n\n📌 Want variants? Click below 👇`,
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔄 Generate Variants", callback_data: "variant" }],
                    [{ text: "💡 Need Help?", callback_data: "help" }]
                ]
            }
        });
    } else {
        ctx.reply("⚠️ Failed to generate image. Please try again.");
    }
});

// 🔄 Variant Generation
bot.action("variant", async (ctx) => {
    const userId = ctx.callbackQuery.from.id;
    if (!userImageHistory[userId] || userImageHistory[userId].length === 0) {
        return ctx.reply("⚠️ No previous images found. Please generate an image first.");
    }

    ctx.reply("🔄 Generating variants...");

    const lastPrompt = userImageHistory[userId][userImageHistory[userId].length - 1];
    const variantImage = await generateImage(lastPrompt, "low quality, bad composition", "premium");

    if (variantImage) {
        ctx.replyWithPhoto(variantImage, { caption: "✅ Here is your variant!" });
    } else {
        ctx.reply("⚠️ Failed to generate variant. Please try again.");
    }
});

// 💡 AI Assistance
bot.action("help", async (ctx) => {
    const suggestion = await getGeminiSuggestions("image generation bot features");
    ctx.reply(suggestion);
});

// 🚀 Launch Bot
bot.launch().then(() => console.log("🚀 Telegram AI Bot is running!"));

// ❗ Graceful Shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
