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
  channels?: string[]
): Promise<{ ok: boolean; sent: string[]; results: Record<string, any>; reason?: string }> {
  const results: Record<string, any> = {};
  const sent: string[] = [];
  const discord = apiKeys?.discord_webhook;
  const bot = apiKeys?.telegram_bot_token;
  const chat = apiKeys?.telegram_chat_id;
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
    tasks.push(
      sendTelegram(bot, chat, content).then(res => {
        results["telegram"] = res;
        if (res.ok) sent.push("telegram");
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
