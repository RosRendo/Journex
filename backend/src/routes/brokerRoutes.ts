import { Router, Request, Response } from "express";
import prisma from "../config/database";
import { Decimal } from "@prisma/client/runtime/library";

const router = Router();

/**
 * Supported brokers for CSV import
 */
const SUPPORTED_BROKERS = [
  {
    name: "MetaTrader 5",
    alias: "MT5",
    description: "MetaTrader 5 terminal",
    csvFormat: "MT5",
  },
  {
    name: "MetaTrader 4",
    alias: "MT4",
    description: "MetaTrader 4 terminal",
    csvFormat: "MT4",
  },
  {
    name: "cTrader",
    description: "Spotware cTrader",
    csvFormat: "cTrader",
  },
  {
    name: "IC Markets",
    description: "IC Markets Broker",
    csvFormat: "IC Markets",
  },
  {
    name: "Pepperstone",
    description: "Pepperstone Broker",
    csvFormat: "Pepperstone",
  },
];

/**
 * Get list of supported brokers for CSV import
 */
router.get("/supported", (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: SUPPORTED_BROKERS,
      total: SUPPORTED_BROKERS.length,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Failed to fetch supported brokers",
    });
  }
});

/**
 * Register a broker account (track which broker uploaded CSV)
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { brokerName, accountNumber, balance, equity } = req.body;

    if (!brokerName || !accountNumber) {
      return res.status(400).json({
        error: "Missing required fields: brokerName, accountNumber",
      });
    }

    // Check if account already exists
    let account = await prisma.account.findFirst({
      where: {
        brokerName,
        accountNumber,
      },
    });

    if (account) {
      // Update existing account
      account = await prisma.account.update({
        where: { id: account.id },
        data: {
          balance: balance ? new Decimal(balance) : undefined,
          equity: equity ? new Decimal(equity) : undefined,
          lastUpdated: new Date(),
        },
      });
    } else {
      // Create new account
      account = await prisma.account.create({
        data: {
          brokerName,
          accountNumber,
          balance: balance ? new Decimal(balance) : undefined,
          equity: equity ? new Decimal(equity) : undefined,
          lastUpdated: new Date(),
        },
      });
    }

    res.status(201).json({
      success: true,
      data: {
        id: account.id,
        brokerName: account.brokerName,
        accountNumber: account.accountNumber,
        balance: account.balance
          ? parseFloat(account.balance.toString())
          : null,
        equity: account.equity ? parseFloat(account.equity.toString()) : null,
        lastUpdated: account.lastUpdated,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Failed to register broker account",
    });
  }
});

/**
 * Get all registered broker accounts
 */
router.get("/accounts", async (req: Request, res: Response) => {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { brokerName: "asc" },
    });

    res.json({
      success: true,
      data: accounts.map((acc) => ({
        id: acc.id,
        brokerName: acc.brokerName,
        accountNumber: acc.accountNumber,
        balance: acc.balance ? parseFloat(acc.balance.toString()) : null,
        equity: acc.equity ? parseFloat(acc.equity.toString()) : null,
        lastUpdated: acc.lastUpdated,
      })),
      total: accounts.length,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Failed to fetch broker accounts",
    });
  }
});

/**
 * Get analytics for a specific broker account
 * Aggregates all trades from that broker
 */
router.get("/analytics/:accountId", async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;

    const account = await prisma.account.findUnique({
      where: { id: parseInt(accountId) },
    });

    if (!account) {
      return res.status(404).json({
        error: "Account not found",
      });
    }

    // Get all imports from this broker/account
    const imports = await prisma.csvImport.findMany({
      where: {
        brokerName: account.brokerName,
        accountNumber: account.accountNumber,
        status: "completed",
      },
      include: { trades: true },
    });

    // Aggregate all trades
    const allTrades = imports.flatMap((imp) => imp.trades);

    if (allTrades.length === 0) {
      return res.json({
        success: true,
        data: {
          brokerName: account.brokerName,
          accountNumber: account.accountNumber,
          message: "No trades found for this account",
          metrics: {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            totalProfit: 0,
            profitFactor: 0,
          },
        },
      });
    }

    // Calculate metrics
    const wins = allTrades.filter((t) => t.profit.gt(0));
    const losses = allTrades.filter((t) => t.profit.lt(0));
    const breakEven = allTrades.filter((t) => t.profit.eq(0));

    const totalProfit = allTrades.reduce(
      (sum, t) => sum.plus(t.profit),
      new Decimal(0),
    );
    const totalWins = wins.reduce(
      (sum, t) => sum.plus(t.profit),
      new Decimal(0),
    );
    const totalLosses = losses.reduce(
      (sum, t) => sum.plus(t.profit.abs()),
      new Decimal(0),
    );

    // Group by pair
    const pairStats = new Map<string, any>();
    allTrades.forEach((trade) => {
      const pair = trade.pair;
      if (!pairStats.has(pair)) {
        pairStats.set(pair, {
          pair,
          trades: 0,
          wins: 0,
          losses: 0,
          profit: new Decimal(0),
        });
      }
      const stats = pairStats.get(pair);
      stats.trades++;
      if (trade.profit.gt(0)) stats.wins++;
      else if (trade.profit.lt(0)) stats.losses++;
      stats.profit = stats.profit.plus(trade.profit);
    });

    res.json({
      success: true,
      data: {
        brokerName: account.brokerName,
        accountNumber: account.accountNumber,
        balance: account.balance
          ? parseFloat(account.balance.toString())
          : null,
        equity: account.equity ? parseFloat(account.equity.toString()) : null,
        lastUpdated: account.lastUpdated,
        metrics: {
          totalTrades: allTrades.length,
          winningTrades: wins.length,
          losingTrades: losses.length,
          breakEvenTrades: breakEven.length,
          winRate: (wins.length / allTrades.length) * 100,
          totalProfit: parseFloat(totalProfit.toString()),
          profitFactor: totalLosses.gt(0)
            ? parseFloat(totalWins.div(totalLosses).toString())
            : 0,
          avgWin:
            wins.length > 0
              ? parseFloat(totalWins.div(wins.length).toString())
              : 0,
          avgLoss:
            losses.length > 0
              ? parseFloat(totalLosses.div(losses.length).negated().toString())
              : 0,
        },
        pairBreakdown: Array.from(pairStats.values()).map((p) => ({
          pair: p.pair,
          trades: p.trades,
          wins: p.wins,
          losses: p.losses,
          profit: parseFloat(p.profit.toString()),
          winRate: (p.wins / p.trades) * 100,
        })),
        importCount: imports.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Failed to fetch analytics",
    });
  }
});

/**
 * Get all analytics across all brokers
 */
router.get("/analytics", async (req: Request, res: Response) => {
  try {
    const { brokerName } = req.query;

    const where = brokerName ? { brokerName: brokerName as string } : {};
    const imports = await prisma.csvImport.findMany({
      where: {
        ...where,
        status: "completed",
      },
      include: { trades: true },
    });

    // Group by broker
    const brokerMap = new Map<string, any>();

    imports.forEach((imp) => {
      const key = imp.brokerName;
      if (!brokerMap.has(key)) {
        brokerMap.set(key, {
          broker: imp.brokerName,
          totalProfit: new Decimal(0),
          totalTrades: 0,
          wins: 0,
          losses: 0,
          imports: 0,
        });
      }

      const stats = brokerMap.get(key);
      stats.totalProfit = stats.totalProfit.plus(imp.totalProfit);
      stats.totalTrades += imp.totalTrades;
      stats.wins += imp.successCount;
      stats.losses += imp.failureCount;
      stats.imports++;
    });

    const analyticsData = Array.from(brokerMap.values()).map((stats) => ({
      broker: stats.broker,
      totalTrades: stats.totalTrades,
      winCount: stats.wins,
      failureCount: stats.losses,
      totalProfit: parseFloat(stats.totalProfit.toString()),
      imports: stats.imports,
    }));

    res.json({
      success: true,
      data: analyticsData,
      totalImports: imports.length,
      totalTrades: imports.reduce((sum, imp) => sum + imp.totalTrades, 0),
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Failed to fetch analytics",
    });
  }
});

/**
 * Health check
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "OK",
    mode: "CSV Import",
    supportedBrokers: SUPPORTED_BROKERS.length,
    timestamp: new Date().toISOString(),
  });
});

export default router;
