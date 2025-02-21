const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

// Telegram Bot Token
const TELEGRAM_BOT_TOKEN = '7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g';

// Hugging Face API Key
const HUGGING_FACE_API_KEY = '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';

// Initialize Telegram Bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Handle incoming messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userInput = msg.text;

  // Check if the message contains a valid prompt
  if (!userInput || userInput.trim() === '') {
    bot.sendMessage(chatId, 'Please provide a valid text prompt.');
    return;
  }

  // Send a confirmation message
  bot.sendMessage(chatId, 'Generating image... Please wait.');

  try {
    // Call the Hugging Face API
    const response = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`,
      },
      body: JSON.stringify({
        inputs: userInput, // Use the user's input as the prompt
        parameters: {
          negative_prompt: 'low quality, blurry, distorted', // Optional: Add negative prompts
          quality: 'high', // Set quality to high
        },
      }),
    });

    // Check if the response is successful
    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    // Parse the response
    const result = await response.json();

    // Extract the image URL or base64 data
    const imageData = result[0]?.generated_image;

    if (!imageData) {
      throw new Error('No image data found in the response.');
    }

    // Send the generated image back to the user
    bot.sendPhoto(chatId, Buffer.from(imageData, 'base64'), { caption: 'Here is your generated image!' });
  } catch (error) {
    console.error('Error generating image:', error.message);
    bot.sendMessage(chatId, 'Sorry, there was an error generating the image. Please try again later.');
  }
});

console.log('Bot is running...');
