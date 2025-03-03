import TelegramBot from 'node-telegram-bot-api';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize environment variables
dotenv.config();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Bot token from environment variables
const BOT_TOKEN = '7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g'; // Replace with your actual token

// Configure bot options with increased timeout and polling options
const botOptions = {
  polling: {
    interval: 300,
    timeout: 10,
    limit: 100,
    retryTimeout: 5000
  },
  request: {
    timeout: 30000
  }
};

// Initialize the bot with options
const bot = new TelegramBot(BOT_TOKEN, botOptions);

// Track user states
const userStates = {};

// Image generation styles
const imageStyles = {
  'realistic': 'realistic, detailed, high resolution',
  'anime': 'anime style, vibrant colors, detailed',
  'cartoon': 'cartoon style, colorful, fun',
  'oil painting': 'oil painting, textured, artistic',
  'watercolor': 'watercolor painting, soft colors, artistic',
  'sketch': 'pencil sketch, detailed, black and white',
  'cyberpunk': 'cyberpunk, neon lights, futuristic',
  'fantasy': 'fantasy art, magical, detailed',
  'abstract': 'abstract art, colorful, non-representational',
  'pixel art': 'pixel art, retro gaming style, 8-bit'
};

// Set up error handling for the bot
bot.on('polling_error', (error) => {
  console.log('Polling error:', error.message);
  // Don't crash on polling errors, just log them
});

// Welcome message
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'there';

  // Reset user state
  userStates[chatId] = {
    lastCommand: 'start',
    style: 'realistic',
    resolution: '1024x1024',
    waitingForPrompt: false
  };

  const welcomeMessage = `
Hello ${firstName}! 👋 Welcome to the AI Image Generator Bot! 🎨

I can create amazing images from your text descriptions. Here's how to use me:

1️⃣ Simply send me any text description and I'll generate an image
2️⃣ Use /style to change the art style
3️⃣ Use /resolution to change image size
4️⃣ Use /help to see all commands

Let's get creative! Send me a description of what you'd like to see.
  `;

  bot.sendMessage(chatId, welcomeMessage, {
    parse_mode: 'Markdown'
  }).catch(error => {
    console.error('Error sending welcome message:', error.message);
  });
});

// Help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  userStates[chatId] = {
    ...userStates[chatId] || {},
    lastCommand: 'help',
    waitingForPrompt: false
  };

  const helpMessage = `
*AI Image Generator Bot - Help* 🤖

*Basic Usage:*
Simply type any description and I'll generate an image for you!

*Available Commands:*
/start - Restart the bot
/help - Show this help message
/generate [prompt] - Generate an image (optional, you can just type directly)
/style - Change the art style
/resolution - Change image resolution
/settings - View your current settings
/styles - List all available art styles
/random - Generate a random image

*Examples:*
• "A beautiful sunset over mountains"
• "A futuristic city with flying cars"
• "A cute cat wearing a space helmet"

*Tips:*
• Be descriptive for better results
• You can specify colors, lighting, and details
• Try different styles for varied results
  `;

  bot.sendMessage(chatId, helpMessage, {
    parse_mode: 'Markdown'
  }).catch(error => {
    console.error('Error sending help message:', error.message);
  });
});

// Style command
bot.onText(/\/style/, (msg) => {
  const chatId = msg.chat.id;

  userStates[chatId] = {
    ...userStates[chatId] || {},
    lastCommand: 'style',
    waitingForPrompt: false
  };

  const styleOptions = Object.keys(imageStyles).map(style =>
    `• ${style.charAt(0).toUpperCase() + style.slice(1)}`
  ).join('\n');

  const styleMessage = `
*Choose an Art Style* 🎭

Select one of the following styles by sending its name:

${styleOptions}

*Current style:* ${userStates[chatId]?.style || 'realistic'}
  `;

  bot.sendMessage(chatId, styleMessage, {
    parse_mode: 'Markdown'
  }).catch(error => {
    console.error('Error sending style message:', error.message);
  });
});

// Resolution command
bot.onText(/\/resolution/, (msg) => {
  const chatId = msg.chat.id;

  userStates[chatId] = {
    ...userStates[chatId] || {},
    lastCommand: 'resolution',
    waitingForPrompt: false
  };

  const resolutionMessage = `
*Choose Image Resolution* 📏

Select one of the following resolutions:
• 512x512 (small)
• 1024x1024 (medium)
• 1536x1536 (large)

*Current resolution:* ${userStates[chatId]?.resolution || '1024x1024'}

Note: Larger resolutions may take longer to generate.
  `;

  bot.sendMessage(chatId, resolutionMessage, {
    parse_mode: 'Markdown'
  }).catch(error => {
    console.error('Error sending resolution message:', error.message);
  });
});

// Settings command
bot.onText(/\/settings/, (msg) => {
  const chatId = msg.chat.id;

  // Ensure user state exists
  if (!userStates[chatId]) {
    userStates[chatId] = {
      style: 'realistic',
      resolution: '1024x1024',
      lastCommand: '',
      waitingForPrompt: false
    };
  }

  const settingsMessage = `
*Your Current Settings* ⚙️

• *Style:* ${userStates[chatId].style || 'realistic'}
• *Resolution:* ${userStates[chatId].resolution || '1024x1024'}

Use /style to change the art style
Use /resolution to change the image size
  `;

  bot.sendMessage(chatId, settingsMessage, {
    parse_mode: 'Markdown'
  }).catch(error => {
    console.error('Error sending settings message:', error.message);
  });
});

// Styles command
bot.onText(/\/styles/, (msg) => {
  const chatId = msg.chat.id;

  userStates[chatId] = {
    ...userStates[chatId] || {},
    lastCommand: 'styles',
    waitingForPrompt: false
  };

  let stylesMessage = '*Available Art Styles* 🎨\n\n';

  Object.keys(imageStyles).forEach(style => {
    stylesMessage += `• *${style.charAt(0).toUpperCase() + style.slice(1)}*: ${imageStyles[style]}\n`;
  });

  stylesMessage += '\nUse /style to change your current style.';

  bot.sendMessage(chatId, stylesMessage, {
    parse_mode: 'Markdown'
  }).catch(error => {
    console.error('Error sending styles message:', error.message);
  });
});

// Random image command
bot.onText(/\/random/, async (msg) => {
  const chatId = msg.chat.id;

  userStates[chatId] = {
    ...userStates[chatId] || {},
    lastCommand: 'random',
    waitingForPrompt: false
  };

  const randomPrompts = [
    "a magical forest with glowing mushrooms and fairy lights",
    "a futuristic cityscape with flying cars and neon signs",
    "a majestic dragon soaring over a mountain range",
    "an underwater city with mermaids and exotic sea creatures",
    "a steampunk airship flying through clouds at sunset",
    "a cozy cabin in the woods during a snowfall",
    "a space station orbiting a colorful nebula",
    "a cyberpunk street scene with rain and reflections",
    "a fantasy castle on a floating island in the sky",
    "a post-apocalyptic landscape with nature reclaiming a city"
  ];

  const randomStyles = Object.keys(imageStyles);
  const randomPrompt = randomPrompts[Math.floor(Math.random() * randomPrompts.length)];
  const randomStyle = randomStyles[Math.floor(Math.random() * randomStyles.length)];

  // Update user's style temporarily for this generation
  const previousStyle = userStates[chatId]?.style || 'realistic';
  userStates[chatId].style = randomStyle;

  await bot.sendMessage(chatId, `🎲 *Generating a random image*\n\n*Prompt:* ${randomPrompt}\n*Style:* ${randomStyle}`, {
    parse_mode: 'Markdown'
  });

  // Generate the image
  await generateAndSendImage(chatId, randomPrompt);

  // Restore previous style
  userStates[chatId].style = previousStyle;
});

// Generate image command
bot.onText(/\/generate (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1];

  userStates[chatId] = {
    ...userStates[chatId] || {},
    lastCommand: 'generate',
    waitingForPrompt: false
  };

  await generateAndSendImage(chatId, prompt);
});

// Handle style selection
bot.on('message', async (msg) => {
  if (msg.text && msg.text.startsWith('/')) return; // Skip commands

  const chatId = msg.chat.id;
  const text = msg.text;

  // Ensure user state exists
  if (!userStates[chatId]) {
    userStates[chatId] = {
      style: 'realistic',
      resolution: '1024x1024',
      lastCommand: '',
      waitingForPrompt: false
    };
  }

  // Handle style selection
  if (userStates[chatId].lastCommand === 'style') {
    const selectedStyle = text.toLowerCase();

    if (Object.keys(imageStyles).includes(selectedStyle)) {
      userStates[chatId].style = selectedStyle;
      userStates[chatId].lastCommand = '';

      bot.sendMessage(chatId, `✅ Style updated to *${selectedStyle}*!\n\nNow send me a description to generate an image.`, {
        parse_mode: 'Markdown'
      });
      return;
    } else {
      // Check for partial matches
      const matchingStyles = Object.keys(imageStyles).filter(style =>
        style.includes(selectedStyle)
      );

      if (matchingStyles.length === 1) {
        userStates[chatId].style = matchingStyles[0];
        userStates[chatId].lastCommand = '';

        bot.sendMessage(chatId, `✅ Style updated to *${matchingStyles[0]}*!\n\nNow send me a description to generate an image.`, {
          parse_mode: 'Markdown'
        });
        return;
      } else if (matchingStyles.length > 1) {
        const styleOptions = matchingStyles.map(style =>
          `• ${style.charAt(0).toUpperCase() + style.slice(1)}`
        ).join('\n');

        bot.sendMessage(chatId, `I found multiple matching styles. Please be more specific:\n\n${styleOptions}`, {
          parse_mode: 'Markdown'
        });
        return;
      }

      bot.sendMessage(chatId, `❌ Style "${text}" not found. Please choose from the available styles.`);
      return;
    }
  }

  // Handle resolution selection
  if (userStates[chatId].lastCommand === 'resolution') {
    const validResolutions = ['512x512', '1024x1024', '1536x1536'];
    const selectedResolution = text.toLowerCase();

    if (validResolutions.includes(selectedResolution)) {
      userStates[chatId].resolution = selectedResolution;
      userStates[chatId].lastCommand = '';

      bot.sendMessage(chatId, `✅ Resolution updated to *${selectedResolution}*!\n\nNow send me a description to generate an image.`, {
        parse_mode: 'Markdown'
      });
      return;
    } else {
      // Handle simplified input
      if (text.includes('512') || text.toLowerCase().includes('small')) {
        userStates[chatId].resolution = '512x512';
        userStates[chatId].lastCommand = '';

        bot.sendMessage(chatId, `✅ Resolution updated to *512x512* (small)!\n\nNow send me a description to generate an image.`, {
          parse_mode: 'Markdown'
        });
        return;
      } else if (text.includes('1024') || text.toLowerCase().includes('medium')) {
        userStates[chatId].resolution = '1024x1024';
        userStates[chatId].lastCommand = '';

        bot.sendMessage(chatId, `✅ Resolution updated to *1024x1024* (medium)!\n\nNow send me a description to generate an image.`, {
          parse_mode: 'Markdown'
        });
        return;
      } else if (text.includes('1536') || text.toLowerCase().includes('large')) {
        userStates[chatId].resolution = '1536x1536';
        userStates[chatId].lastCommand = '';

        bot.sendMessage(chatId, `✅ Resolution updated to *1536x1536* (large)!\n\nNow send me a description to generate an image.`, {
          parse_mode: 'Markdown'
        });
        return;
      }

      bot.sendMessage(chatId, `❌ Resolution "${text}" not valid. Please choose 512x512, 1024x1024, or 1536x1536.`);
      return;
    }
  }

  // If no special command is being processed, treat as a prompt
  if (!userStates[chatId].lastCommand || userStates[chatId].lastCommand === '') {
    await generateAndSendImage(chatId, text);
  }
});

/**
 * Generate and send an image to the user
 * @param {number} chatId - Telegram chat ID
 * @param {string} prompt - The prompt for image generation
 */
async function generateAndSendImage(chatId, prompt) {
  let statusMessage = null;

  try {
    // Ensure user state exists
    if (!userStates[chatId]) {
      userStates[chatId] = {
        style: 'realistic',
        resolution: '1024x1024',
        lastCommand: '',
        waitingForPrompt: false
      };
    }

    // Get user's style and resolution
    const style = userStates[chatId].style || 'realistic';
    const resolution = userStates[chatId].resolution || '1024x1024';
    const [width, height] = resolution.split('x').map(Number);

    // Send "generating" message
    try {
      statusMessage = await bot.sendMessage(
        chatId,
        `🎨 *Generating image*\n\n*Prompt:* ${prompt}\n*Style:* ${style}\n*Resolution:* ${resolution}`,
        { parse_mode: 'Markdown' }
      );
    } catch (msgError) {
      console.error('Error sending status message:', msgError.message);
      // Continue even if status message fails
    }

    // Enhance prompt with style
    const enhancedPrompt = `${prompt}, ${imageStyles[style]}`;

    // Generate the image URL
    const imageUrl = generateImageUrl(enhancedPrompt, width, height);

    if (!imageUrl) {
      throw new Error('Failed to generate image URL');
    }

    try {
      // Download the image with timeout and retry logic
      const response = await fetchWithRetry(imageUrl, 3);

      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }

      const imageBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(imageBuffer);

      // Save image to temp file
      const imagePath = path.join(tempDir, `${Date.now()}.png`);
      fs.writeFileSync(imagePath, buffer);

      // Send the image
      await bot.sendPhoto(chatId, imagePath, {
        caption: `🖼️ *Here's your image*\n\n*Prompt:* ${prompt}\n*Style:* ${style}`,
        parse_mode: 'Markdown'
      });

      // Delete the temp file
      fs.unlinkSync(imagePath);

      // Delete the status message if it was sent successfully
      if (statusMessage) {
        try {
          await bot.deleteMessage(chatId, statusMessage.message_id);
        } catch (deleteError) {
          console.error('Error deleting status message:', deleteError.message);
          // Continue even if delete fails
        }
      }

      // Send a follow-up message
      setTimeout(() => {
        bot.sendMessage(chatId, "Would you like to generate another image? Just send me a new description!", {
          reply_markup: {
            keyboard: [
              ['🎲 Random Image'],
              ['🎭 Change Style', '📏 Change Resolution'],
              ['ℹ️ Help', '⚙️ Settings']
            ],
            resize_keyboard: true,
            one_time_keyboard: false
          }
        }).catch(error => {
          console.error('Error sending follow-up message:', error.message);
        });
      }, 1000);

    } catch (error) {
      throw error;
    }

  } catch (error) {
    console.error('Error:', error.message);
    try {
      await bot.sendMessage(
        chatId,
        `❌ Sorry, there was an error generating your image: ${error.message}. Please try again later.`,
        { parse_mode: 'Markdown' }
      );
    } catch (msgError) {
      console.error('Error sending error message:', msgError.message);
    }
  }
}

// Handle keyboard button presses
bot.on('message', (msg) => {
  if (!msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text;

  // Handle keyboard shortcuts
  if (text === '🎲 Random Image') {
    // Trigger the random command
    bot.emit('text', { ...msg, text: '/random' });
  } else if (text === '🎭 Change Style') {
    // Trigger the style command
    bot.emit('text', { ...msg, text: '/style' });
  } else if (text === '📏 Change Resolution') {
    // Trigger the resolution command
    bot.emit('text', { ...msg, text: '/resolution' });
  } else if (text === 'ℹ️ Help') {
    // Trigger the help command
    bot.emit('text', { ...msg, text: '/help' });
  } else if (text === '⚙️ Settings') {
    // Trigger the settings command
    bot.emit('text', { ...msg, text: '/settings' });
  }
});

/**
 * Generate an image URL based on the prompt
 * @param {string} prompt - The prompt for image generation
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {string|null} - The image URL or null if failed
 */
function generateImageUrl(prompt, width = 1024, height = 1024) {
  try {
    // Using Pollinations.ai API
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&noCache=${Date.now()}`;
  } catch (error) {
    console.error("❌ Error Generating Image URL:", error.message);
    return null;
  }
}

/**
 * Fetch with retry logic
 * @param {string} url - URL to fetch
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in ms
 * @returns {Promise<Response>} - Fetch response
 */
async function fetchWithRetry(url, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      console.error(`Fetch attempt ${i + 1} failed:`, error.message);
      lastError = error;

      if (i < maxRetries - 1) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError;
}

console.log('🤖 Advanced Telegram AI Image Bot is running...');

// Error handling for unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error.message);
  // Don't crash the application
});

//  ---  ADDED CODE BELOW  ---

// Simple HTTP server to keep Render awake
import http from 'http';

const PORT = process.env.PORT || 3000;  // Use Render's port or 3000

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Telegram bot is alive!\n');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Function to ping the server every 15 minutes (adjust as needed)
function pingSelf() {
  const url = 'https://imagicaaa.onrender.com';  // Render's external URL

  if (url) {
    fetch(url)
      .then(() => console.log('Successfully pinged self'))
      .catch(err => console.error('Failed to ping self:', err));
  } else {
    console.log('RENDER_EXTERNAL_URL not set, skipping self-ping');
  }
}

// Set up the ping interval
setInterval(pingSelf, 45000);  // Every 15 minutes

// Run the ping immediately when the bot starts.
pingSelf();
