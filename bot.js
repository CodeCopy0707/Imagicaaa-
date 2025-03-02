import { Telegraf, Markup } from "telegraf";
import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import { createCanvas, loadImage } from "canvas";

// 🚀 **Telegram Bot Setup**
const BOT_TOKEN = "7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g";  // BotFather se liya hua token yahan daalo
const ADMIN_CHAT_ID = "749824465";  
const bot = new Telegraf(BOT_TOKEN);

// 🔄 Active users tracking to prevent timeout
const activeUsers = new Map();
const TIMEOUT_DURATION = 40 * 1000; // 40 seconds
const HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds

const app = express();
app.use(express.json());

// 🎨 **Image Style Options**
const imageStyles = {
    "realistic": ", ultra high resolution, 4K, realistic, professional lighting, cinematic, detailed texture, masterpiece",
    "anime": ", anime style, vibrant colors, Studio Ghibli inspired, detailed, sharp lines, 2D animation style",
    "cartoon": ", cartoon style, vibrant colors, Disney/Pixar inspired, exaggerated features, playful",
    "oil": ", oil painting style, textured canvas, brush strokes visible, rich colors, classical art technique",
    "watercolor": ", watercolor painting, soft edges, flowing colors, artistic, dreamy atmosphere",
    "sketch": ", pencil sketch, detailed linework, shading, monochrome, artistic drawing",
    "cyberpunk": ", cyberpunk style, neon lights, futuristic, high tech, dystopian, vibrant contrasts",
    "fantasy": ", fantasy art style, magical, ethereal lighting, mystical atmosphere, detailed fantasy elements",
    "vintage": ", vintage photography style, faded colors, nostalgic, retro aesthetic, film grain",
    "3d": ", 3D rendered, volumetric lighting, detailed textures, photorealistic 3D model"
};

// 📌 **Image Generate Karne Ka Function**
async function generateImage(prompt, style = "realistic") {
    try {
        // ✅ **Prompt Modify Karke Extra Details Add Karna**
        const tuningText = imageStyles[style] || imageStyles["realistic"];
        prompt += tuningText;

        // ✅ **AI API Se Image Fetch Karna**
        const response = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?w=1024&h=1024`);
        if (!response.ok) throw new Error("AI se image generate karne me error!");

        // ✅ **Image Buffer Me Convert Karna**
        const imageUrl = response.url;
        const imageBuffer = await fetch(imageUrl).then(res => res.buffer());

        // ✅ **Watermark Remove Karne Ke Liye Cropping**
        const img = await loadImage(imageBuffer);
        const cropHeight = 800; // Niche se thoda aur crop karne ke liye height kam ki
        const canvas = createCanvas(img.width, cropHeight);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, img.width, cropHeight, 0, 0, img.width, cropHeight);

        // ✅ **Final Cropped Image Buffer**
        return canvas.toBuffer("image/png");
    } catch (error) {
        console.error("❌ Error Generating Image:", error);
        return null;
    }
}

// 🔄 **Keep User Active Function**
function keepUserActive(userId) {
    activeUsers.set(userId, Date.now());
}

// 🔄 **Check if User is Active**
function isUserActive(userId) {
    const lastActive = activeUsers.get(userId);
    if (!lastActive) return false;
    return (Date.now() - lastActive) < TIMEOUT_DURATION;
}

// 🔄 **Cleanup Inactive Users Periodically**
setInterval(() => {
    const now = Date.now();
    for (const [userId, lastActive] of activeUsers.entries()) {
        if (now - lastActive > TIMEOUT_DURATION) {
            activeUsers.delete(userId);
        }
    }
}, 60000); // Check every minute

// 🚀 **Telegram Bot Commands**
bot.command('generate', async (ctx) => {
    const promptText = ctx.message.text.substring(10); // Remove "/generate " from the message
    if (!promptText) {
        return ctx.reply("Please provide a description after /generate command");
    }
    
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const userName = ctx.from.username || ctx.from.first_name || "Unknown User";
    
    // Keep user active
    keepUserActive(userId);
    
    // Parse prompt and style if provided
    let prompt = promptText;
    let style = "realistic";
    
    if (promptText.includes("--style=")) {
        const parts = promptText.split("--style=");
        prompt = parts[0].trim();
        style = parts[1].trim().toLowerCase();
        if (!imageStyles[style]) {
            style = "realistic";
        }
    }

    // Admin ko notify karo ki kisi ne image generate ki hai
    bot.telegram.sendMessage(ADMIN_CHAT_ID, `🔔 User Alert:\nUser: ${userName} (ID: ${userId})\nPrompt: "${prompt}"\nStyle: ${style}\nTime: ${new Date().toLocaleString()}`);

    // User ko waiting message bhejo with better UI
    const waitingMsg = await ctx.replyWithMarkdown(
        "🎨 *AI Image Generator*\n\n" +
        `🔄 Processing your request...\n` +
        `🖌️ Style: *${style}*\n` +
        `⏳ Creating masterpiece with AI...\n\n` +
        `_This may take a few moments. Stay creative!_`
    );

    const imageBuffer = await generateImage(prompt, style);
    
    // Delete waiting message for clean UI
    ctx.deleteMessage(waitingMsg.message_id);
    
    if (imageBuffer) {
        // Keep user active after successful generation
        keepUserActive(userId);
        
        // Send image with inline keyboard for enhancement options
        const message = await ctx.replyWithPhoto(
            { source: imageBuffer },
            { 
                caption: `🖼 *Your AI Masterpiece is Ready!*\n\n🔍 Prompt: "${prompt}"\n🖌️ Style: *${style}*\n\n✨ _Generated with Advanced AI_`, 
                parse_mode: "Markdown",
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback("🔄 Regenerate", `regenerate:${prompt}:${style}`),
                        Markup.button.callback("✨ Enhance", `enhance:${prompt}:${style}`)
                    ],
                    [
                        Markup.button.callback("🎨 Change Style", `styles:${prompt}`)
                    ]
                ])
            }
        );
        
        // Admin ko bhi image bhejo
        bot.telegram.sendPhoto(
            ADMIN_CHAT_ID, 
            { source: imageBuffer }, 
            { caption: `🖼 Image generated by ${userName} (ID: ${userId})\nPrompt: "${prompt}"\nStyle: ${style}` }
        );
    } else {
        ctx.replyWithMarkdown("❌ *Image generation failed!*\nPlease try again with a different prompt.");
        bot.telegram.sendMessage(ADMIN_CHAT_ID, `❌ Failed image generation attempt by ${userName} (ID: ${userId})\nPrompt: "${prompt}"\nStyle: ${style}`);
    }
});

// Handle callback queries for inline buttons
bot.on('callback_query', async (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const data = ctx.callbackQuery.data;
    
    // Keep user active on any interaction
    keepUserActive(userId);
    
    if (data.startsWith('regenerate:')) {
        const [_, prompt, style] = data.split(':');
        
        await ctx.answerCbQuery("Regenerating your image...");
        
        // Delete original message
        await ctx.deleteMessage();
        
        // Send waiting message
        const waitingMsg = await ctx.replyWithMarkdown(
            "🎨 *Regenerating Image*\n\n" +
            `🔄 Processing your request...\n` +
            `🖌️ Style: *${style}*\n` +
            `⏳ Creating a new masterpiece...\n\n` +
            `_This may take a few moments_`
        );
        
        const imageBuffer = await generateImage(prompt, style);
        
        // Delete waiting message
        ctx.deleteMessage(waitingMsg.message_id);
        
        if (imageBuffer) {
            ctx.replyWithPhoto(
                { source: imageBuffer }, 
                { 
                    caption: `🖼 *Your Regenerated Masterpiece!*\n\n🔍 Prompt: "${prompt}"\n🖌️ Style: *${style}*\n\n✨ _Generated with Advanced AI_`, 
                    parse_mode: "Markdown",
                    ...Markup.inlineKeyboard([
                        [
                            Markup.button.callback("🔄 Regenerate", `regenerate:${prompt}:${style}`),
                            Markup.button.callback("✨ Enhance", `enhance:${prompt}:${style}`)
                        ],
                        [
                            Markup.button.callback("🎨 Change Style", `styles:${prompt}`)
                        ]
                    ])
                }
            );
        } else {
            ctx.replyWithMarkdown("❌ *Image regeneration failed!*\nPlease try again later.");
        }
    } 
    else if (data.startsWith('enhance:')) {
        const [_, prompt, style] = data.split(':');
        const enhancedPrompt = prompt + ", enhanced details, higher quality, improved lighting";
        
        await ctx.answerCbQuery("Enhancing your image...");
        
        // Delete original message
        await ctx.deleteMessage();
        
        // Send waiting message
        const waitingMsg = await ctx.replyWithMarkdown(
            "🎨 *Enhancing Image*\n\n" +
            `🔄 Processing enhancement...\n` +
            `🖌️ Style: *${style}*\n` +
            `⏳ Adding extra details and quality...\n\n` +
            `_This may take a few moments_`
        );
        
        const imageBuffer = await generateImage(enhancedPrompt, style);
        
        // Delete waiting message
        ctx.deleteMessage(waitingMsg.message_id);
        
        if (imageBuffer) {
            ctx.replyWithPhoto(
                { source: imageBuffer }, 
                { 
                    caption: `🖼 *Your Enhanced Masterpiece!*\n\n🔍 Original Prompt: "${prompt}"\n🖌️ Style: *${style}*\n✨ *Quality: Enhanced*\n\n✨ _Generated with Advanced AI_`, 
                    parse_mode: "Markdown",
                    ...Markup.inlineKeyboard([
                        [
                            Markup.button.callback("🔄 Regenerate", `regenerate:${prompt}:${style}`),
                            Markup.button.callback("✨ Super Enhance", `enhance:${enhancedPrompt}:${style}`)
                        ],
                        [
                            Markup.button.callback("🎨 Change Style", `styles:${prompt}`)
                        ]
                    ])
                }
            );
        } else {
            ctx.replyWithMarkdown("❌ *Image enhancement failed!*\nPlease try again later.");
        }
    }
    else if (data.startsWith('styles:')) {
        const [_, prompt] = data.split(':');
        
        // Create style selection keyboard
        const styleKeyboard = [];
        const styleNames = Object.keys(imageStyles);
        
        // Create rows with 2 styles per row
        for (let i = 0; i < styleNames.length; i += 2) {
            const row = [];
            row.push(Markup.button.callback(styleNames[i], `style:${prompt}:${styleNames[i]}`));
            
            if (i + 1 < styleNames.length) {
                row.push(Markup.button.callback(styleNames[i+1], `style:${prompt}:${styleNames[i+1]}`));
            }
            
            styleKeyboard.push(row);
        }
        
        await ctx.answerCbQuery();
        await ctx.replyWithMarkdown(
            "🎨 *Select Image Style*\n\n" +
            "Choose a style for your image:",
            Markup.inlineKeyboard(styleKeyboard)
        );
    }
    else if (data.startsWith('style:')) {
        const [_, prompt, style] = data.split(':');
        
        await ctx.answerCbQuery(`Generating ${style} style image...`);
        
        // Send waiting message
        const waitingMsg = await ctx.replyWithMarkdown(
            "🎨 *Generating Styled Image*\n\n" +
            `🔄 Processing your request...\n` +
            `🖌️ Style: *${style}*\n` +
            `⏳ Creating artistic masterpiece...\n\n` +
            `_This may take a few moments_`
        );
        
        const imageBuffer = await generateImage(prompt, style);
        
        // Delete waiting message
        ctx.deleteMessage(waitingMsg.message_id);
        
        if (imageBuffer) {
            ctx.replyWithPhoto(
                { source: imageBuffer }, 
                { 
                    caption: `🖼 *Your ${style.toUpperCase()} Style Masterpiece!*\n\n🔍 Prompt: "${prompt}"\n🖌️ Style: *${style}*\n\n✨ _Generated with Advanced AI_`, 
                    parse_mode: "Markdown",
                    ...Markup.inlineKeyboard([
                        [
                            Markup.button.callback("🔄 Regenerate", `regenerate:${prompt}:${style}`),
                            Markup.button.callback("✨ Enhance", `enhance:${prompt}:${style}`)
                        ],
                        [
                            Markup.button.callback("🎨 Change Style", `styles:${prompt}`)
                        ]
                    ])
                }
            );
        } else {
            ctx.replyWithMarkdown("❌ *Image generation failed!*\nPlease try again later.");
        }
    }
});

// Start command for new users
bot.command('start', (ctx) => {
    const userId = ctx.from.id;
    
    // Keep user active
    keepUserActive(userId);
    
    ctx.replyWithMarkdown(
        "🎨 *Welcome to Advanced AI Image Generator!*\n\n" +
        "Generate beautiful AI images with a simple command:\n" +
        "`/generate your image description`\n\n" +
        "Add style by using:\n" +
        "`/generate your description --style=anime`\n\n" +
        "Available styles:\n" +
        "• realistic (default)\n" +
        "• anime\n" +
        "• cartoon\n" +
        "• oil\n" +
        "• watercolor\n" +
        "• sketch\n" +
        "• cyberpunk\n" +
        "• fantasy\n" +
        "• vintage\n" +
        "• 3d\n\n" +
        "Example: `/generate sunset over mountains --style=oil`\n\n" +
        "✨ Be creative and enjoy!"
    );
});

// Help command
bot.command('help', (ctx) => {
    const userId = ctx.from.id;
    
    // Keep user active
    keepUserActive(userId);
    
    ctx.replyWithMarkdown(
        "🔍 *AI Image Generator Help*\n\n" +
        "Basic Commands:\n" +
        "• `/generate [description]` - Create an image\n" +
        "• `/generate [description] --style=anime` - Create with style\n" +
        "• `/styles` - View all available styles\n\n" +
        "Tips for better results:\n" +
        "• Be specific in your descriptions\n" +
        "• Try different styles for variety\n" +
        "• Mention colors, lighting, and mood\n" +
        "• Use the enhance button for better quality\n\n" +
        "Example: `/generate a futuristic city at night with neon lights --style=cyberpunk`"
    );
});

// Styles command to show available styles
bot.command('styles', (ctx) => {
    const userId = ctx.from.id;
    
    // Keep user active
    keepUserActive(userId);
    
    let styleMessage = "🎨 *Available Image Styles*\n\n";
    
    Object.keys(imageStyles).forEach(style => {
        styleMessage += `• *${style}*: ${imageStyles[style].split(',')[1]}\n`;
    });
    
    styleMessage += "\nUse with: `/generate [description] --style=stylename`";
    
    ctx.replyWithMarkdown(styleMessage);
});

// Heartbeat mechanism to keep users active
bot.on('message', (ctx) => {
    const userId = ctx.from.id;
    keepUserActive(userId);
});

// Launch bot
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// **🚀 Express Server Start (Optional)**
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
