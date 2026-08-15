import axios from "axios";

export async function sendDiscord(webhookUrl: string, content: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const res = await axios.post(webhookUrl, {
      content: content.slice(0, 1900)
    }, { timeout: 10000 });
    return { ok: res.status >= 200 && res.status < 300, status: res.status };
  } catch (error: any) {
    console.warn("Discord send failed:", error.message);
    return { ok: false, error: error.message };
  }
}

export async function sendTelegram(botToken: string, chatId: string, content: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await axios.post(url, {
      chat_id: chatId,
      text: content.slice(0, 3900),
      parse_mode: "Markdown"
    }, { timeout: 10000 });
    return { ok: res.status >= 200 && res.status < 300, status: res.status };
  } catch (error: any) {
    console.warn("Telegram send failed:", error.message);
    return { ok: false, error: error.message };
  }
}

export async function dispatchAlert(
  apiKeys: Record<string, string>,
  content: string,
  channels?: string[],
  category?: string
): Promise<{ ok: boolean; sent: string[]; results: Record<string, any>; reason?: string }> {
  const results: Record<string, any> = {};
  const sent: string[] = [];
  
  let bridgeConfig: any = {};
  try {
    const r = await axios.get("http://localhost:5003/api/alert-config", { timeout: 2000 });
    bridgeConfig = r.data;
  } catch (e) {
    console.warn("Failed to fetch alert config from bridge");
  }

  // Use bridge config (if available) or fallback to apiKeys (legacy)
  if (bridgeConfig.alerts_paused) return { ok: false, sent: [], results: {}, reason: "Global alerts paused" };
  if (category && bridgeConfig[`${category}_paused`]) return { ok: false, sent: [], results: {}, reason: `${category} alerts paused` };

  let discord = bridgeConfig.discord_news_webhook || apiKeys?.discord_webhook;
  if (category === "calendar") discord = bridgeConfig.discord_calendar_webhook || discord;
  else if (category === "signals") discord = bridgeConfig.discord_signals_webhook || discord;
  else if (category === "executions") discord = bridgeConfig.discord_alerts_webhook || discord;

  const bot = bridgeConfig.telegram_bot_token || apiKeys?.telegram_bot_token;
  const chat = bridgeConfig.telegram_chat_id || bridgeConfig.telegram_news_chat_id || apiKeys?.telegram_chat_id;
  
  let thread = bridgeConfig.telegram_thread_news;
  if (category === "calendar") thread = bridgeConfig.telegram_thread_calendar;
  else if (category === "signals") thread = bridgeConfig.telegram_thread_signals;
  else if (category === "executions") thread = bridgeConfig.telegram_thread_alerts;

  const wantsAll = !channels;

  const tasks: Promise<void>[] = [];

  if (discord && (wantsAll || channels.includes("discord"))) {
    tasks.push(
      sendDiscord(discord, content).then(res => {
        results["discord"] = res;
        if (res.ok) sent.push("discord");
      })
    );
  }

  if (bot && chat && (wantsAll || channels.includes("telegram"))) {
    // If thread is provided, we can append it to the content or use the sendTelegram function signature if updated.
    // For now, we will just pass chat, since sendTelegram only takes chat_id.
    // If thread is needed, telegram API needs message_thread_id.
    // Let's modify sendTelegram inline call.
    const url = `https://api.telegram.org/bot${bot}/sendMessage`;
    const payload: any = {
      chat_id: chat,
      text: content.slice(0, 3900),
      parse_mode: "Markdown"
    };
    if (thread) payload.message_thread_id = parseInt(thread, 10);

    tasks.push(
      axios.post(url, payload, { timeout: 10000 }).then(res => {
        results["telegram"] = { ok: true, status: res.status };
        sent.push("telegram");
      }).catch((err: any) => {
        results["telegram"] = { ok: false, error: err.message };
      })
    );
  }

  if (tasks.length === 0) {
    return { ok: false, sent: [], results: {}, reason: "no channels configured" };
  }

  await Promise.all(tasks);

  const ok = Object.values(results).some(r => r.ok);
  return { ok, sent, results };
}

export function fmtTradeOpen(
  symbol: string,
  side: string,
  volume: number,
  entry: number,
  sl?: number,
  tp?: number
): string {
  const sideIcon = side.toUpperCase() === "BUY" ? "🟢" : "🔴";
  const parts = [
    `${sideIcon} **${side.toUpperCase()} ${symbol}** @ \`${entry}\``,
    `Volume: \`${volume}\` lots`
  ];
  if (sl !== undefined && sl !== null) parts.push(`SL: \`${sl}\``);
  if (tp !== undefined && tp !== null) parts.push(`TP: \`${tp}\``);
  return parts.join(" · ");
}

export function fmtTradeClose(
  symbol: string,
  side: string,
  exitP: number,
  pnl: number
): string {
  const icon = pnl >= 0 ? "✅" : "❌";
  const pnlSign = pnl >= 0 ? "+" : "";
  return `${icon} **CLOSED ${side} ${symbol}** @ \`${exitP}\` · P&L: \`$${pnlSign}${pnl.toFixed(2)}\``;
}

export function fmtNews(tag: string, headline: string, impact = "med"): string {
  const icon = impact === "high" ? "🔴" : impact === "med" ? "🟡" : "🟢";
  return `${icon} **${tag}**: ${headline}`;
}
