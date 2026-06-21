import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { getSettings } from "../routes/terminalRoutes";
// @ts-ignore
import { HttpsProxyAgent } from "https-proxy-agent";

const prisma = new PrismaClient();

export async function syncBrokerTrades(userId: string) {
  const settings = getSettings();
  if (!settings || !settings.broker) {
    throw new Error("No broker configured");
  }

  const { provider, account_id, api_key, base_url } = settings.broker;
  let newTradesCount = 0;

  if (provider === "mt5_bridge") {
    newTradesCount = await syncMT5Trades(userId, base_url || "http://localhost:5003");
  } else if (provider === "oanda") {
    newTradesCount = await syncOandaTrades(userId, api_key, account_id, base_url || "https://api-fxpractice.oanda.com");
  } else {
    throw new Error(`Sync not implemented for provider: ${provider}`);
  }

  return newTradesCount;
}

async function syncMT5Trades(userId: string, baseUrl: string) {
  try {
    const res = await axios.get(`${baseUrl}/api/history`);
    if (!res.data || !res.data.success) {
      throw new Error("MT5 bridge returned failure");
    }

    const trades = res.data.trades || [];
    return await processImportedTrades(userId, trades, "MT5");
  } catch (error: any) {
    console.error("Failed to sync MT5 trades:", error.message);
    throw new Error(`MT5 Sync Failed: ${error.message}`);
  }
}

async function syncOandaTrades(userId: string, token: string, accountId: string, baseUrl: string) {
  try {
    const proxyUrl = process.env.OANDA_PROXY_URL || "";
    const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

    // Fetch transactions of type ORDER_FILL to reconstruct closed trades
    // To keep it simple and robust, Oanda provides /trades to list open, but for closed we use /transactions
    // This is a simplified extraction for TradeZella-like sync.
    const res = await axios.get(`${baseUrl}/v3/accounts/${accountId}/transactions?type=ORDER_FILL&count=200`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      httpsAgent: agent,
      timeout: 10000
    });

    const transactions = res.data.transactions || [];
    const closedTrades = transactions.filter((t: any) => t.tradesClosed && t.tradesClosed.length > 0);
    
    const parsedTrades = [];
    for (const tx of closedTrades) {
      for (const closed of tx.tradesClosed) {
        parsedTrades.push({
          ticket: closed.tradeID,
          symbol: tx.instrument.replace("_", ""),
          direction: parseFloat(closed.units) > 0 ? "SELL" : "BUY", // units are negative if closing a long
          lot_size: Math.abs(parseFloat(closed.units)),
          entry: 0, // In Oanda, entry price of closed trade isn't strictly in this sub-object without fetching original trade
          close_price: parseFloat(tx.price),
          profit: parseFloat(closed.realizedPL),
          close_time: new Date(tx.time).getTime() / 1000,
          date: new Date(tx.time).toISOString(),
          commission: parseFloat(closed.financing) // Financing/Commission
        });
      }
    }

    return await processImportedTrades(userId, parsedTrades, "OANDA");
  } catch (error: any) {
    console.error("Failed to sync Oanda trades:", error.message);
    throw new Error(`Oanda Sync Failed: ${error.message}`);
  }
}

async function processImportedTrades(userId: string, trades: any[], brokerName: string) {
  let inserted = 0;
  for (const t of trades) {
    if (!t.ticket) continue;

    // Check if trade already exists
    const existing = await prisma.trade.findFirst({
      where: { ticket: String(t.ticket), userId: userId }
    });

    if (!existing) {
      // Determine Outcome
      const profit = parseFloat(t.profit) || 0;
      let outcome = "BreakEven";
      if (profit > 0) outcome = "Win";
      if (profit < 0) outcome = "Loss";

      await prisma.trade.create({
        data: {
          userId: userId,
          date: t.date ? new Date(t.date) : new Date(),
          pair: t.symbol,
          direction: t.direction,
          entry: parseFloat(t.entry) || 0,
          closePrice: parseFloat(t.close_price) || 0,
          profit: profit,
          lotSize: parseFloat(t.lot_size) || 0,
          strategy: `${brokerName} Sync`,
          setupType: `${brokerName} Sync`,
          ticket: String(t.ticket),
          commission: parseFloat(t.commission) || 0,
          openTime: t.open_time ? new Date(t.open_time * 1000) : null,
          closeTime: t.close_time ? new Date(t.close_time * 1000) : null,
          outcome: outcome
        }
      });
      inserted++;
    }
  }

  return inserted;
}
