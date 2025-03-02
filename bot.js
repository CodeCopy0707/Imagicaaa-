

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// Replace with your Telegram bot token
const BOT_TOKEN = '7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g';
const bot = new Telegraf(BOT_TOKEN);

// Image generation function
async function generateImage(prompt, style = '') {
    try {
        const tuningText = ", ultra high resolution, 4K, realistic, professional lighting, cinematic";
        prompt += tuningText;

        if (style) {
            prompt += `, ${style}`; // Append style to the prompt
        }

        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?w=1024&h=1024`;
        const response = await axios.get(imageUrl, { responseType: 'stream' });

        if (response.status === 200) {
            return response.data; // Return the image stream
        } else {
            console.error("Image generation failed:", response.status, response.statusText);
            return null;
        }
    } catch (error) {
        console.error("Error generating image:", error);
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

    const imageStream = await generateImage(prompt);

    if (imageStream) {
        try {
            await ctx.replyWithPhoto({ source: imageStream }, {
                caption: prompt
            });
        } catch (error) {
            console.error("Error sending image:", error);
            ctx.reply('Failed to send the generated image.');
        }
    } else {
        ctx.reply('Failed to generate the image.');
    }
});

// Inline keyboard for style options
const styleOptions = Markup.inlineKeyboard([
    Markup.button.callback('Realistic', 'style_realistic'),
    Markup.button.callback('Cartoon', 'style_cartoon'),
    Markup.button.callback('Anime', 'style_anime'),
    Markup.button.callback('Abstract', 'style_abstract'),
    Markup.button.callback('Pencil Sketch', 'style_pencil'),
    Markup.button.callback('Oil Painting', 'style_oil'),
    Markup.button.callback('Cyberpunk', 'style_cyberpunk'),
    Markup.button.callback('Steampunk', 'style_steampunk'),
    Markup.button.callback('Watercolor', 'style_watercolor'),
    Markup.button.callback('Photorealistic', 'style_photorealistic')
], { columns: 3 });

// Command handler for choosing a style
bot.command('style', async (ctx) => {
    ctx.reply('Choose a style:', styleOptions);
});

// Callback query handler for style selection
bot.action(/^style_/, async (ctx) => {
    const style = ctx.callbackQuery.data.substring(6); // Extract style name
    ctx.session.style = style; // Store style in session
    ctx.answerCbQuery(`Style set to ${style}`);
    ctx.reply(`Style set to ${style}. Now use /imagine with your prompt.`);
});

// Example usage with style
bot.command('imagine_styled', async (ctx) => {
    const prompt = ctx.message.text.substring('/imagine_styled'.length).trim();

    if (!prompt) {
        return ctx.reply('Please provide a prompt. For example: /imagine_styled A cat');
    }

    if (!ctx.session || !ctx.session.style) {
        return ctx.reply('Please select a style first using /style');
    }

    ctx.reply('Generating styled image, please wait...');

    const imageStream = await generateImage(prompt, ctx.session.style);

    if (imageStream) {
        try {
            await ctx.replyWithPhoto({ source: imageStream }, {
                caption: `${prompt} - Style: ${ctx.session.style}`
            });
        } catch (error) {
            console.error("Error sending image:", error);
            ctx.reply('Failed to send the generated image.');
        }
    } else {
        ctx.reply('Failed to generate the image.');
    }
});

// Keep-alive mechanism (basic, needs improvement)
setInterval(() => {
    // You can send a message to a specific chat to keep the bot active
    // bot.telegram.sendMessage(YOUR_CHAT_ID, 'Bot is alive!');
    console.log('Bot is alive!'); // Simple logging
}, 25 * 60 * 1000); // Every 25 minutes

// Launch the bot
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
