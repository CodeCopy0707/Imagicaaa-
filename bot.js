require("dotenv").config();
const { Telegraf } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
    ctx.reply("👋 Welcome! Send me a text prompt to generate an AI image.");
});

bot.on("text", async (ctx) => {
    const prompt = ctx.message.text;
    ctx.reply("⏳ Generating your AI image...");

    try {
        const response = await axios.get(`https://lexica.art/api/v1/search?q=${encodeURIComponent(prompt)}`);
        
        if (response.data && response.data.images && response.data.images.length > 0) {
            const imageUrl = response.data.images[0].src;
            ctx.replyWithPhoto({ url: imageUrl });
        } else {
            ctx.reply("❌ No image found! Try a different prompt.");
        }
    } catch (error) {
        console.error("Error:", error);
        ctx.reply("⚠️ AI image generation error. Please try later.");
    }
});

bot.launch();
console.log("🤖 Telegram Bot is running...");
