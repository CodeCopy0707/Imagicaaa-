import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const HF_API_KEY = process.env.HF_API_KEY;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Welcome! Send me an image, and I'll generate a variant.");
});

bot.on("photo", async (msg) => {
  const chatId = msg.chat.id;
  const fileId = msg.photo[msg.photo.length - 1].file_id;

  try {
    const fileUrl = await bot.getFileLink(fileId);
    const response = await axios({
      method: "POST",
      url: "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      data: {
        inputs: "variant of previous image",
        parameters: {
          init_image: fileUrl,
          strength: 0.7,
        },
      },
      responseType: "arraybuffer",
    });

    const imagePath = `output-${chatId}.png`;
    fs.writeFileSync(imagePath, response.data);
    await bot.sendPhoto(chatId, imagePath);

    fs.unlinkSync(imagePath);
  } catch (error) {
    console.error(error);
    bot.sendMessage(chatId, "Error generating the image. Please try again.");
  }
});

console.log("Bot is running...");
