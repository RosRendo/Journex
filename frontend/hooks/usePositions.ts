import { useState, useEffect } from "react";
import { getBackendUrl } from "@/lib/utils";
import { getSession } from "@/lib/useSession";
import { useWorkspace, WorkspaceType } from "@/src/context/WorkspaceContext";

export interface Position {
  ticket: number;
  pair: string;
  direction: "Long" | "Short";
  volume: number;
  entry: number;
  current: number;
  sl: number;
  tp: number;
  pnl: number;
  swap?: number;
  openTime: string;
}

export function usePositions(accountId?: string, autoRefreshMs: number = 2000) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  let activeWorkspace: WorkspaceType = "Global";
  try {
    const wsContext = useWorkspace();
    activeWorkspace = wsContext.activeWorkspace;
  } catch (e) {}

  useEffect(() => {
    let mounted = true;

    const fetchPositions = async () => {
      try {
        // Always route through the backend proxy — never hit the bridge directly from the browser.
        // The backend enforces admin auth and returns mock data for non-admin callers.
        const backendUrl = getBackendUrl();
        const session = await getSession();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        const apiToken = (session?.user as any)?.apiToken;
        if (apiToken) {
          headers["Authorization"] = `Bearer ${apiToken}`;
        }
        const res = await fetch(`${backendUrl}/api/bridge/api/positions`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!mounted) return;

        if (data.success && data.positions) {
          let filtered = data.positions as Position[];
          if (activeWorkspace !== "Global" && activeWorkspace !== "Funded Challenge" && activeWorkspace !== "Scalping" && activeWorkspace !== "Swing") {
            filtered = filtered.filter((p) => {
              if (!p || !p.pair) return false;
              const pair = p.pair.toUpperCase();
              if (activeWorkspace === "Gold") return pair.includes("XAU");
              if (activeWorkspace === "Crypto") return pair.includes("BTC") || pair.includes("ETH") || pair.includes("SOL");
              if (activeWorkspace === "Forex") return pair.length >= 6 && !pair.includes("XAU") && !pair.includes("BTC") && !pair.includes("ETH") && !pair.includes("SOL");
              return true;
            });
          }
          setPositions(filtered);
          setError(null);
        } else {
          setError(data.error || "Failed to fetch positions");
          if (data.error === "MT5 not connected") setPositions([]);
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Failed to fetch");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchPositions();

    if (autoRefreshMs > 0) {
      const interval = setInterval(fetchPositions, autoRefreshMs);
      return () => {
        mounted = false;
        clearInterval(interval);
      };
    }

    return () => { mounted = false; };
  }, [autoRefreshMs, activeWorkspace]);

  return { positions, loading, error };
}
