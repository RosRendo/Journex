import crypto from "crypto";
import { dispatchAlert, fmtNews } from "./alertsService";

function getHeadlineId(headline: string): string {
  return crypto.createHash("md5").update(headline).digest("hex").slice(0, 12);
}

const seen = new Set<string>();
const seenOrder: string[] = [];
const MAX_SEEN = 1000;
let bootstrapped = false;

export async function runNewsAlertsLoop(
  getNews: () => Promise<any[]>,
  getApiKeys: () => Record<string, string>
) {
  try {
    const items = await getNews();
    const keys = getApiKeys();
    const hasChannel = !!(keys.discord_webhook || (keys.telegram_bot_token && keys.telegram_chat_id));

    for (const h of items) {
      const headline = h.headline || "";
      const hid = getHeadlineId(headline);
      if (seen.has(hid)) continue;

      if (seenOrder.length >= MAX_SEEN) {
        const old = seenOrder.shift();
        if (old) seen.delete(old);
      }
      seenOrder.push(hid);
      seen.add(hid);

      // Don't alert on the very first boot of the watcher to prevent spamming
      if (!bootstrapped) continue;

      const impact = (h.impact || "").toLowerCase();
      const tag = (h.tag || "").toUpperCase();

      if (impact === "high" || tag === "BREAKING") {
        if (hasChannel) {
          try {
            await dispatchAlert(keys, fmtNews(tag || "NEWS", headline, impact || "med"), undefined, "news");
          } catch (err: any) {
            console.warn("News alert dispatch failed:", err.message);
          }
        }
      }
    }
    bootstrapped = true;
  } catch (error: any) {
    console.warn("News alerts loop iteration failed:", error.message);
  }
}

export function startNewsWatcher(
  getNews: () => Promise<any[]>,
  getApiKeys: () => Record<string, string>,
  intervalMs = 60000
) {
  // First iteration immediately
  runNewsAlertsLoop(getNews, getApiKeys).then(() => {
    setInterval(() => {
      runNewsAlertsLoop(getNews, getApiKeys);
    }, intervalMs);
    console.log(`[NEWS WATCHER] Background news watcher started (${intervalMs / 1000}s interval)`);
  }).catch(err => {
    console.error("Failed to start initial news watcher pass:", err);
  });
}
