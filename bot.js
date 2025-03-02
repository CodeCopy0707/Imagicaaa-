import TelegramBot from "node-telegram-bot-api";
import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import { createCanvas, loadImage } from "canvas";

// 🚀 **Telegram Bot Setup**
const BOT_TOKEN = "7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g"; // Replace with actual token
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const app = express();
app.use(express.json());

// 📌 **Enhanced Image Generation Function**
async function generateImage(prompt) {
  try {
    const tuningText =
      ", ultra high resolution, 8K, highly detailed, realistic, professional lighting, cinematic, octane render, unreal engine 5";
    prompt += tuningText;

    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?w=1024&h=1024`;

    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`AI Image API Error: ${response.status}`);

    const imageBuffer = await response.buffer();

    const img = await loadImage(imageBuffer);
    const cropHeight = Math.min(850, img.height);
    const canvas = createCanvas(img.width, cropHeight);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, img.width, cropHeight, 0, 0, img.width, cropHeight);

    return canvas.toBuffer("image/png");
  } catch (error) {
    console.error("❌ Error Generating Image:", error);
    return null;
  }
}

// ✅ **Keep-Alive Function**
function keepAlive() {
  setInterval(() => console.log("Internal keep-alive check..."), 30000);

  app.get('/keep-alive', (req, res) => res.status(200).send('OK'));
}

// 🚀 **Telegram Bot Commands**
bot.onText(/\/generate (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];

  const waitingMessage = await bot.sendMessage(
    chatId,
    "⏳ Generating your AI image... Please wait!"
  );

  const imageBuffer = await generateImage(prompt);

  if (imageBuffer) {
    await bot.deleteMessage(chatId, waitingMessage.message_id);
    await bot.sendPhoto(chatId, imageBuffer, { caption: "🎨 Here is your AI-generated image!" });
  } else {
    await bot.editMessageText("❌ Image generation failed!", {
      chatId,
      message_id: waitingMessage.message_id,
    });
  }
});

// Start Keep-Alive
keepAlive();

// ✅ **Express Server Start**
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
