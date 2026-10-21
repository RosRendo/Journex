import axios from "axios";
import fs from "fs";
import path from "path";

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
    const r = await axios.get("http://localhost:5003/api/alert-config", { timeout: 1500 });
    bridgeConfig = r.data || {};
  } catch (e) {
    // Fallback: read directly from alert_config.json on disk
    try {
      const candidates = [
        path.resolve(process.cwd(), "alert_config.json"),
        path.resolve(process.cwd(), "..", "alert_config.json"),
        path.resolve(__dirname, "../../../alert_config.json"),
        "d:/FOR RENDO (ONLY )/Personal Project/Dashboard/alert_config.json"
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          bridgeConfig = JSON.parse(fs.readFileSync(p, "utf-8"));
          break;
        }
      }
    } catch (fsErr) {
      console.warn("Failed to fetch alert config from bridge or file");
    }
  }

  // Use bridge config (if available) or fallback to apiKeys (legacy)
  if (bridgeConfig.alerts_paused) return { ok: false, sent: [], results: {}, reason: "Global alerts paused" };
  if (category && bridgeConfig[`${category}_paused`]) return { ok: false, sent: [], results: {}, reason: `${category} alerts paused` };

  let discord = bridgeConfig.discord_news_webhook || apiKeys?.discord_webhook;
  if (category === "calendar") discord = bridgeConfig.discord_calendar_webhook || discord;
  else if (category === "signals") discord = bridgeConfig.discord_signals_webhook || discord;
  else if (category === "executions") discord = bridgeConfig.discord_alerts_webhook || discord;

  const bot = bridgeConfig.telegram_bot_token || apiKeys?.telegram_bot_token;
  let chat = bridgeConfig.telegram_chat_id || bridgeConfig.telegram_news_chat_id || apiKeys?.telegram_chat_id;
  if (category === "signals" && bridgeConfig.telegram_chat_signals) chat = bridgeConfig.telegram_chat_signals;
  else if (category === "executions" && bridgeConfig.telegram_chat_alerts) chat = bridgeConfig.telegram_chat_alerts;
  else if (category === "news" && (bridgeConfig.telegram_chat_news || bridgeConfig.telegram_news_chat_id)) chat = bridgeConfig.telegram_chat_news || bridgeConfig.telegram_news_chat_id;
  else if (category === "calendar" && (bridgeConfig.telegram_chat_calendar || bridgeConfig.telegram_cal_chat_id)) chat = bridgeConfig.telegram_chat_calendar || bridgeConfig.telegram_cal_chat_id;
  
  let thread: string | undefined = undefined;
  if (category === "calendar") thread = bridgeConfig.telegram_thread_calendar;
  else if (category === "signals") thread = bridgeConfig.telegram_thread_signals;
  else if (category === "executions") thread = bridgeConfig.telegram_thread_alerts;
  else if (category === "news") thread = bridgeConfig.telegram_thread_news;
  else thread = bridgeConfig.telegram_thread_alerts || bridgeConfig.telegram_thread_signals;

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
    if (thread && String(thread).trim() !== "" && String(thread).trim() !== "1") {
      payload.message_thread_id = parseInt(thread, 10);
    }

    tasks.push(
      axios.post(url, payload, { timeout: 10000 }).then(res => {
        results["telegram"] = { ok: true, status: res.status };
        sent.push("telegram");
      }).catch(async (err: any) => {
        // Retry without parse_mode in case Markdown formatting triggered 400
        try {
          const fallbackPayload = { ...payload };
          delete fallbackPayload.parse_mode;
          const retryRes = await axios.post(url, fallbackPayload, { timeout: 10000 });
          results["telegram"] = { ok: true, status: retryRes.status };
          sent.push("telegram");
        } catch (retryErr: any) {
          results["telegram"] = { ok: false, error: retryErr.message };
        }
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

export function fmtDate(date?: Date | string | number): string {
  const d = date ? new Date(date) : new Date();
  // Cambodia Timezone: UTC+7 (Indochina Time)
  const offsetMs = 7 * 60 * 60 * 1000;
  const cambodia = new Date(d.getTime() + offsetMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = cambodia.getUTCFullYear();
  const mm = pad(cambodia.getUTCMonth() + 1);
  const dd = pad(cambodia.getUTCDate());
  const hh = pad(cambodia.getUTCHours());
  const min = pad(cambodia.getUTCMinutes());
  const ss = pad(cambodia.getUTCSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} (UTC+7)`;
}

export function fmtTradeOpen(
  symbol: string,
  side: string,
  volume: number,
  entry: number,
  sl?: number,
  tp?: number,
  timestamp?: string | Date
): string {
  const sideIcon = side.toUpperCase() === "BUY" ? "🟢" : "🔴";
  const timeStr = fmtDate(timestamp);
  const parts = [
    `${sideIcon} **${side.toUpperCase()} ${symbol}** @ \`${entry}\``,
    `📅 \`${timeStr}\``,
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
  pnl: number,
  timestamp?: string | Date
): string {
  const icon = pnl >= 0 ? "✅" : "❌";
  const pnlSign = pnl >= 0 ? "+" : "";
  const timeStr = fmtDate(timestamp);
  return `${icon} **CLOSED ${side} ${symbol}** @ \`${exitP}\` · 📅 \`${timeStr}\` · P&L: \`$${pnlSign}${pnl.toFixed(2)}\``;
}

export function fmtSignal(
  symbol: string,
  side: string,
  entry: number,
  sl?: number,
  tp?: number,
  timeframe?: string,
  grade?: string,
  score?: number,
  reason?: string,
  timestamp?: string | Date,
  confluenceDetails?: {
    checklist?: string[];
    minScore?: number;
    passed?: boolean;
    riskReward?: number | string;
    tp1?: number | { price: number; reason?: string; rr?: number };
    tp2?: number | { price: number; reason?: string; rr?: number };
    tp3?: number | { price: number; reason?: string; rr?: number };
    isReversal?: boolean;
    previousType?: string;
  }
): string {
  const sideIcon = side.toUpperCase() === "BUY" ? "🟢" : "🔴";
  const timeStr = fmtDate(timestamp);
  const tf = timeframe ? ` (${timeframe})` : "";
  const grd = grade ? ` [${grade}]` : "";
  
  const isReversal = confluenceDetails?.isReversal;
  const prevType = confluenceDetails?.previousType ? confluenceDetails.previousType.toUpperCase() : (side.toUpperCase() === "BUY" ? "SELL" : "BUY");
  const header = isReversal
    ? `🚨 **TREND REVERSAL ALERT** — ${sideIcon} ${side.toUpperCase()} **${symbol}**${tf}${grd}\n⚡ *Structure shift: Previous ${prevType} invalidated — momentum flipped to ${side.toUpperCase()}!*`
    : `🔔 **NEW SCANNER SIGNAL** — ${sideIcon} ${side.toUpperCase()} **${symbol}**${tf}${grd}`;

  const lines = [
    header,
    `📅 **Date/Time**: \`${timeStr}\``,
    `💵 **Entry**: \`${entry}\``
  ];

  if (sl !== undefined && sl !== null) lines.push(`🛑 **SL**: \`${sl}\``);

  // Decimal precision helper
  const entryStr = String(entry);
  const decMatches = entryStr.split(".")[1];
  const digits = decMatches ? decMatches.length : (symbol.includes("JPY") ? 3 : (symbol.includes("EUR") || symbol.includes("GBP") ? 5 : 2));

  // Extract explicit or calculated TP1, TP2, TP3
  const getTpPrice = (val: any) => {
    if (typeof val === "number") return val;
    if (val && typeof val.price === "number") return val.price;
    return undefined;
  };

  const rawTp1 = getTpPrice(confluenceDetails?.tp1);
  const rawTp2 = getTpPrice(confluenceDetails?.tp2) ?? tp;
  const rawTp3 = getTpPrice(confluenceDetails?.tp3);

  const isBuy = side.toUpperCase() === "BUY";
  const riskDist = (sl !== undefined && sl !== null && entry !== undefined) ? Math.abs(entry - sl) : 0;

  const tp1Val = rawTp1 ?? (riskDist > 0 ? Number((isBuy ? entry + riskDist * 1.2 : entry - riskDist * 1.2).toFixed(digits)) : undefined);
  const tp2Val = rawTp2 ?? (riskDist > 0 ? Number((isBuy ? entry + riskDist * 2.5 : entry - riskDist * 2.5).toFixed(digits)) : undefined);
  const tp3Val = rawTp3 ?? (riskDist > 0 ? Number((isBuy ? entry + riskDist * 4.0 : entry - riskDist * 4.0).toFixed(digits)) : undefined);

  if (tp1Val !== undefined) {
    lines.push(`🎯 **TP1 (Partial / 1:1.2)**: \`${tp1Val}\``);
  }
  if (tp2Val !== undefined) {
    lines.push(`🎯 **TP2 (Structure / 1:2.5)**: \`${tp2Val}\``);
  }
  if (tp3Val !== undefined) {
    lines.push(`🎯 **TP3 (Runner / 1:4.0)**: \`${tp3Val}\``);
  } else if (!tp1Val && !tp2Val && tp !== undefined && tp !== null) {
    lines.push(`🎯 **TP**: \`${tp}\``);
  }

  if (score !== undefined && score !== null) {
    const minS = confluenceDetails?.minScore ?? 70;
    const isPassed = confluenceDetails?.passed ?? (score >= minS);
    const passTag = isPassed ? `✅ APPROVED (≥${minS})` : `⚠️ LOW SCORE (<${minS})`;
    lines.push(`🏆 **Confluence Score**: \`${score}/100\` [${grade || "A"}] · ${passTag}`);
  }

  if (confluenceDetails?.riskReward) {
    lines.push(`⚖️ **Risk / Reward**: \`${confluenceDetails.riskReward}\``);
  } else if (riskDist > 0) {
    lines.push(`⚖️ **Risk / Reward**: \`1:1.2 (TP1) · 1:2.5 (TP2) · 1:4.0 (TP3)\``);
  }

  if (reason) lines.push(`💡 **Reason**: ${reason}`);
  lines.push(`ℹ️ *For full scoring criteria & rules, type /score*`);

  return lines.join("\n");
}

export function fmtConfluenceRadar(
  items: Array<{
    symbol: string;
    bias: "BUY" | "SELL" | "NEUTRAL";
    score: number;
    grade: string;
    entry?: number;
    sl?: number;
    tp?: number;
    tp1?: number | { price: number; reason?: string; rr?: number };
    tp2?: number | { price: number; reason?: string; rr?: number };
    tp3?: number | { price: number; reason?: string; rr?: number };
    factors: string[];
    passed: boolean;
  }>,
  minScore = 70
): string {
  const timeStr = fmtDate(new Date());
  const lines = [
    `🎯 **LIVE ICT CONFLUENCE RADAR CHECK**`,
    `📅 **Timestamp**: \`${timeStr}\``,
    `⚖️ **Min Confluence Filter**: \`${minScore}/100\``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`
  ];

  for (const item of items) {
    const icon = item.bias === "BUY" ? "🟢" : item.bias === "SELL" ? "🔴" : "⚪";
    const statusIcon = item.passed ? "✅ PASSED" : "⚠️ LOW SCORE";

    const entry = item.entry;
    const isBuy = item.bias === "BUY";
    const risk = (entry !== undefined && item.sl !== undefined) ? Math.abs(entry - item.sl) : 0;
    const digits = item.symbol.includes("JPY") ? 3 : (item.symbol.includes("EUR") || item.symbol.includes("GBP") ? 5 : 2);

    const getTp = (v: any) => {
      if (typeof v === "number") return v;
      if (v && typeof v.price === "number") return v.price;
      return undefined;
    };

    const t1 = getTp(item.tp1) ?? (risk > 0 && entry !== undefined ? Number((isBuy ? entry + risk * 1.2 : entry - risk * 1.2).toFixed(digits)) : undefined);
    const t2 = getTp(item.tp2) ?? item.tp ?? (risk > 0 && entry !== undefined ? Number((isBuy ? entry + risk * 2.5 : entry - risk * 2.5).toFixed(digits)) : undefined);
    const t3 = getTp(item.tp3) ?? (risk > 0 && entry !== undefined ? Number((isBuy ? entry + risk * 4.0 : entry - risk * 4.0).toFixed(digits)) : undefined);

    lines.push(
      `${icon} **${item.symbol}** (${item.bias}) · **Score**: \`${item.score}/100\` [${item.grade}] · \`${statusIcon}\``
    );
    if (entry !== undefined) {
      let lvlStr = `   💵 Entry: \`${entry}\``;
      if (item.sl !== undefined) lvlStr += ` · 🛑 SL: \`${item.sl}\``;
      lines.push(lvlStr);
    }
    if (t1 !== undefined && t2 !== undefined) {
      let tpStr = `   🎯 TP1: \`${t1}\` · TP2: \`${t2}\``;
      if (t3 !== undefined) tpStr += ` · TP3: \`${t3}\``;
      lines.push(tpStr);
    }
    lines.push(
      `   Confluence: ${item.factors.join(" · ")}`,
      ``
    );
  }

  lines.push(`💡 *Send /check <symbol> (e.g. /check XAUUSD) for deep trade audit.*`);
  return lines.join("\n");
}

export function fmtPairConfluenceAudit(detail: {
  symbol: string;
  bias: string;
  currentPrice: number;
  entryZone?: { low: number; high: number; preferred: number };
  sl?: number;
  tp?: number;
  tp1?: number | { price: number; reason?: string; rr?: number };
  tp2?: number | { price: number; reason?: string; rr?: number };
  tp3?: number | { price: number; reason?: string; rr?: number };
  score: number;
  grade: string;
  minScore?: number;
  passed: boolean;
  timeframe?: string;
  session?: string;
  checklist: Array<{ name: string; points: number; max: number; status: string }>;
  reason?: string;
}): string {
  const sideIcon = detail.bias.toUpperCase() === "BUY" ? "🟢" : "🔴";
  const statusStr = detail.passed ? "✅ PASSED (APPROVED)" : "⚠️ FAILED (< MIN SCORE)";
  const timeStr = fmtDate(new Date());

  const entryP = detail.entryZone?.preferred ?? detail.currentPrice;
  const entryStr = String(entryP);
  const decMatches = entryStr.split(".")[1];
  const digits = decMatches ? decMatches.length : (detail.symbol.includes("JPY") ? 3 : (detail.symbol.includes("EUR") || detail.symbol.includes("GBP") ? 5 : 2));

  const getTpPrice = (val: any) => {
    if (typeof val === "number") return val;
    if (val && typeof val.price === "number") return val.price;
    return undefined;
  };

  const rawTp1 = getTpPrice(detail.tp1);
  const rawTp2 = getTpPrice(detail.tp2) ?? detail.tp;
  const rawTp3 = getTpPrice(detail.tp3);

  const isBuy = detail.bias.toUpperCase() === "BUY";
  const riskDist = (detail.sl !== undefined && detail.sl !== null && entryP !== undefined) ? Math.abs(entryP - detail.sl) : 0;

  const tp1Val = rawTp1 ?? (riskDist > 0 ? Number((isBuy ? entryP + riskDist * 1.2 : entryP - riskDist * 1.2).toFixed(digits)) : undefined);
  const tp2Val = rawTp2 ?? (riskDist > 0 ? Number((isBuy ? entryP + riskDist * 2.5 : entryP - riskDist * 2.5).toFixed(digits)) : undefined);
  const tp3Val = rawTp3 ?? (riskDist > 0 ? Number((isBuy ? entryP + riskDist * 4.0 : entryP - riskDist * 4.0).toFixed(digits)) : undefined);

  const lines = [
    `🔍 **ICT CONFLUENCE AUDIT — ${detail.symbol}**`,
    `📅 **Timestamp**: \`${timeStr}\``,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📊 **Bias**: ${sideIcon} **${detail.bias.toUpperCase()}** (${detail.timeframe || "M15"})`,
    `💵 **Current Price**: \`${detail.currentPrice}\``,
    detail.entryZone ? `🎯 **Entry Zone**: \`${detail.entryZone.low} – ${detail.entryZone.high}\` (Pref: \`${detail.entryZone.preferred}\`)` : "",
    detail.sl ? `🛑 **Invalidation (SL)**: \`${detail.sl}\`` : "",
    tp1Val !== undefined ? `🎯 **TP1 (Partial / 1:1.2)**: \`${tp1Val}\`` : "",
    tp2Val !== undefined ? `🎯 **TP2 (Structure / 1:2.5)**: \`${tp2Val}\`` : "",
    tp3Val !== undefined ? `🎯 **TP3 (Runner / 1:4.0)**: \`${tp3Val}\`` : (detail.tp ? `🎯 **Take Profit (TP)**: \`${detail.tp}\`` : ""),
    riskDist > 0 ? `⚖️ **Risk / Reward**: \`1:1.2 (TP1) · 1:2.5 (TP2) · 1:4.0 (TP3)\`` : "",
    `🏆 **Confluence Score**: \`${detail.score}/100\` [${detail.grade}]`,
    `⚖️ **Filter Status**: \`${statusStr}\` (Min: \`${detail.minScore || 70}\`)`,
    detail.session ? `⏰ **Session**: ${detail.session}` : "",
    ``,
    `📋 **Factor Breakdown Checklist**:`,
  ].filter(Boolean);

  for (const c of detail.checklist) {
    const mark = c.status === "valid" || c.status === "CONFIRMED" ? "✅" : "⚪";
    lines.push(`• ${mark} **${c.name}**: \`+${c.points}/${c.max} pts\``);
  }

  if (detail.reason) {
    lines.push(``, `💡 **Setup Logic**: ${detail.reason}`);
  }

  return lines.join("\n");
}


export function fmtNews(
  tag: string,
  headline: string,
  impact = "med",
  timestamp?: string | Date,
  details?: {
    sentiment?: string;
    assetsAffected?: string[];
    tradingImpact?: string;
    actionableNote?: string;
    source?: string;
    url?: string;
    pairSignals?: { symbol: string; formatted: string; note?: string }[];
  }
): string {
  const icon = impact === "high" ? "🔴" : impact === "med" ? "🟡" : "🟢";
  const timeStr = fmtDate(timestamp);
  const lines = [
    `${icon} **${tag}** (\`${timeStr}\`)`,
    `📰 **${headline}**`
  ];
  if (details?.source) {
    lines.push(`📌 **Source**: ${details.source}`);
  }
  if (details?.pairSignals && details.pairSignals.length > 0) {
    lines.push(``);
    lines.push(`🎯 **PAIR IMPACT & SIGNALS**:`);
    for (const ps of details.pairSignals.slice(0, 4)) {
      lines.push(`• **${ps.symbol}**: ${ps.formatted}`);
    }
    lines.push(``);
  } else if (details?.assetsAffected && details.assetsAffected.length > 0) {
    lines.push(`🎯 **Impacted Assets**: \`${details.assetsAffected.join(" · ")}\``);
  }
  if (details?.tradingImpact) {
    lines.push(`⚡ **Trading Impact**: ${details.tradingImpact}`);
  }
  if (details?.actionableNote) {
    lines.push(`💡 **Action Plan**: ${details.actionableNote}`);
  }
  if (details?.url) {
    lines.push(`🔗 **Read Story**: ${details.url}`);
  }
  return lines.join("\n");
}
