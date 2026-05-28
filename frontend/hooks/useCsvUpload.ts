import { useState, useCallback } from "react";

export interface CsvTrade {
  id: number;
  date: string;
  pair: string;
  direction: "Long" | "Short";
  entry: number;
  closePrice?: number;
  lotSize?: number;
  profit: number;
  ticket?: string;
  outcome: "W" | "L" | "E";
}

export interface CsvImportMetrics {
  totalProfit: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  successCount: number;
  failureCount: number;
}

export interface CsvImportResult {
  csvImportId: number;
  fileName: string;
  brokerName: string;
  metrics: CsvImportMetrics;
  trades: CsvTrade[];
}

export interface CsvImportSession {
  id: number;
  fileName: string;
  brokerName: string;
  accountNumber?: string;
  totalTrades: number;
  successCount: number;
  failureCount: number;
  status: "pending" | "processing" | "completed" | "failed";
  totalProfit: number;
  winRate: number;
  profitFactor?: number;
  createdAt: string;
}

/**
 * Hook for CSV upload and processing
 */
export function useCsvUpload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [importHistory, setImportHistory] = useState<CsvImportSession[]>([]);

  /**
   * Upload CSV file to backend
   */
  const uploadCsv = useCallback(
    async (
      file: File,
      brokerName: string,
      accountNumber?: string,
    ): Promise<CsvImportResult | null> => {
      try {
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("brokerName", brokerName);
        if (accountNumber) {
          formData.append("accountNumber", accountNumber);
        }

        const response = await fetch("/api/csv/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to upload CSV file");
        }

        const data = await response.json();
        setResult(data.data);
        return data.data;
      } catch (err: any) {
        const errorMessage = err.message || "Error uploading CSV file";
        setError(errorMessage);
        console.error("CSV upload error:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Fetch import history
   */
  const fetchImportHistory = useCallback(
    async (page = 1, limit = 20, status?: string, brokerName?: string) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (status) params.append("status", status);
        if (brokerName) params.append("brokerName", brokerName);

        const response = await fetch(`/api/csv/imports?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch import history");
        }

        const data = await response.json();
        setImportHistory(data.data);
        return data;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Fetch trades from a specific import
   */
  const fetchImportTrades = useCallback(
    async (
      importId: number,
      page = 1,
      limit = 50,
      outcome?: string,
      pair?: string,
    ) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (outcome) params.append("outcome", outcome);
        if (pair) params.append("pair", pair);

        const response = await fetch(
          `/api/csv/imports/${importId}/trades?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch import trades");
        }

        const data = await response.json();
        return data;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Get analytics from imported trades
   */
  const calculateAnalytics = useCallback((trades: CsvTrade[]) => {
    if (!trades || trades.length === 0) {
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
        pairs: [],
      };
    }

    const wins = trades.filter((t) => Number(t.profit || 0) > 0);
    const losses = trades.filter((t) => Number(t.profit || 0) < 0);
    const breakEven = trades.filter((t) => Number(t.profit || 0) === 0);

    const totalProfit = trades.reduce((sum, t) => sum + Number(t.profit || 0), 0);
    const totalWins = wins.reduce((sum, t) => sum + Number(t.profit || 0), 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + Number(t.profit || 0), 0));

    // Group by pair
    const pairMap = new Map<
      string,
      { wins: number; losses: number; profit: number }
    >();
    trades.forEach((trade) => {
      const pair = trade.pair;
      if (!pairMap.has(pair)) {
        pairMap.set(pair, { wins: 0, losses: 0, profit: 0 });
      }
      const pairStats = pairMap.get(pair)!;
      const profitNum = Number(trade.profit || 0);
      if (profitNum > 0) pairStats.wins++;
      if (profitNum < 0) pairStats.losses++;
      pairStats.profit += profitNum;
    });

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
      bestTrade: Math.max(...trades.map((t) => Number(t.profit || 0))),
      worstTrade: Math.min(...trades.map((t) => Number(t.profit || 0))),
      pairs: Array.from(pairMap.entries()).map(([pair, stats]) => ({
        pair,
        ...stats,
      })),
    };
  }, []);

  return {
    loading,
    error,
    result,
    importHistory,
    uploadCsv,
    fetchImportHistory,
    fetchImportTrades,
    calculateAnalytics,
  };
}
