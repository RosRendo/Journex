import axios from "axios";
import { getBackendUrl } from "./utils";
import { getSession } from "next-auth/react";

const BACKEND_URL = getBackendUrl();
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, timeout: 30000 });

// Inject cryptographically signed JWT token to authorize backend requests securely
api.interceptors.request.use(async (config) => {
  try {
    const session = await getSession();
    const token = (session?.user as any)?.apiToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn("Failed to get NextAuth session in interceptor:", err);
  }
  return config;
}, (err) => {
  return Promise.reject(err);
});

// Terminal data
export const fetchSnapshot = (symbol: string, timeframe: string) =>
  api.get("/terminal/snapshot", { params: { symbol, timeframe } }).then((r) => r.data);

// Heatmap & sentiment
export const fetchHeatmap = () => api.get("/heatmap").then((r) => r.data);
export const fetchSentimentGauge = () => api.get("/sentiment-gauge").then((r) => r.data);
export const fetchMacroCalendar = (days = 7) =>
  api.get("/macro-calendar", { params: { days } }).then((r) => r.data);

// News sentiment via Claude
export const analyzeNews = (headlines: string[]) =>
  api.post("/news/analyze", { headlines }).then((r) => r.data);

// Risk
export const calcRisk = (payload: any) => api.post("/risk/calculate", payload).then((r) => r.data);

// Journal
export const fetchTrades = (params = {}) =>
  api.get("/journal/trades", { params }).then((r) => r.data);
export const fetchJournalStats = () => api.get("/journal/stats").then((r) => r.data);
export const createTrade = (t: any) => api.post("/journal/trades", t).then((r) => r.data);
export const deleteTrade = (id: string) => api.delete(`/journal/trades/${id}`).then((r) => r.data);

// Orders
export const submitOrder = (o: any) => api.post("/orders", o).then((r) => r.data);
export const closeOrder = (id: string) => api.post(`/orders/${id}/close`).then((r) => r.data);

// Broker settings
export const getBroker = () => api.get("/settings/broker").then((r) => r.data);
export const saveBroker = (cfg: any) => api.post("/settings/broker", cfg).then((r) => r.data);
export const testBroker = () => api.post("/settings/broker/test").then((r) => r.data);
export const syncBrokerTrades = () => api.post("/terminal/sync").then((r) => r.data);

// Drawings
export const listDrawings = (symbol: string) =>
  api.get("/drawings", { params: { symbol } }).then((r) => r.data);
export const addDrawing = (d: any) => api.post("/drawings", d).then((r) => r.data);
export const deleteDrawing = (id: string) => api.delete(`/drawings/${id}`).then((r) => r.data);
export const clearDrawings = (symbol: string) =>
  api.delete("/drawings", { params: { symbol } }).then((r) => r.data);

// Bridge proxy endpoints (routed through Express backend to enforce authentication)
export const fetchBridgePositions = () =>
  api.get("/bridge/api/positions").then((r) => r.data);
export const closeBridgePosition = (ticket: number) =>
  api.post("/bridge/api/close-position", { ticket }).then((r) => r.data);
export const modifyBridgePosition = (ticket: number, sl?: number, tp?: number) =>
  api.post("/bridge/api/modify-position", { ticket, sl, tp }).then((r) => r.data);

// Alerts config
export const fetchAlertConfig = () => api.get("/terminal/alert-config").then((r) => r.data);
export const updateAlertConfig = (cfg: any) => api.post("/terminal/alert-config", cfg).then((r) => r.data);

