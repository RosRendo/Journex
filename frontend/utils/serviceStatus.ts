/**
 * Service Status Utility
 * Provides shared functionality for detecting service readiness
 * Handles both Docker and Normal mode deployments
 */

interface ServiceCheckResult {
  isReady: boolean;
  mode: "docker" | "normal" | "unknown";
  error?: string;
  mtConnected: boolean;
}

/**
 * Check if a service is running on a specific port
 */
export async function checkServiceHealth(
  port: number,
  endpoint: string = "/health"
): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}${endpoint}`, {
      method: "GET",
      timeout: 2000,
    } as RequestInit);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Check MT5 Bridge connection
 */
export async function checkMT5Connection(): Promise<boolean> {
  try {
    const response = await fetch("\/health", {
      method: "GET",
      timeout: 2000,
    } as RequestInit);
    if (!response.ok) return false;

    const data = await response.json();
    return data.connected === true;
  } catch (error) {
    return false;
  }
}

import { fetchWithAuth } from "@/lib/utils";

/**
 * Fetch data with retry logic
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithAuth(url, {
        timeout: 5000,
        ...options,
      } as RequestInit);

      if (response.ok) {
        return response;
      }

      // If it's a 503 (Service Unavailable), retry
      if (response.status === 503 && attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayMs * Math.pow(2, attempt - 1))
        );
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, delayMs * Math.pow(2, attempt - 1))
        );
      }
    }
  }

  throw lastError || new Error("Failed to fetch after retries");
}

/**
 * Get formatted error message for service issues
 */
export function getServiceErrorMessage(
  port: number,
  mtConnected: boolean
): string {
  const portMap: { [key: number]: string } = {
    5001: "Pair Bot (EURUSD/GBPUSD)",
    5000: "XAUUSD Bot (Gold)",
    5002: "Risk Calculator",
    8765: "Calendar/Journal",
    5003: "MT5 Bridge",
  };

  const serviceName = portMap[port] || `Service on port ${port}`;

  if (!mtConnected && port !== 5003) {
    return `${serviceName} is not connected to MT5 Bridge.\n\n⚠️ Make sure:\n1. MetaTrader5 is running and logged in\n2. MT5 Bridge is started (port 5003)\n3. All services are running`;
  }

  return `${serviceName} is not responding.\n\n⚠️ Make sure:\n1. The service is running\n2. Port ${port} is accessible\n3. Check the service logs for errors`;
}

/**
 * Wait for service to be ready with timeout
 */
export async function waitForService(
  port: number,
  timeoutMs: number = 30000,
  intervalMs: number = 1000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await checkServiceHealth(port)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}

/**
 * Get deployment mode from localStorage
 */
export function getDeploymentMode(): "docker" | "normal" {
  if (typeof window === "undefined") return "docker";

  try {
    const mode = localStorage.getItem("deploymentMode");
    return mode === "normal" ? "normal" : "docker";
  } catch {
    return "docker";
  }
}

/**
 * Set deployment mode in localStorage
 */
export function setDeploymentMode(mode: "docker" | "normal"): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("deploymentMode", mode);
    } catch {
      // Silently fail if localStorage not available
    }
  }
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  if (typeof window === "undefined") return false;
  return process.env.NODE_ENV === "development";
}
