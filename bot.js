// This code requires significant external libraries (Telegraf, Axios, and optionally, a session library) and API keys.
// Replace placeholders with your actual API keys and consider using environment variables for security.
// This is a basic implementation.  It needs comprehensive error handling, input validation (e.g., prompt length, rate limiting),
// and more robust features (e.g., saving images, user-specific settings, better keep-alive).  Consider using a database for persistent storage.

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const session = require('telegraf-session-local'); // Use telegraf-session-local for session management

// Use environment variables for sensitive data
const BOT_TOKEN = process.env.BOT_TOKEN || '7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g'; // Fallback token for local testing ONLY.  Remove in production.
if (!process.env.BOT_TOKEN) {
    console.warn("WARNING: BOT_TOKEN is not set in environment variables. Using fallback token.  This is insecure for production.");
}

const bot = new Telegraf(BOT_TOKEN);

// Add a session to the bot using telegraf-session-local
bot.use(new session({ database: 'session_db.json' })); // Use a JSON file for session storage

// Image generation function
async function generateImage(prompt, style = '') {
    try {
        const tuningText = ", ultra high resolution, 4K, realistic, professional lighting, cinematic";
        let fullPrompt = prompt + tuningText;

        if (style) {
            fullPrompt += `, ${style}`; // Append style to the prompt
        }

        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?w=1024&h=1024`;
        const response = await axios.get(imageUrl, { responseType: 'stream' });

        if (response.status === 200) {
            return response.data; // Return the image stream
        } else {
            console.error("Image generation failed:", response.status, response.statusText);
            return null;
        }
    } catch (error) {
        console.error("Error generating image:", error);
        // Provide more specific error handling.  Axios errors have a different structure.
        if (error.response) {
            console.error("Error details:", error.response.status, error.response.data);
        } else if (error.request) {
            console.error("No response received:", error.request);
        }
        return null;
    }
}

// Command handler for generating images
bot.command('imagine', async (ctx) => {
    const prompt = ctx.message.text.substring('/imagine'.length).trim();

    if (!prompt) {
        return ctx.reply('Please provide a prompt. For example: /imagine A cat in space');
    }

    ctx.reply('Generating image, please wait...');

    const imageStream = await generateImage(prompt, ctx.session?.style || ''); // Use session style if available

    if (imageStream) {
        try {
            await ctx.replyWithPhoto({ source: imageStream }, {
                caption: ctx.session?.style ? `${prompt} - Style: ${ctx.session.style}` : prompt
            });
        } catch (error) {
            console.error("Error sending image:", error);
            ctx.reply('Failed to send the generated image.  This could be due to a Telegram API issue or an invalid image.');
        }
    } else {
        ctx.reply('Failed to generate the image.');
    }
});

// Inline keyboard for style options
const styleOptions = Markup.inlineKeyboard([
    [
        Markup.button.callback('Realistic', 'style_realistic'),
        Markup.button.callback('Cartoon', 'style_cartoon'),
        Markup.button.callback('Anime', 'style_anime'),
    ],
    [
        Markup.button.callback('Abstract', 'style_abstract'),
        Markup.button.callback('Pencil Sketch', 'style_pencil'),
        Markup.button.callback('Oil Painting', 'style_oil'),
    ],
    [
        Markup.button.callback('Cyberpunk', 'style_cyberpunk'),
        Markup.button.callback('Steampunk', 'style_steampunk'),
        Markup.button.callback('Watercolor', 'style_watercolor'),
    ],
    [
        Markup.button.callback('Photorealistic', 'style_photorealistic')
    ]
], { columns: 3 });

// Command handler for choosing a style
bot.command('style', async (ctx) => {
    ctx.reply('Choose a style:', styleOptions);
});

// Callback query handler for style selection
bot.action(/^style_/, async (ctx) => {
    const style = ctx.callbackQuery.data.substring(6); // Extract style name
     // Session is automatically initialized now
    ctx.session.style = style; // Store style in session
    await ctx.answerCbQuery(`Style set to ${style}`); // Await the answerCbQuery
    await ctx.reply(`Style set to ${style}. Now use /imagine with your prompt.`); // Await the reply
});

// /imagine_styled command removed.  /imagine now uses the selected style.

// Keep-alive mechanism (basic, needs improvement)
// This is a very simplistic keep-alive.  Consider using a more robust solution like a cron job or a dedicated monitoring service.
setInterval(() => {
    // You can send a message to a specific chat to keep the bot active (replace YOUR_CHAT_ID)
    // bot.telegram.sendMessage(YOUR_CHAT_ID, 'Bot is alive!');
    console.log('Bot is alive!'); // Simple logging
}, 25 * 60 * 1000); // Every 25 minutes

// Launch the bot
bot.launch({
    dropPendingUpdates: true // Drop any pending updates on startup to avoid processing old messages
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
