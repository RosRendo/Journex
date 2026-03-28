import { useState, useCallback, useEffect } from "react";
import { apiClient, Trade } from "../src/services/apiClient";

// ==================== TRADING JOURNAL HOOKS ====================

export interface UseTradesOptions {
  page?: number;
  limit?: number;
  strategy?: string;
  outcome?: string;
  pair?: string;
  startDate?: string;
  endDate?: string;
  autoRefresh?: number; // milliseconds
}

export function useTrades(options?: UseTradesOptions) {
  const [data, setData] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.getTrades(options);
      setData(result.data as Trade[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch trades");
    } finally {
      setLoading(false);
    }
  }, [options]);

  useEffect(() => {
    fetchTrades();
    if (options?.autoRefresh) {
      const interval = setInterval(fetchTrades, options.autoRefresh);
      return () => clearInterval(interval);
    }
  }, [fetchTrades, options?.autoRefresh]);

  return { data, loading, error, refetch: fetchTrades };
}

export function useCreateTrade() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTrade = useCallback(async (trade: Trade) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.createTrade(trade);
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create trade";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createTrade, loading, error };
}

// ==================== BOT HOOKS ====================

export function useBotStatus(botType: "pair" | "xauusd", autoRefresh = 5000) {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const result =
        botType === "pair"
          ? await apiClient.getPairBotStatus()
          : await apiClient.getXauusdBotStatus();
      setStatus(result);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch bot status",
      );
    } finally {
      setLoading(false);
    }
  }, [botType]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, autoRefresh);
    return () => clearInterval(interval);
  }, [fetchStatus, autoRefresh]);

  return { status, loading, error, refetch: fetchStatus };
}

export function useStartBot(botType: "pair" | "xauusd") {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startBot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result =
        botType === "pair"
          ? await apiClient.startPairBot()
          : await apiClient.startXauusdBot();
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start bot";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [botType]);

  return { startBot, loading, error };
}

export function useStopBot(botType: "pair" | "xauusd") {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopBot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result =
        botType === "pair"
          ? await apiClient.stopPairBot()
          : await apiClient.stopXauusdBot();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to stop bot";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [botType]);

  return { stopBot, loading, error };
}

// ==================== RISK CALCULATOR HOOKS ====================

export function useRiskCalculations(autoRefresh = 10000) {
  const [calculations, setCalculations] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCalculations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiClient.getRiskCalculations();
      setCalculations(result);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch calculations",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalculations();
    const interval = setInterval(fetchCalculations, autoRefresh);
    return () => clearInterval(interval);
  }, [fetchCalculations, autoRefresh]);

  return { calculations, loading, error, refetch: fetchCalculations };
}

export function useCalculateRisk() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateRisk = useCallback(
    async (tradeData: Record<string, unknown>) => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiClient.calculateRisk(tradeData);
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to calculate risk";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { calculateRisk, loading, error };
}

// ==================== BACKTESTING HOOKS ====================

export function useBacktest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runBacktest = useCallback(async (strategy: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.runBacktest(strategy);
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to run backtest";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { runBacktest, loading, error };
}

export function useBacktestResults(autoRefresh = 30000) {
  const [results, setResults] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiClient.getBacktestResults();
      setResults(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch results");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, autoRefresh);
    return () => clearInterval(interval);
  }, [fetchResults, autoRefresh]);

  return { results, loading, error, refetch: fetchResults };
}

// ==================== HEALTH CHECK HOOKS ====================

export function useServicesHealth(autoRefresh = 60000) {
  const [services, setServices] = useState<Record<string, unknown> | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiClient.getAllServicesHealth();
      setServices(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check health");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, autoRefresh);
    return () => clearInterval(interval);
  }, [checkHealth, autoRefresh]);

  return { services, loading, error, refetch: checkHealth };
}

export function useGatewayHealth(autoRefresh = 30000) {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiClient.getGatewayHealth();
      setHealth(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gateway unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, autoRefresh);
    return () => clearInterval(interval);
  }, [checkHealth, autoRefresh]);

  return { health, loading, error, refetch: checkHealth };
}
