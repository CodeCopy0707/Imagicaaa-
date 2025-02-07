const { Telegraf } = require("telegraf");
const axios = require("axios");
require("dotenv").config();

// Replace with your Telegram Bot Token
const BOT_TOKEN = "7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g";
const HF_API_KEY = "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"; // Hugging Face API Key

const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => ctx.reply("🤖 Welcome! Send me a prompt, and I'll generate an AI image for you."));

bot.on("text", async (ctx) => {
    const prompt = ctx.message.text;
    ctx.reply("⏳ Generating AI image... Please wait!");

    try {
        const response = await axios.post(
            "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2",
            { inputs: prompt },
            {
                headers: {
                    Authorization: `Bearer ${HF_API_KEY}`,
                },
                responseType: "arraybuffer",
            }
        );

        ctx.replyWithPhoto({ source: Buffer.from(response.data) });
    } catch (error) {
        console.error(error);
        ctx.reply("❌ Failed to generate image. Try again later!");
    }
});

bot.launch();
console.log("🤖 Telegram Bot is running...");
