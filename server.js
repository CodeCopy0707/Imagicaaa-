require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;
const RENDER_URL = process.env.RENDER_URL; // Add your Render URL

app.get("/", (req, res) => {
    res.send("Pixray AI Telegram Bot is Running! 🚀");
});

// Keep-Alive Mechanism (Bypass 50s timeout)
setInterval(() => {
    if (RENDER_URL) {
        axios.get(RENDER_URL).then(() => {
            console.log("✅ Keep-Alive Ping Sent to Render");
        }).catch((err) => console.log("❌ Keep-Alive Error:", err.message));
    }
}, 30000); // Ping every 30 seconds

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
