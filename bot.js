const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const fs = require("fs");

TELEGRAM_BOT_TOKEN=7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g;
HF_API_KEY=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;

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
