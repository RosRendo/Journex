import axios, { AxiosInstance } from "axios";
import { getBackendUrl } from "@/lib/utils";

const API_BASE_URL = getBackendUrl();

export interface BrokerCredentials {
  broker: string;
  accountNumber: string;
  server: string;
  password: string;
}

export interface BrokerStatus {
  connected: boolean;
  broker: string;
  accountNumber: string;
  balance?: number;
  equity?: number;
  profit?: number;
  lastConnectedAt?: string;
  error?: string;
}

export interface Trade {
  id?: number;
  date: string;
  pair: string;
  strategy: string;
  setupType: string;
  entry: number;
  sl: number;
  tp: number;
  rr: string;
  outcome: string;
  notes?: string;
  imageUrl?: string;
}

export interface AccountInfo {
  login: number;
  balance: number;
  equity: number;
  profit: number;
}

export interface HealthStatus {
  [key: string]: {
    status: "UP" | "DOWN";
    url?: string;
  };
}

class ApiClient {
  private httpClient: AxiosInstance;
  private apiUrl: string;

  constructor() {
    this.apiUrl = API_BASE_URL;
    this.httpClient = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 503) {
          console.error("Service unavailable:", error.response.data);
        }
        return Promise.reject(error);
      },
    );
  }

  // ==================== BROKER MANAGEMENT ====================

  /**
   * Connect to a broker with credentials
   */
  async connectBroker(credentials: BrokerCredentials): Promise<BrokerStatus> {
    try {
      const response = await this.httpClient.post(
        "/api/broker/connect",
        credentials,
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to connect to broker");
    }
  }

  /**
   * Get current broker connection status
   */
  async getBrokerStatus(): Promise<BrokerStatus> {
    try {
      const response = await this.httpClient.get("/api/broker/status");
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to fetch broker status");
    }
  }

  /**
   * Disconnect from broker
   */
  async disconnectBroker(): Promise<void> {
    try {
      await this.httpClient.post("/api/broker/disconnect");
    } catch (error) {
      throw this.handleError(error, "Failed to disconnect from broker");
    }
  }

  /**
   * Get stored broker credentials (masked)
   */
  async getBrokerCredentials(): Promise<Omit<BrokerCredentials, "password">> {
    try {
      const response = await this.httpClient.get("/api/broker/credentials");
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to fetch broker credentials");
    }
  }

  /**
   * Get account info from MT5 bridge
   */
  async getAccountInfo(): Promise<AccountInfo> {
    try {
      const response = await this.httpClient.get("/api/broker/account-info");
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to fetch account info from broker");
    }
  }

  /**
   * Get broker trades from MT5 bridge
   */
  async getBrokerTrades(hours: number = 24): Promise<Trade[]> {
    try {
      const response = await this.httpClient.get("/api/broker/trades", {
        params: { hours },
      });
      return response.data?.trades || response.data || [];
    } catch (error) {
      throw this.handleError(error, "Failed to fetch trades from broker");
    }
  }

  // ==================== TRADING JOURNAL API ====================

  async getTrades(params?: {
    page?: number;
    limit?: number;
    strategy?: string;
    outcome?: string;
    pair?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: Trade[]; pagination: Record<string, unknown> }> {
    try {
      const response = await this.httpClient.get("/api/trades", { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to fetch trades");
    }
  }

  async createTrade(trade: Trade): Promise<Trade> {
    try {
      const response = await this.httpClient.post("/api/trades", trade);
      return response.data?.data || response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to create trade");
    }
  }

  async updateTrade(id: number, trade: Partial<Trade>): Promise<Trade> {
    try {
      const response = await this.httpClient.put(`/api/trades/${id}`, trade);
      return response.data?.data || response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to update trade");
    }
  }

  async deleteTrade(id: number): Promise<void> {
    try {
      await this.httpClient.delete(`/api/trades/${id}`);
    } catch (error) {
      throw this.handleError(error, "Failed to delete trade");
    }
  }

  // ==================== FILE UPLOADS ====================

  async uploadImage(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await this.httpClient.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data?.data?.url || response.data?.url;
    } catch (error) {
      throw this.handleError(error, "Failed to upload image");
    }
  }

  // ==================== TRADING BOTS ====================

  /**
   * Pair Trading Bot endpoints
   */
  async getPairBotStatus(): Promise<Record<string, unknown>> {
    try {
      const response = await this.httpClient.get("/api/bot/pair/status");
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to fetch pair bot status");
    }
  }

  async startPairBot(): Promise<Record<string, unknown>> {
    try {
      const response = await this.httpClient.post("/api/bot/pair/start");
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to start pair bot");
    }
  }

  async stopPairBot(): Promise<Record<string, unknown>> {
    try {
      const response = await this.httpClient.post("/api/bot/pair/stop");
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to stop pair bot");
    }
  }

  async getPairBotTrades(): Promise<Record<string, unknown>[]> {
    try {
      const response = await this.httpClient.get("/api/bot/pair/active-trades");
      return response.data?.trades || response.data || [];
    } catch (error) {
      throw this.handleError(error, "Failed to fetch pair bot trades");
    }
  }

  /**
   * XAUUSD Bot endpoints
   */
  async getXauusdBotStatus(): Promise<Record<string, unknown>> {
    try {
      const response = await this.httpClient.get("/api/bot/xauusd/status");
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to fetch XAUUSD bot status");
    }
  }

  async startXauusdBot(): Promise<Record<string, unknown>> {
    try {
      const response = await this.httpClient.post("/api/bot/xauusd/start");
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to start XAUUSD bot");
    }
  }

  async stopXauusdBot(): Promise<Record<string, unknown>> {
    try {
      const response = await this.httpClient.post("/api/bot/xauusd/stop");
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to stop XAUUSD bot");
    }
  }

  async getXauusdBotTrades(): Promise<Record<string, unknown>[]> {
    try {
      const response = await this.httpClient.get(
        "/api/bot/xauusd/active-trades",
      );
      return response.data?.trades || response.data || [];
    } catch (error) {
      throw this.handleError(error, "Failed to fetch XAUUSD bot trades");
    }
  }

  // ==================== RISK CALCULATOR ====================

  async getRiskCalculations(): Promise<Record<string, unknown>> {
    try {
      const response = await this.httpClient.get("/api/risk/calculations");
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to fetch risk calculations");
    }
  }

  async calculateRisk(
    tradeData: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      const response = await this.httpClient.post(
        "/api/risk/calculate",
        tradeData,
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to calculate risk");
    }
  }

  async getRiskPairs(): Promise<string[]> {
    try {
      const response = await this.httpClient.get("/api/risk/pairs");
      return response.data?.pairs || response.data || [];
    } catch (error) {
      throw this.handleError(error, "Failed to fetch risk pairs");
    }
  }

  // ==================== BACKTESTING ====================

  async runBacktest(
    strategy: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      const response = await this.httpClient.post(
        "/api/backtest/run",
        strategy,
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to run backtest");
    }
  }

  async getBacktestStatus(): Promise<Record<string, unknown>> {
    try {
      const response = await this.httpClient.get("/api/backtest/status");
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to fetch backtest status");
    }
  }

  async getBacktestResults(): Promise<Record<string, unknown>> {
    try {
      const response = await this.httpClient.get("/api/backtest/results");
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to fetch backtest results");
    }
  }

  // ==================== CALENDAR SHEET ====================

  async getCalendarEntries(): Promise<Record<string, unknown>[]> {
    try {
      const response = await this.httpClient.get("/api/calendar/sheet/entries");
      return response.data?.entries || response.data || [];
    } catch (error) {
      throw this.handleError(error, "Failed to fetch calendar entries");
    }
  }

  async addCalendarEntry(
    entry: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      const response = await this.httpClient.post(
        "/api/calendar/sheet/entry",
        entry,
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to add calendar entry");
    }
  }

  // ==================== HEALTH & STATUS ====================

  async getGatewayHealth(): Promise<Record<string, unknown>> {
    try {
      const response = await this.httpClient.get("/health");
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to fetch gateway health");
    }
  }

  async getAllServicesHealth(): Promise<HealthStatus> {
    try {
      const response = await this.httpClient.get("/api/services/health/all");
      return response.data;
    } catch (error) {
      throw this.handleError(error, "Failed to fetch services health");
    }
  }

  async getSingleServiceHealth(
    service: string,
  ): Promise<Record<string, unknown>> {
    try {
      const response = await this.httpClient.get(
        `/api/services/health/${service}`,
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, `Failed to fetch ${service} health`);
    }
  }

  // ==================== HELPER METHODS ====================

  private handleError(error: unknown, defaultMessage: string): Error {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        defaultMessage;
      return new Error(message);
    }
    return new Error(defaultMessage);
  }

  /**
   * Get API base URL
   */
  getApiUrl(): string {
    return this.apiUrl;
  }

  /**
   * Set API base URL (useful for switching environments)
   */
  setApiUrl(url: string): void {
    this.apiUrl = url;
    this.httpClient.defaults.baseURL = url;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for testing
export default ApiClient;
