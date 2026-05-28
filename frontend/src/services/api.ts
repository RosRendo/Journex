import { resolveLocalUrl, getBackendUrl } from "../../lib/utils";

const BACKEND_URL = getBackendUrl();
const BRIDGE_URL = resolveLocalUrl(process.env.NEXT_PUBLIC_BRIDGE_URL || "");

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

class ApiService {
  // Journal API (Postgres Backend)
  async getTrades(params?: {
    page?: number;
    limit?: number;
    strategy?: string;
    outcome?: string;
    pair?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ data: Trade[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value));
      });
    }
    const response = await fetch(`${BACKEND_URL}/api/trades?${queryParams}`, { headers: { "ngrok-skip-browser-warning": "true" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async createTrade(trade: Trade): Promise<Trade> {
    const response = await fetch(`${BACKEND_URL}/api/trades`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trade),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    return result.data;
  }

  async updateTrade(id: number, trade: Partial<Trade>): Promise<Trade> {
    const response = await fetch(`${BACKEND_URL}/api/trades/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trade),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    return result.data;
  }

  async deleteTrade(id: number): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/trades/${id}`, { headers: { "ngrok-skip-browser-warning": "true" }, 
      method: "DELETE",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  }

  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch(`${BACKEND_URL}/api/upload`, { headers: { "ngrok-skip-browser-warning": "true" }, 
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    return result.data.url;
  }

  // MT5 Bridge API
  async getBridgeAccountInfo(): Promise<AccountInfo> {
    const response = await fetch(`${BRIDGE_URL}/account`, { headers: { "ngrok-skip-browser-warning": "true" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async getBridgeTrades(hours: number = 24): Promise<any[]> {
    const response = await fetch(`${BRIDGE_URL}/trades?hours=${hours}`, { headers: { "ngrok-skip-browser-warning": "true" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    return result.trades || [];
  }

  // XAUUSD Bot API
  async getBotStatus(): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/api/status`, { headers: { "ngrok-skip-browser-warning": "true" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async getBotAccount(): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/api/account`, { headers: { "ngrok-skip-browser-warning": "true" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}

export const api = new ApiService();
