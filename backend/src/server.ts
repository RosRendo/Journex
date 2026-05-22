import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import dotenv from "dotenv";
import path from "path";
import { createProxyMiddleware } from "http-proxy-middleware";
import tradeRoutes from "./routes/tradeRoutes";
import accountRoutes from "./routes/accountRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import csvRoutes from "./routes/csvRoutes";
import calendarRoutes from "./routes/calendarRoutes";
import brokerRoutes from "./routes/brokerRoutes";
import communityRoutes from "./routes/communityRoutes";
import polarRoutes from "./routes/polarRoutes";
import checklistRoutes from "./routes/checklistRoutes";
import tradingPlanRoutes from "./routes/tradingPlanRoutes";
import terminalRoutes from "./routes/terminalRoutes";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_EMAIL = "rousrendo@gmail.com";

function isAdminRequest(req: any): boolean {
  const auth: string = req?.headers?.authorization || "";
  const email = auth.startsWith("Bearer ") ? auth.slice(7).trim().toLowerCase() : "";
  return email === ADMIN_EMAIL.toLowerCase();
}

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: true, // Allow any origin for local dev
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
  })
);
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/trades", tradeRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/csv", csvRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/broker", brokerRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/polar", polarRoutes);
app.use("/api/checklist", checklistRoutes);
app.use("/api/trading-plan", tradingPlanRoutes);
app.use("/api", terminalRoutes);

// --- MT5 BRIDGE PROXY SYSTEM (Production vs Local) ---
// If TRADE_MODE = 'cloud', route to MetaApi REST endpoints.
// If TRADE_MODE = 'local', proxy to the local Python script (port 5003).
const tradeMode = process.env.TRADE_MODE || "local";
const localMt5Url = process.env.LOCAL_MT5_URL || "http://localhost:5003";

// Mock bridge responses for non-admin callers (guests / friends)
const MOCK_BRIDGE_RESPONSES: Record<string, any> = {
  "/api/positions":     { success: true, positions: [] },
  "/api/account":       { success: true, balance: 100000, equity: 100000, profit: 0, margin: 0, margin_free: 100000, margin_level: 0, currency: "USD", server: "Paper", login: 0 },
  "/api/calculations":  { success: true, levels: [], riskPercent: 1, lotSize: 0.1 },
  "/api/close-position":   { success: true, message: "Paper trade closed" },
  "/api/modify-position":  { success: true, message: "Paper trade modified" },
  "/api/trade":         { success: true, ticket: 0, price: 0, message: "Paper trade placed" },
};

app.use(
  "/api/bridge",
  (req, res, next) => {
    // Non-admin users get safe mock responses — never reaches the real bridge
    if (!isAdminRequest(req)) {
      const key = req.path || "/";
      const mockBody = MOCK_BRIDGE_RESPONSES[key] || { success: true, data: [] };
      return res.json(mockBody);
    }
    if (tradeMode === "cloud") {
      console.log(`[CLOUD PROXY] Routing to MetaApi... (Not implemented in local test mode)`);
      return res.status(501).json({
        error: "Cloud MetaApi integration requires production credentials.",
      });
    }
    next();
  },
  createProxyMiddleware({
    target: localMt5Url,
    changeOrigin: true,
    pathRewrite: {
      "^/api/bridge": "", // strip /api/bridge off the URL
    },
  }),
);

// Note: Bot/risk/backtesting services removed (were Docker-based, MT5-dependent)

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Main API Gateway",
    port: PORT,
  });
});

// Error handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Trading Journal API ready`);

  // Start the news watcher background loop
  try {
    startNewsWatcher(
      async () => {
        const keys = getSettings().api_keys || {};
        try {
          const res = await getRealNews(keys, undefined, 15);
          return res.items || [];
        } catch (err: any) {
          console.warn("[NEWS WATCHER] Failed fetching real news, using fallback mock news:", err.message);
          return getNews();
        }
      },
      () => getSettings().api_keys || {}
    );
  } catch (err) {
    console.error("[NEWS WATCHER STARTUP ERROR]", err);
  }
});

// --- WEBSOCKET PRICING STREAM SYSTEM ---
import { WebSocketServer } from "ws";
import url from "url";
import { SYMBOLS, getNews, getSettings } from "./routes/terminalRoutes";
import { OandaPricingStream } from "./services/priceStreamService";
import { startNewsWatcher } from "./services/newsWatcherService";
import { getRealNews } from "./services/externalFeedsService";

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws, request) => {
  const parsedUrl = url.parse(request.url || "", true);
  const symbolParam  = parsedUrl.query.symbol  as string;
  const symbolsParam = parsedUrl.query.symbols as string;
  // Session token — frontend sends ?token=<email> so we can isolate pricing feeds
  const tokenEmail   = ((parsedUrl.query.token as string) || "").trim().toLowerCase();
  const callerIsAdmin = tokenEmail === ADMIN_EMAIL.toLowerCase();

  let subscribedSymbols: string[] = [];
  if (symbolsParam) {
    subscribedSymbols = symbolsParam.split(",");
  } else if (symbolParam) {
    subscribedSymbols = [symbolParam];
  } else {
    subscribedSymbols = Object.keys(SYMBOLS);
  }

  // Non-admin callers always get the mock random-walk feed — no live Oanda ticks
  const currentSettings = getSettings();
  const broker = currentSettings.broker || { provider: "mock" };

  let oandaStream: OandaPricingStream | null = null;
  let mockInterval: NodeJS.Timeout | null = null;

  if (callerIsAdmin && broker.provider === "oanda" && broker.api_key && broker.account_id) {
    const baseUrl = broker.base_url || "https://api-fxpractice.oanda.com";
    
    oandaStream = new OandaPricingStream(
      broker.api_key,
      broker.account_id,
      baseUrl,
      subscribedSymbols
    );

    oandaStream.on("tick", (tick) => {
      if (ws.readyState === 1) { // OPEN
        ws.send(JSON.stringify(tick));
      }
    });

    oandaStream.on("error", (err: any) => {
      console.error(`[OANDA WS STREAM ERROR] ${err.message || err}`);
      // Fallback to local mock intervals on stream errors
      if (!mockInterval) {
        startMockInterval();
      }
    });

    oandaStream.on("end", () => {
      console.log("[OANDA WS STREAM ENDED] Stream ended, falling back to mock.");
      if (!mockInterval) {
        startMockInterval();
      }
    });

    try {
      oandaStream.start();
    } catch (err: any) {
      console.error(`[OANDA STREAM START FAILED] ${err.message}`);
      startMockInterval();
    }
  } else {
    startMockInterval();
  }

  function startMockInterval() {
    if (mockInterval) return;
    
    // Send initial mock ticks immediately so client gets data immediately
    sendMockTicks();

    mockInterval = setInterval(() => {
      if (ws.readyState !== 1) {
        clearInterval(mockInterval!);
        return;
      }
      sendMockTicks();
    }, 500); // 500ms intervals for responsive terminal mock price feed
  }

  function sendMockTicks() {
    for (const s of subscribedSymbols) {
      const base = SYMBOLS[s];
      if (!base) continue;

      const digits = base.digits;
      const pip = Math.pow(10, -digits);

      // Random walk with tiny drift and volatility
      const change = (Math.random() - 0.5) * pip * 2;
      base.price = parseFloat((base.price + change).toFixed(digits));

      const bid = parseFloat((base.price - pip).toFixed(digits));
      const ask = parseFloat((base.price + pip).toFixed(digits));

      const tick = {
        type: "tick",
        symbol: s,
        bid,
        ask,
        mid: base.price,
        time: new Date().toISOString(),
        source: "mock",
      };

      ws.send(JSON.stringify(tick));
    }
  }

  ws.on("close", () => {
    if (oandaStream) {
      oandaStream.stop();
      oandaStream = null;
    }
    if (mockInterval) {
      clearInterval(mockInterval);
      mockInterval = null;
    }
  });
});

server.on("upgrade", (request, socket, head) => {
  const pathname = url.parse(request.url || "").pathname;
  if (pathname === "/api/ws/prices") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

export default app;
