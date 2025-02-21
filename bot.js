const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');

// Replace with your actual tokens
const TELEGRAM_BOT_TOKEN = '7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g';
const HF_API_KEY = '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';

// Initialize the Telegram bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

console.log("Bot is running...");

// Handle incoming messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Check if the user sent an image
  if (msg.photo) {
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const filePath = await bot.getFileLink(fileId);

    // Download the image
    const response = await axios({
      url: filePath,
      responseType: 'arraybuffer',
    });

    const imageBuffer = Buffer.from(response.data, 'binary');
    const localFilePath = `./images/${fileId}.jpg`;
    fs.writeFileSync(localFilePath, imageBuffer);

    // Send the image to Hugging Face API
    try {
      const hfResponse = await axios({
        method: 'POST',
        url: 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${HF_API_KEY}`,
        },
        data: JSON.stringify({
          inputs: "variant of previous image",
          parameters: {
            init_image: imageBuffer.toString('base64'),
            strength: 0.7,
          },
        }),
      });

      // Assuming the response contains the generated image in base64
      const generatedImageBase64 = hfResponse.data;

      // Convert base64 to buffer and send it back to the user
      const imageBufferGenerated = Buffer.from(generatedImageBase64, 'base64');
      const generatedImagePath = `./images/generated_${fileId}.jpg`;
      fs.writeFileSync(generatedImagePath, imageBufferGenerated);

      bot.sendPhoto(chatId, generatedImagePath);
    } catch (error) {
      console.error("Error calling Hugging Face API:", error);
      bot.sendMessage(chatId, "Sorry, there was an error processing your request.");
    }
  } else {
    bot.sendMessage(chatId, "Please send an image to generate a variant.");
  }
});
