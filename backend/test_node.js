const axios = require('axios');

async function test() {
  try {
    const r = await axios.get("http://localhost:5003/api/alert-config", { timeout: 2000 });
    const bridgeConfig = r.data;
    console.log("Config:", bridgeConfig);

    const bot = bridgeConfig.telegram_bot_token;
    const chat = bridgeConfig.telegram_news_chat_id;
    const thread = bridgeConfig.telegram_thread_news;

    const url = `https://api.telegram.org/bot${bot}/sendMessage`;
    const payload = {
      chat_id: chat,
      text: "🟢 **BUY EURUSD** @ `1.0500`",
      parse_mode: "Markdown"
    };
    if (thread) payload.message_thread_id = parseInt(thread, 10);
    
    console.log("Sending payload:", payload);
    const res = await axios.post(url, payload, { timeout: 10000 });
    console.log("Success!", res.data);
  } catch (e) {
    console.error("Error:", e.response ? e.response.data : e.message);
  }
}
test();
