import { Request, Response, NextFunction } from "express";
import csv from "csv-parser";
import fs from "fs";
import path from "path";
import prisma from "../config/database";
import { AppError } from "../middleware/errorHandler";
import { Decimal } from "@prisma/client/runtime/library";

export interface ParsedTrade {
  date: Date;
  pair: string;
  symbol: string;
  direction: string;
  entry: number;
  closePrice?: number;
  lotSize?: number;
  profit: number;
  ticket?: string;
  openTime?: Date;
  closeTime?: Date;
  commission?: number;
  outcome: string;
}

/**
 * Parse broker CSV file and extract trades
 * Supports multiple broker formats
 */
function parseCsvFile(
  filePath: string,
  brokerName: string,
): Promise<ParsedTrade[]> {
  return new Promise((resolve, reject) => {
    const trades: ParsedTrade[] = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row: any) => {
        try {
          const parsedTrade = mapBrokerDataToTrade(row, brokerName);
          if (parsedTrade) {
            trades.push(parsedTrade);
          }
        } catch (error: any) {
          console.warn(`Warning parsing row:`, error.message);
        }
      })
      .on("end", () => {
        resolve(trades);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

/**
 * Map broker-specific CSV format to standardized trade format
 */
function mapBrokerDataToTrade(
  row: any,
  brokerName: string,
): ParsedTrade | null {
  try {
    let trade: ParsedTrade | null = null;

    switch (brokerName.toLowerCase()) {
      case "metatrader5":
      case "mt5":
        trade = parseMT5Format(row);
        break;
      case "metatrader4":
      case "mt4":
        trade = parseMT4Format(row);
        break;
      case "ctrader":
        trade = parseCTraderFormat(row);
        break;
      case "ic markets":
        trade = parseIcMarketsFormat(row);
        break;
      case "pepperstone":
        trade = parsePepperstoneFormat(row);
        break;
      default:
        // Try generic format
        trade = parseGenericFormat(row);
    }

    return trade;
  } catch (error: any) {
    console.warn(`Error mapping broker data: ${error.message}`);
    return null;
  }
}

/**
 * Parse MT5 CSV format
 * Columns: Deal Ticket, Time, Type, Entry Price, Lot, Profit, Symbol, Status
 */
function parseMT5Format(row: any): ParsedTrade | null {
  if (!row.Time || !row.Symbol) return null;

  const direction = determineDirection(row.Type);
  const profit = parseFloat(row.Profit) || 0;

  return {
    date: parseDate(row.Time),
    pair: row.Symbol?.trim() || "",
    symbol: row.Symbol?.trim() || "",
    direction: direction,
    entry: parseFloat(row["Entry Price"]) || parseFloat(row.Price) || 0,
    closePrice: parseFloat(row["Close Price"]) || undefined,
    lotSize: parseFloat(row.Lot) || undefined,
    profit: profit,
    ticket: row["Deal Ticket"]?.toString() || undefined,
    openTime: parseDate(row.Time),
    closeTime: parseDate(row["Close Time"]) || undefined,
    commission: parseFloat(row.Commission) || undefined,
    outcome: profit > 0 ? "W" : profit < 0 ? "L" : "E",
  };
}

/**
 * Parse MT4 CSV format
 * Columns: Ticket, Open Time, Type, Size, Item, Entry Price, S/L, T/P, Close Time, Close Price, Profit
 */
function parseMT4Format(row: any): ParsedTrade | null {
  if (!row["Open Time"] || !row.Item) return null;

  const direction = determineDirection(row.Type);
  const profit = parseFloat(row.Profit) || 0;

  return {
    date: parseDate(row["Open Time"]),
    pair: row.Item?.trim() || "",
    symbol: row.Item?.trim() || "",
    direction: direction,
    entry: parseFloat(row["Entry Price"]) || 0,
    closePrice: parseFloat(row["Close Price"]) || undefined,
    lotSize: parseFloat(row.Size) || undefined,
    profit: profit,
    ticket: row.Ticket?.toString() || undefined,
    openTime: parseDate(row["Open Time"]),
    closeTime: parseDate(row["Close Time"]) || undefined,
    outcome: profit > 0 ? "W" : profit < 0 ? "L" : "E",
  };
}

/**
 * Parse cTrader CSV format
 */
function parseCTraderFormat(row: any): ParsedTrade | null {
  if (!row.DateTime || !row.Symbol) return null;

  const direction = row.Direction?.toLowerCase().includes("buy")
    ? "Long"
    : "Short";
  const profit = parseFloat(row.GrossProfit) || parseFloat(row.NetProfit) || 0;

  return {
    date: parseDate(row.DateTime),
    pair: row.Symbol?.trim() || "",
    symbol: row.Symbol?.trim() || "",
    direction: direction,
    entry: parseFloat(row.EntryPrice) || 0,
    closePrice: parseFloat(row.ExitPrice) || undefined,
    lotSize: parseFloat(row.Volume) || undefined,
    profit: profit,
    ticket: row.TradeId?.toString() || undefined,
    openTime: parseDate(row.DateTime),
    closeTime: parseDate(row.ExitTime) || undefined,
    commission: parseFloat(row.Commission) || undefined,
    outcome: profit > 0 ? "W" : profit < 0 ? "L" : "E",
  };
}

/**
 * Parse IC Markets CSV format
 */
function parseIcMarketsFormat(row: any): ParsedTrade | null {
  if (!row.OpenDate || !row.Pair) return null;

  const direction = row.Type?.toLowerCase().includes("buy") ? "Long" : "Short";
  const profit = parseFloat(row.Profit) || 0;

  return {
    date: parseDate(row.OpenDate),
    pair: row.Pair?.trim() || "",
    symbol: row.Pair?.trim() || "",
    direction: direction,
    entry: parseFloat(row.OpenPrice) || 0,
    closePrice: parseFloat(row.ClosePrice) || undefined,
    lotSize: parseFloat(row.Lot) || undefined,
    profit: profit,
    ticket: row.Ticket?.toString() || undefined,
    outcome: profit > 0 ? "W" : profit < 0 ? "L" : "E",
  };
}

/**
 * Parse Pepperstone CSV format
 */
function parsePepperstoneFormat(row: any): ParsedTrade | null {
  if (!row.OpenTime || !row.Instrument) return null;

  const direction = row.TradeDirection?.toLowerCase().includes("buy")
    ? "Long"
    : "Short";
  const profit = parseFloat(row["Gross P/L"]) || parseFloat(row["P/L"]) || 0;

  return {
    date: parseDate(row.OpenTime),
    pair: row.Instrument?.trim() || "",
    symbol: row.Instrument?.trim() || "",
    direction: direction,
    entry: parseFloat(row.OpenPrice) || 0,
    closePrice: parseFloat(row.ClosePrice) || undefined,
    lotSize: parseFloat(row.Lots) || undefined,
    profit: profit,
    ticket: row.TradeID?.toString() || undefined,
    outcome: profit > 0 ? "W" : profit < 0 ? "L" : "E",
  };
}

/**
 * Parse generic CSV format (best effort)
 */
function parseGenericFormat(row: any): ParsedTrade | null {
  // Look for common column names
  const timeColumn = Object.keys(row).find(
    (k) =>
      k.toLowerCase().includes("time") ||
      k.toLowerCase().includes("date") ||
      k.toLowerCase().includes("open"),
  );

  const symbolColumn = Object.keys(row).find(
    (k) =>
      k.toLowerCase().includes("symbol") ||
      k.toLowerCase().includes("pair") ||
      k.toLowerCase().includes("instrument"),
  );

  const profitColumn = Object.keys(row).find(
    (k) =>
      k.toLowerCase().includes("profit") ||
      k.toLowerCase().includes("p/l") ||
      k.toLowerCase().includes("pnl"),
  );

  if (!timeColumn || !symbolColumn) return null;

  const direction = Object.values(row).some(
    (v) => typeof v === "string" && v.toLowerCase().includes("buy"),
  )
    ? "Long"
    : "Short";

  const profit = parseFloat(row[profitColumn || ""] as string) || 0;

  return {
    date: parseDate(row[timeColumn]),
    pair: row[symbolColumn]?.trim() || "",
    symbol: row[symbolColumn]?.trim() || "",
    direction: direction,
    entry:
      parseFloat(
        Object.values(row).find(
          (v) => !isNaN(parseFloat(v as string)),
        ) as string,
      ) || 0,
    profit: profit,
    outcome: profit > 0 ? "W" : profit < 0 ? "L" : "E",
  };
}

/**
 * Determine trade direction from broker type string
 */
function determineDirection(typeStr: string): string {
  if (!typeStr) return "Long";
  const lower = typeStr.toLowerCase();
  if (lower.includes("sell") || lower.includes("short")) return "Short";
  if (lower.includes("buy") || lower.includes("long")) return "Long";
  return lower.includes("2") ? "Short" : "Long"; // MT5 type 0=buy, 1=sell
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();

  // Try ISO format first
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) return isoDate;

  // Try DD.MM.YYYY HH:MM:SS
  const match = dateStr.match(
    /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/,
  );
  if (match) {
    return new Date(
      parseInt(match[3]),
      parseInt(match[2]) - 1,
      parseInt(match[1]),
      parseInt(match[4]),
      parseInt(match[5]),
      parseInt(match[6]),
    );
  }

  // Try DD/MM/YYYY HH:MM:SS
  const match2 = dateStr.match(
    /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/,
  );
  if (match2) {
    return new Date(
      parseInt(match2[3]),
      parseInt(match2[2]) - 1,
      parseInt(match2[1]),
      parseInt(match2[4]),
      parseInt(match2[5]),
      parseInt(match2[6]),
    );
  }

  return new Date(dateStr);
}

/**
 * Calculate metrics from trades
 */
function calculateMetrics(trades: ParsedTrade[]) {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      winRate: 0,
      totalProfit: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      bestTrade: 0,
      worstTrade: 0,
    };
  }

  const wins = trades.filter((t) => t.profit > 0);
  const losses = trades.filter((t) => t.profit < 0);
  const breakEven = trades.filter((t) => t.profit === 0);

  const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
  const totalWins = wins.reduce((sum, t) => sum + t.profit, 0);
  const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));

  return {
    totalTrades: trades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    breakEvenTrades: breakEven.length,
    winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
    totalProfit: totalProfit,
    profitFactor: totalLosses > 0 ? totalWins / totalLosses : 0,
    avgWin: wins.length > 0 ? totalWins / wins.length : 0,
    avgLoss: losses.length > 0 ? -totalLosses / losses.length : 0,
    bestTrade: Math.max(...trades.map((t) => t.profit)),
    worstTrade: Math.min(...trades.map((t) => t.profit)),
  };
}

/**
 * Upload and process CSV file
 */
export const uploadCsvTrades = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.file) {
      throw new AppError("No CSV file uploaded", 400);
    }

    const { brokerName, accountNumber } = req.body;
    if (!brokerName) {
      throw new AppError("Broker name is required", 400);
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    // Create import record
    const csvImport = await prisma.csvImport.create({
      data: {
        fileName,
        brokerName,
        accountNumber: accountNumber || undefined,
        totalTrades: 0,
        successCount: 0,
        failureCount: 0,
        totalProfit: new Decimal(0),
        winRate: new Decimal(0),
        status: "processing",
      },
    });

    // Parse CSV file
    let parsedTrades: ParsedTrade[] = [];
    try {
      parsedTrades = await parseCsvFile(filePath, brokerName);
    } catch (error: any) {
      await prisma.csvImport.update({
        where: { id: csvImport.id },
        data: {
          status: "failed",
          errorMessage: `CSV parsing error: ${error.message}`,
        },
      });

      fs.unlink(filePath, () => {}); // Clean up file
      throw new AppError(`Failed to parse CSV: ${error.message}`, 400);
    }

    // Save trades to database
    let successCount = 0;
    let failureCount = 0;
    const savedTrades = [];

    for (const parsedTrade of parsedTrades) {
      try {
        const trade = await prisma.trade.create({
          data: {
            date: parsedTrade.date,
            pair: parsedTrade.pair,
            direction: parsedTrade.direction,
            entry: new Decimal(parsedTrade.entry),
            closePrice: parsedTrade.closePrice
              ? new Decimal(parsedTrade.closePrice)
              : undefined,
            lotSize: parsedTrade.lotSize
              ? new Decimal(parsedTrade.lotSize)
              : undefined,
            profit: new Decimal(parsedTrade.profit),
            ticket: parsedTrade.ticket,
            openTime: parsedTrade.openTime,
            closeTime: parsedTrade.closeTime,
            commission: parsedTrade.commission
              ? new Decimal(parsedTrade.commission)
              : undefined,
            outcome: parsedTrade.outcome,
            csvImportId: csvImport.id,
            accountNumber: accountNumber || null,
          },
        });
        savedTrades.push(trade);
        successCount++;
      } catch (error: any) {
        console.warn(`Failed to save trade: ${error.message}`);
        failureCount++;
      }
    }

    // Calculate metrics
    const metrics = calculateMetrics(parsedTrades);

    // Update import record with results
    const updatedImport = await prisma.csvImport.update({
      where: { id: csvImport.id },
      data: {
        totalTrades: parsedTrades.length,
        successCount,
        failureCount,
        totalProfit: new Decimal(metrics.totalProfit),
        winRate: new Decimal(metrics.winRate),
        profitFactor: new Decimal(metrics.profitFactor),
        status: "completed",
      },
      include: { trades: true },
    });

    // Clean up file
    fs.unlink(filePath, () => {});

    res.status(201).json({
      success: true,
      data: {
        csvImportId: updatedImport.id,
        fileName: updatedImport.fileName,
        brokerName: updatedImport.brokerName,
        totalTrades: updatedImport.totalTrades,
        successCount: updatedImport.successCount,
        failureCount: updatedImport.failureCount,
        metrics: {
          totalProfit: parseFloat(updatedImport.totalProfit.toString()),
          winRate: parseFloat(updatedImport.winRate.toString()),
          profitFactor: updatedImport.profitFactor
            ? parseFloat(updatedImport.profitFactor.toString())
            : 0,
        },
        trades: savedTrades,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get CSV import history
 */
export const getCsvImports = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { page = "1", limit = "20", status, brokerName } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {};
    if (status) where.status = status;
    if (brokerName) where.brokerName = brokerName;

    const [imports, total] = await Promise.all([
      prisma.csvImport.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { trades: true },
      }),
      prisma.csvImport.count({ where }),
    ]);

    res.json({
      success: true,
      data: imports.map((imp) => ({
        ...imp,
        totalProfit: parseFloat(imp.totalProfit.toString()),
        winRate: parseFloat(imp.winRate.toString()),
        profitFactor: imp.profitFactor
          ? parseFloat(imp.profitFactor.toString())
          : null,
      })),
      pagination: {
        page: parseInt(page as string),
        limit,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get trades from specific import
 */
export const getImportTrades = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { importId } = req.params;
    const { page = "1", limit = "50", outcome, pair } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = { csvImportId: parseInt(importId) };
    if (outcome) where.outcome = outcome;
    if (pair) where.pair = pair;

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        skip,
        take,
        orderBy: { date: "desc" },
      }),
      prisma.trade.count({ where }),
    ]);

    res.json({
      success: true,
      data: trades,
      pagination: {
        page: parseInt(page as string),
        limit,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
};
