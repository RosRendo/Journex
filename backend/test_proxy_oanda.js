const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const proxyUrl = process.env.OANDA_PROXY_URL || "http://fvtpyskr:atzg4nqjzpp0@38.154.203.95:5863";
const agent = new HttpsProxyAgent(proxyUrl);

const token = "98c931a8b85c5288dcf373eb7a36a5f3-c382b60af9bcedb3f49815834feae859";
const accountId = "101-011-39362416-001";
const baseUrl = "https://api-fxpractice.oanda.com";

async function testPing() {
  try {
    const startTime = Date.now();
    const res = await axios({
      method: "GET",
      url: `${baseUrl}/v3/accounts/${accountId}/summary`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      httpsAgent: agent,
      timeout: 10000
    });
    console.log(`Ping Success in ${Date.now() - startTime}ms:`, res.data);
  } catch (err) {
    console.error("Ping Error:", err.message);
    if (err.response) {
      console.error("Response:", err.response.status, err.response.data);
    }
  }
}

async function testPricing() {
  try {
    const startTime = Date.now();
    const res = await axios({
      method: "GET",
      url: `${baseUrl}/v3/accounts/${accountId}/pricing?instruments=EUR_USD`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      httpsAgent: agent,
      timeout: 10000
    });
    console.log(`Pricing Success in ${Date.now() - startTime}ms:`, res.data);
  } catch (err) {
    console.error("Pricing Error:", err.message);
  }
}

testPing().then(testPricing);
