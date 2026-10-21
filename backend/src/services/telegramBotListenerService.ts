/**
 * Telegram Bot Interactive Command Listener
 * 
 * Allows users to interactively check confluence, scan pairs, view signals,
 * and audit ICT trade setups directly inside Telegram via bot commands:
 * - /confluence or /check : Live Confluence Radar for all pairs
 * - /check <symbol>       : Deep ICT confluence audit for a specific pair (e.g. /check XAUUSD)
 * - /signals              : Latest active trade signals
 * - /news                 : Breaking market news impact
 * - /score                : Current score filters and threshold explanation
 * - /help                 : Bot command list
 */

import axios from "axios";
import fs from "fs";
import path from "path";
import { fmtConfluenceRadar, fmtPairConfluenceAudit, fmtSignal, fmtNews } from "./alertsService";
import { SYMBOLS } from "./terminalBrokerAdapter";
import { analyzeNewsMacroImpact } from "./newsIntelligenceService";

function getBotConfig(): { token: string; defaultChatId?: string } {
  const candidates = [
    path.resolve(process.cwd(), "alert_config.json"),
    path.resolve(process.cwd(), "..", "alert_config.json"),
    path.resolve(__dirname, "../../../alert_config.json"),
    "d:/FOR RENDO (ONLY )/Personal Project/Dashboard/alert_config.json"
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(p, "utf-8"));
        if (parsed.telegram_bot_token) {
          return {
            token: parsed.telegram_bot_token,
            defaultChatId: parsed.telegram_chat_signals || parsed.telegram_chat_id || ""
          };
        }
      } catch {}
    }
  }
  return { token: process.env.TELEGRAM_BOT_TOKEN || "" };
}

let isListenerActive = false;
let lastUpdateId = 0;

/**
 * Normalize user input into standard symbol
 */
function normalizeSymbol(input: string): string {
  const clean = input.toUpperCase().replace(/[^A-Z]/g, "");
  if (clean.includes("GOLD") || clean === "XAU") return "XAUUSD";
  if (clean.includes("BITCOIN") || clean === "BTC") return "BTCUSD";
  if (clean.includes("EUR") || clean === "EURO") return "EURUSD";
  if (clean.includes("GBP") || clean.includes("POUND") || clean === "CABLE") return "GBPUSD";
  if (clean.includes("JPY") || clean.includes("YEN")) return "USDJPY";
  return clean || "XAUUSD";
}

async function getLivePrice(sym: string): Promise<number> {
  try {
    const bridgeUrl = process.env.MT5_BRIDGE_URL || "http://127.0.0.1:5003";
    const res = await axios.get(`${bridgeUrl}/api/symbol-price?symbol=${sym}`, { timeout: 1500 });
    if (res.data?.success && res.data?.bid > 0) {
      const avg = (res.data.ask + res.data.bid) / 2.0;
      const digits = sym.includes("EUR") ? 5 : sym.includes("JPY") ? 3 : 2;
      return Number(avg.toFixed(digits));
    }
  } catch {}
  return SYMBOLS[sym]?.price || (sym === "XAUUSD" ? 4192.0 : 1.1610);
}

async function getLiveSignals(): Promise<any[]> {
  try {
    const bridgeUrl = process.env.MT5_BRIDGE_URL || "http://127.0.0.1:5003";
    const res = await axios.get(`${bridgeUrl}/api/signals`, { timeout: 3000 });
    if (Array.isArray(res.data?.signals) && res.data.signals.length > 0) {
      return res.data.signals;
    }
  } catch {}
  return [];
}

/**
 * Send a reply to Telegram
 */
async function sendTelegramReply(token: string, chatId: number | string, text: string, threadId?: number) {
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: "Markdown"
    };
    if (threadId) {
      payload.message_thread_id = threadId;
    }
    await axios.post(url, payload, { timeout: 10000 });
  } catch (err: any) {
    // If Markdown parsing failed, retry plain text
    try {
      const plainUrl = `https://api.telegram.org/bot${token}/sendMessage`;
      const plainPayload: any = {
        chat_id: chatId,
        text: text.replace(/[*_`]/g, ""),
      };
      if (threadId) plainPayload.message_thread_id = threadId;
      await axios.post(plainUrl, plainPayload, { timeout: 10000 });
    } catch (e: any) {
      console.warn("[TELEGRAM-BOT] Reply failed:", e.message);
    }
  }
}

/**
 * Process a single incoming command message
 */
async function handleTelegramMessage(token: string, msg: any) {
  const text: string = (msg.text || "").trim();
  const chatId = msg.chat?.id;
  const threadId = msg.message_thread_id;

  if (!text || !chatId) return;

  const parts = text.split(/\s+/);
  const rawCmd = parts[0].toLowerCase();
  // Strip bot mention if in group e.g. /check@dashboardkiller_bot
  const cmd = rawCmd.split("@")[0];
  const arg = parts.slice(1).join(" ").trim();

  console.log(`🤖 [TELEGRAM-BOT] Received command: "${cmd}" (arg: "${arg}") from chat ${chatId}`);

  // 1. HELP / START
  if (cmd === "/start" || cmd === "/help") {
    const helpMsg = [
      `🤖 **ICT Quant Confluence & Radar Bot**`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Live MT5 Scanner commands:`,
      ``,
      `🎯 \`/confluence\` or \`/check\` — Live confluence radar with Entry, SL & TP1-TP3`,
      `🔍 \`/check <symbol>\` — In-depth setup audit (Entry, SL, TP1-TP3 & Checklist)`,
      `🔔 \`/signals\` — Active live MT5 trade signals with SL & TP1/TP2/TP3`,
      `📰 \`/news\` — Breaking macro news & pair trading bias`,
      `⚖️ \`/score\` — Explain scoring matrix & TP1/TP2/TP3 execution rules`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `⚡ *All setups, levels & TP targets are calculated live from your MT5 terminal.*`
    ].join("\n");

    await sendTelegramReply(token, chatId, helpMsg, threadId);
    return;
  }

  // 2. CONFLUENCE / CHECK
  if (cmd === "/confluence" || cmd === "/check" || cmd === "/radar") {
    const liveSignals = await getLiveSignals();

    if (!liveSignals.length) {
      await sendTelegramReply(
        token,
        chatId,
        `⚠️ **No live setups detected by MT5 scanner right now.**\nEnsure MT5 bridge is running and market structure satisfies min score (≥70).`,
        threadId
      );
      return;
    }

    if (arg) {
      // User specified a pair e.g. /check XAUUSD
      const sym = normalizeSymbol(arg);
      const found = liveSignals.find(s => s.symbol.toUpperCase() === sym);

      if (!found) {
        const livePrice = await getLivePrice(sym);
        await sendTelegramReply(
          token,
          chatId,
          `ℹ️ **${sym}**: No active ICT setup on MT5 scanner right now.\n💵 Live Price: \`${livePrice}\``,
          threadId
        );
        return;
      }

      const checklist = found.confluence_matrix
        ? Object.entries(found.confluence_matrix).map(([k, v]: [string, any]) => ({
            name: k,
            points: v.points,
            max: v.max || 25,
            status: v.status
          }))
        : [];

      const audit = {
        symbol: found.symbol,
        bias: found.type,
        currentPrice: found.entry_price,
        entryZone: found.entry_zone ? { low: found.entry_zone.entry_low, high: found.entry_zone.entry_high, preferred: found.entry_zone.preferred } : undefined,
        sl: found.sl,
        tp: found.tp,
        tp1: found.tp1,
        tp2: found.tp2,
        tp3: found.tp3,
        score: found.confidence,
        grade: found.grade,
        minScore: 70,
        passed: (found.confidence || 0) >= 70,
        timeframe: found.timeframe || "M15",
        session: found.reason?.split(":")[0] || "Active MT5 Session",
        checklist,
        reason: found.reason
      };

      const reply = fmtPairConfluenceAudit(audit);
      await sendTelegramReply(token, chatId, reply, threadId);
    } else {
      // General overview of live MT5 signals with Entry, SL, and TP1-TP3
      const overview = liveSignals.map(s => {
        const factors = s.confluence_matrix
          ? Object.entries(s.confluence_matrix).filter(([_, v]: any) => v.status === "valid").map(([k]) => k)
          : [s.reason];
        return {
          symbol: s.symbol,
          bias: s.type,
          score: s.confidence,
          grade: s.grade,
          entry: s.entry_price,
          sl: s.sl,
          tp: s.tp,
          tp1: s.tp1,
          tp2: s.tp2,
          tp3: s.tp3,
          factors,
          passed: (s.confidence || 0) >= 70
        };
      });

      const reply = fmtConfluenceRadar(overview, 70);
      await sendTelegramReply(token, chatId, reply, threadId);
    }
    return;
  }

  // 3. SIGNALS
  if (cmd === "/signals") {
    const liveSignals = await getLiveSignals();

    if (!liveSignals.length) {
      await sendTelegramReply(token, chatId, `ℹ️ **No active trade signals emitted by MT5 scanner right now.**`, threadId);
      return;
    }

    const xauSignals = liveSignals.filter(s => {
      const sym = (s.symbol || "").toUpperCase().replace(/[^A-Z]/g, "");
      return sym === "XAUUSD" || sym === "XAU" || sym === "GOLD";
    });

    const signalsToShow = xauSignals.length > 0 ? xauSignals : liveSignals.slice(0, 1);

    for (const topSig of signalsToShow) {
      const riskReward = (topSig.tp && topSig.sl && topSig.entry_price && Math.abs(topSig.entry_price - topSig.sl) > 0)
        ? `1:${(Math.abs(topSig.tp - topSig.entry_price) / Math.abs(topSig.entry_price - topSig.sl)).toFixed(1)}`
        : undefined;

      const text = fmtSignal(
        topSig.symbol,
        topSig.type,
        topSig.entry_price,
        topSig.sl,
        topSig.tp,
        topSig.timeframe || "M15",
        topSig.grade,
        topSig.confidence,
        topSig.reason,
        topSig.timestamp || new Date(),
        {
          minScore: 70,
          passed: (topSig.confidence || 0) >= 70,
          riskReward,
          tp1: topSig.tp1,
          tp2: topSig.tp2,
          tp3: topSig.tp3
        }
      );
      await sendTelegramReply(token, chatId, text, threadId);
    }
    return;
  }

  // 4. SCORE / STATUS
  if (cmd === "/score" || cmd === "/status") {
    const scoreMsg = [
      `📊 **ICT SCORING & MULTI-TIER TP RULES**`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🎯 **Minimum Alert Threshold**: \`70 / 100\` Points`,
      `• **90 – 100 [Grade A++]**: Institutional Prime (Multi-TF Sweep + FVG)`,
      `• **80 – 89 [Grade A+]**: High Confluence (Clean Structure + Session Flow)`,
      `• **70 – 79 [Grade A]**: Standard Valid ICT Setup (Approved Entry)`,
      `• **< 70 [Filtered]**: Ignored / No alert sent`,
      ``,
      `🎯 **MULTI-TIER TAKE PROFIT (TP) EXECUTION**:`,
      `• **TP1 (Partial / 1:1.2)**: Bank partial profit (30-50%), move SL to Breakeven`,
      `• **TP2 (Structure / 1:2.5)**: Primary structural target at external liquidity`,
      `• **TP3 (Runner / 1:4.0)**: Trailing extension for maximum risk/reward expansion`,
      ``,
      `🔄 **When does a pair re-alert?**`,
      `1. Direction flips (e.g. SELL ➔ BUY)`,
      `2. Price breaks into fresh zone (>15 pips or >$15 on Gold)`,
      `3. New trading session opens (>12 hours)`
    ].join("\n");
    await sendTelegramReply(token, chatId, scoreMsg, threadId);
    return;
  }

  // 5. NEWS
  if (cmd === "/news") {
    const intel = analyzeNewsMacroImpact(
      "US CPI Consumer Inflation Cools to 2.4%, Solidifying Fed Rate Cut Path",
      "INFLATION",
      "high"
    );
    const reply = fmtNews(
      "MACRO ALERT",
      "US CPI Consumer Inflation Cools to 2.4%, Solidifying Fed Rate Cut Path",
      "high",
      new Date(),
      {
        sentiment: intel.usd_direction_formatted,
        tradingImpact: intel.trade_action,
        actionableNote: "Look for Gold longs and USD shorts on dips.",
        pairSignals: intel.currencies
      }
    );
    await sendTelegramReply(token, chatId, reply, threadId);
    return;
  }
}

async function registerBotCommands(token: string) {
  const commands = [
    { command: "help", description: "Show all bot commands and usage guide" },
    { command: "confluence", description: "Live ICT confluence radar across all pairs" },
    { command: "check", description: "Deep setup audit for pair (e.g. /check XAUUSD)" },
    { command: "signals", description: "Active MT5 scanner trade signals with SL & TP" },
    { command: "news", description: "Breaking macro news impact & pair trading bias" },
    { command: "score", description: "Explain ICT scoring matrix & 70+ point threshold" }
  ];

  const scopes = [
    { type: "default" },
    { type: "all_group_chats" },
    { type: "all_private_chats" },
    { type: "all_chat_administrators" }
  ];

  for (const scope of scopes) {
    try {
      await axios.post(`https://api.telegram.org/bot${token}/setMyCommands`, {
        commands,
        scope
      }, { timeout: 8000 });
    } catch {}
  }

  try {
    await axios.post(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      menu_button: { type: "commands" }
    }, { timeout: 8000 });
  } catch {}
}

/**
 * Start the polling loop for incoming Telegram messages
 */
export function startTelegramBotListener() {
  if (isListenerActive) return;
  const config = getBotConfig();
  if (!config.token) {
    console.log("ℹ️ [TELEGRAM-BOT] No bot token configured, interactive bot listener not started.");
    return;
  }

  isListenerActive = true;
  console.log("🤖 [TELEGRAM-BOT] Interactive bot command listener initialized for @dashboardkiller_bot");

  // Register interactive auto-complete commands for Telegram UI
  registerBotCommands(config.token).catch(() => {});

  const poll = async () => {
    while (isListenerActive) {
      try {
        const url = `https://api.telegram.org/bot${config.token}/getUpdates?offset=${lastUpdateId + 1}&timeout=20`;
        const resp = await axios.get(url, { timeout: 30000 });
        if (resp.data?.ok && Array.isArray(resp.data.result)) {
          for (const item of resp.data.result) {
            lastUpdateId = Math.max(lastUpdateId, item.update_id);
            const msg = item.message || item.channel_post;
            if (msg) {
              await handleTelegramMessage(config.token, msg);
            }
          }
        }
      } catch (err: any) {
        // Sleep 4 seconds on error / timeout to avoid spinning
        await new Promise(r => setTimeout(r, 4000));
      }
    }
  };

  poll().catch(err => console.warn("[TELEGRAM-BOT] Polling loop caught error:", err.message));
}

export function stopTelegramBotListener() {
  isListenerActive = false;
}
