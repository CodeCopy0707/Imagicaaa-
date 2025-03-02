const { Telegraf } = require("telegraf");
const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");

// 🚀 **Telegram Bot Setup**
const BOT_TOKEN = "7813374449:AAENBb8BN8_oD2QOSP31tKO6WjpS4f0Dt4g"; // BotFather se liya hua token yahan daalo
const bot = new Telegraf(BOT_TOKEN);

const app = express();
app.use(express.json());

// 📌 **Image Generate Karne Ka Function**
async function generateImage(prompt) {
  try {
    // ✅ **Prompt Modify Karke Extra Details Add Karna**
    const tuningText =
      ", ultra high resolution, 4K, realistic, professional lighting, cinematic";
    prompt += tuningText;

    // ✅ **AI API Se Image Fetch Karna**
    const response = await fetch(
      `https://image.pollinations.ai/prompt/${encodeURIComponent(
        prompt
      )}?w=1024&h=1024`
    );
    if (!response.ok) throw new Error("AI se image generate karne me error!");

    // ✅ **Image Buffer Me Convert Karna**
    const imageUrl = response.url;
    const imageBuffer = await fetch(imageUrl).then((res) => res.buffer());

    // ✅ **Watermark Remove Karne Ke Liye Cropping**
    const img = await loadImage(imageBuffer);
    const cropHeight = 850;
    const canvas = createCanvas(img.width, cropHeight);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      img,
      0,
      0,
      img.width,
      cropHeight,
      0,
      0,
      img.width,
      cropHeight
    );

    // ✅ **Final Cropped Image Buffer**
    return canvas.toBuffer("image/png");
  } catch (error) {
    console.error("❌ Error Generating Image:", error);
    return null;
  }
}

// 🚀 **Telegram Bot Commands**
bot.command("generate", async (ctx) => {
  const prompt = ctx.message.text.substring(10); // Remove "/generate "
  ctx.reply("🖼 Generating your AI image... Please wait!");

  const imageBuffer = await generateImage(
    prompt +
      " telegraf se bnao and ye 40 sec inactivate pe bnd usse bypass render pe uske liye mechinsms @https://imagicaaa.onrender.com"
  );
  if (imageBuffer) {
    ctx.sendPhoto({ source: imageBuffer }, { caption: "🎨 Here is your AI-generated image!" });
  } else {
    ctx.reply("❌ Image generation failed!");
  }
});

// **🚀 Express Server Start (Optional)**
const PORT = 3000;

// Keep the Render server alive (Heroku-like)
setInterval(() => {
  fetch("https://imagicaaa.onrender.com")
    .then((res) => console.log("ping render server"))
    .catch((err) => console.error("Error pinging render:", err));
}, 25 * 60 * 1000); // every 25 minutes

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
