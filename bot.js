const { Telegraf } = require("telegraf");
const fetch = require("node-fetch");
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");

// **🚀 Telegram Bot Setup**
const BOT_TOKEN = "7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g"; // Replace with your actual bot token
const bot = new Telegraf(BOT_TOKEN);

// **🤖 Image Generation Function**
async function generateImage(prompt, enhanceType = "realistic") {
    try {
        // **✨ Enhanced Prompt Tuning**
        let tuningText = ", ultra high resolution, 4K";
        switch (enhanceType) {
            case "realistic":
                tuningText += ", realistic, professional lighting, cinematic";
                break;
            case "cartoon":
                tuningText += ", cartoonish, vibrant colors, detailed";
                break;
            case "anime":
                tuningText += ", anime style, detailed eyes, trending on artstation";
                break;
            default:
                tuningText += ", artistic, creative, unique";
        }
        prompt += tuningText;

        // ✅ **Pollinations AI Image API**
        const response = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?w=1024&h=1024`);
        if (!response.ok) throw new Error("Failed to fetch image from AI!");

        const imageUrl = response.url;
        const imageBuffer = await fetch(imageUrl).then(res => res.buffer());

        // ✅ **Watermark Removal (Cropping)**
        const img = await loadImage(imageBuffer);
        const cropHeight = 850;
        const canvas = createCanvas(img.width, cropHeight);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, img.width, cropHeight, 0, 0, img.width, cropHeight);
        const finalBuffer = canvas.toBuffer("image/png");

        return finalBuffer;

    } catch (error) {
        console.error("❌ Image Generation Error:", error);
        throw new Error("Image generation failed!");
    }
}

// **Handler for /image command**
bot.command("image", async (ctx) => {
    const prompt = ctx.message.text.substring(7).trim(); // Extract prompt from command
    if (!prompt) {
        return ctx.reply("Please provide a prompt. Example: /image cat in space");
    }

    try {
        // **⏳ Send "Waiting" Message**
        ctx.reply("Generating image, please wait...").then((msg) => {
            // **🖼️ Generate Image with Default Settings**
            generateImage(prompt)
                .then(imageBuffer => {
                    // **✅ Send Image to Telegram**
                    ctx.replyWithPhoto({ source: imageBuffer }).then(() => {
                        // **🗑️ Delete "Waiting" Message**
                        bot.telegram.deleteMessage(ctx.chat.id, msg.message_id);
                    });
                })
                .catch(error => {
                    console.error("❌ Error:", error);
                    ctx.reply("Failed to generate image.");
                    bot.telegram.deleteMessage(ctx.chat.id, msg.message_id);
                });
        });
    } catch (error) {
        console.error("❌ Error:", error);
        ctx.reply("Failed to generate image.");
    }
});

// **🚀 Inline Query for Image Generation with Options**
bot.on("inline_query", async (ctx) => {
    const query = ctx.inlineQuery.query.trim();

    if (!query) {
        return ctx.answerInlineQuery([]); // Empty result if no query
    }

    const imageStyles = [
        { type: "realistic", label: "Realistic" },
        { type: "cartoon", label: "Cartoon" },
        { type: "anime", label: "Anime" },
        { type: "artistic", label: "Artistic" },
    ];

    const results = await Promise.all(
        imageStyles.map(async (style) => {
            try {
                const imageBuffer = await generateImage(query, style.type);
                const photo = {
                    type: "photo",
                    id: style.type,
                    photo: { source: imageBuffer },
                    title: `Generate ${style.label} Image`,
                    caption: `Prompt: ${query} - Style: ${style.label}`,
                };
                return photo;
            } catch (error) {
                console.error(`❌ Error generating ${style.label} image:`, error);
                return null; // Handle errors gracefully
            }
        })
    );

    const validResults = results.filter(result => result !== null); // Filter out any failed results

    return ctx.answerInlineQuery(validResults, {
        cache_time: 0, // Disable cache for dynamic results
    });
});

// **✨ Additional Features (Example)**
bot.help((ctx) => {
    ctx.reply(`
Available commands:
/image [prompt] - Generates an image based on the prompt.
You can also use inline queries: type @[bot_name] [prompt] to generate images with different styles.
`);
});

// **🛡️ Error Handling**
bot.catch((err, ctx) => {
    console.error("❌ Bot Error:", err);
    ctx.reply("An error occurred. Please try again later.");
});

// **🚀 Launch the Bot**
bot.launch();

// **Graceful Shutdown**
process.on("SIGINT", () => {
    bot.stop("SIGINT");
    process.exit(0);
});

// **Bypass Inactivity Shutdown (using setInterval)**
setInterval(() => {
    // You can add code here to perform a simple task,
    // like logging a message or sending a ping to the bot,
    // to keep it active and prevent it from being shut down
    // due to inactivity.
    console.log("Bot is still active...");
}, 20 * 60 * 1000); // Every 20 minutes
