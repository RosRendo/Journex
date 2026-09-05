import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import dotenv from "dotenv";
import axios from "axios";
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
import terminalRoutes, { getSettings } from "./routes/terminalRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import authRoutes from "./routes/authRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import aiRoutes from "./routes/aiRoutes";
import replayRoutes from "./routes/replayRoutes";
import lessonRoutes from "./routes/lessonRoutes";
import settingsRoutes from "./routes/settingsRoutes";
import { buildAdapter } from "./services/terminalBrokerAdapter";
import { errorHandler } from "./middleware/errorHandler";
import { verifyAdminToken } from "./middleware/auth";
import { requireAuth } from "./middleware/authMiddleware";
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";
import fs from "fs";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;
const ADMIN_EMAIL = "rousrendo@gmail.com";

// Ensure logs directory exists
const LOG_DIR = path.join(__dirname, "../logs");
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
const LOG_FILE = path.join(LOG_DIR, "backend.log");

// Helper to write logs with size-based rotation (10MB limit)
function logToFile(line: string) {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size > 10 * 1024 * 1024) { // 10MB
        fs.renameSync(LOG_FILE, LOG_FILE + ".old");
      }
    }
  } catch (err) {
    console.error("Log rotation failed:", err);
  }
  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) console.error("Failed writing to log:", err);
  });
}

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logLine = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - IP: ${req.ip}\n`;
    logToFile(logLine);
  });
  next();
});

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
  })
);
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Gateway Rate Limiting (generous 5000 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests from this IP. Please try again later." },
});
app.use("/api/", (req, res, next) => {
  if (req.path.startsWith("/internal/bridge-push")) {
    return next(); // Exempt the high-frequency internal webhook from rate limits
  }
  limiter(req, res, next);
});


function isAdminRequest(req: any): boolean {
  const auth: string = req?.headers?.authorization || "";
  return verifyAdminToken(auth).valid;
}

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/backend-auth", authRoutes);
app.use("/api", (req, res, next) => {
  if (
    req.path.startsWith("/bridge") || 
    req.path.startsWith("/internal") || 
    req.path.startsWith("/terminal") || 
    req.path.startsWith("/calendar") ||
    req.path.startsWith("/signals")
  ) {
    return next();
  }
  requireAuth(req, res, next);
});
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
app.use("/api/payments", paymentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/replay", replayRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/settings", settingsRoutes);

// Mock subscription route to prevent 404s on the frontend
app.get("/api/subscription/status", (req, res) => {
  const auth: string = req?.headers?.authorization || "";
  const isPro = verifyAdminToken(auth).valid;
  res.json({ isPro });
});


// --- MT5 BRIDGE PROXY SYSTEM (Production vs Local) ---
// If TRADE_MODE = 'cloud', route to MetaApi REST endpoints.
// If TRADE_MODE = 'local', proxy to the local Python script (port 5003).
const tradeMode = process.env.TRADE_MODE || "local";
const localMt5Url = process.env.MT5_BRIDGE_URL || process.env.LOCAL_MT5_URL || "http://localhost:5003";

// Custom handler for bridge endpoints if using MetaApi
app.use("/api/bridge/api", async (req, res, next) => {
  const currentSettings = getSettings();
  const activeId = req.headers["x-broker-account-id"] as string || currentSettings.activeAccountId;
  let broker = currentSettings.broker || { provider: "mt5_bridge" };
  
  if (currentSettings.accounts && currentSettings.accounts.length > 0) {
    broker = currentSettings.accounts.find((a: any) => a.id === activeId) || currentSettings.accounts[0];
  }

  if (broker.provider !== "metaapi") {
    // Pass to proxy middleware below (hits local MT5 Bridge)
    return next();
  }

  try {
    const adapter = buildAdapter(broker);

    if (req.method === "GET" && req.path === "/positions") {
      const positions = await adapter.getPositions();
      return res.json({ success: true, positions });
    }

    if (req.method === "POST" && req.path === "/close-position") {
      const { ticket } = req.body;
      const result = await adapter.closeTrade(ticket.toString());
      return res.json({ success: true, message: "Position closed", result });
    }

    if (req.method === "POST" && req.path === "/modify-position") {
      // Note: MetaApiSDK doesn't have a direct modifyPosition via the basic adapter yet,
      // but we can just say "not implemented" for now or implement it in the adapter later.
      return res.json({ success: false, message: "Modification not supported in current MetaApi adapter" });
    }

    if (req.method === "POST" && req.path === "/trade") {
      // Support quick trade proxy
      const { action, symbol, lotSize, sl, tp } = req.body;
      const result = await adapter.submitOrder(symbol, action === "buy" ? "BUY" : "SELL", lotSize, sl, tp);
      return res.json({ success: true, message: "Trade placed", result });
    }

    return res.status(404).json({ success: false, message: "Endpoint not found" });
  } catch (err: any) {
    console.error("[MetaApi Proxy Error]", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to communicate with MetaApi" });
  }
});

app.use(
  "/api/bridge",
  createProxyMiddleware({
    target: localMt5Url,
    changeOrigin: true,
    pathRewrite: {
      "^/api/bridge": "", // strip /api/bridge off the URL
    },
    on: {
      error: (err: any, req: any, res: any) => {
        res.status(502).json({ error: "Local MT5 Bridge is unreachable." });
      }
    }
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
const server = app.listen(Number(PORT), '0.0.0.0', () => {
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
          return [];
        }
      },
      () => getSettings().api_keys || {}
    );
  } catch (err) {
    console.error("[NEWS WATCHER STARTUP ERROR]", err);
  }
});

// --- INTERNAL BRIDGE WEBHOOK ---
app.post("/api/internal/bridge-push", (req, res) => {
  const payload = req.body;
  if (wss) {
    let count = 0;
    wss.clients.forEach((client) => {
      if (client.readyState === 1) { // OPEN
        client.send(JSON.stringify(payload));
        count++;
      }
    });
    res.json({ success: true, broadcasted: count });
  } else {
    res.status(500).json({ success: false, error: "WebSocket server not initialized" });
  }
});

// --- WEBSOCKET PRICING STREAM SYSTEM ---
import { WebSocketServer } from "ws";
import url from "url";
import { SYMBOLS } from "./routes/terminalRoutes";
import { OandaPricingStream } from "./services/priceStreamService";
import { startNewsWatcher } from "./services/newsWatcherService";
import { getRealNews } from "./services/externalFeedsService";
import { syncBrokerTrades } from "./services/syncService";

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws, request) => {
  const parsedUrl = url.parse(request.url || "", true);
  const symbolParam = parsedUrl.query.symbol as string;
  const symbolsParam = parsedUrl.query.symbols as string;
  // Session token — frontend sends ?token=<jwt> so we can isolate pricing feeds
  const token = ((parsedUrl.query.token as string) || "").trim();
  let callerIsAdmin = false;

  // Try validating token as signed JWT
  try {
    if (process.env.NODE_ENV !== "production") {
      callerIsAdmin = true;
    } else {
      const API_SECRET_KEY = process.env.API_SECRET_KEY || "dev-api-secret-key-change-in-prod";
      const decoded = jwt.verify(token, API_SECRET_KEY) as { email: string };
      callerIsAdmin = decoded?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    }
  } catch (err) {
    callerIsAdmin = false;
  }

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
  const broker = currentSettings.broker || { provider: "mt5_bridge" };

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
  } else if (broker.provider === "mt5_bridge") {
    // Probe the bridge — if alive, use it; if not, start mock and keep trying
    const targetUrl = localMt5Url.replace("localhost", "127.0.0.1");
    let bridgeWatchdog: NodeJS.Timeout | null = null;

    let mt5Interval: NodeJS.Timeout | null = null;

    const tryConnectBridge = () => {
      fetch(`${targetUrl}/api/live-data`, { signal: AbortSignal.timeout(2000) })
        .then(r => r.json())
        .then((json: any) => {
          if (mockInterval) {
            clearInterval(mockInterval);
            mockInterval = null;
          }
          if (bridgeWatchdog) {
            clearInterval(bridgeWatchdog);
            bridgeWatchdog = null;
          }
          
          if (!mt5Interval) {
            mt5Interval = setInterval(() => {
              if (ws.readyState !== 1) {
                clearInterval(mt5Interval!);
                return;
              }
              fetch(`${targetUrl}/api/live-data`, { signal: AbortSignal.timeout(2000) })
                .then(r => r.json())
                .then((res: any) => {
                  if (res.success && res.data && ws.readyState === 1) {
                    res.data.forEach((t: any) => {
                      ws.send(JSON.stringify({
                        type: "tick",
                        symbol: t.symbol,
                        bid: t.bid,
                        ask: t.ask,
                        mid: (t.bid + t.ask) / 2,
                        time: new Date(t.time * 1000).toISOString(),
                        source: "mt5_bridge"
                      }));
                    });
                  }
                })
                .catch(() => {
                   // Ignore temporary fetch failures inside the interval
                });
            }, 500);
          }
        })
        .catch(() => {
          // Bridge unreachable — fall back to mock and retry
          if (mt5Interval) {
            clearInterval(mt5Interval);
            mt5Interval = null;
          }
          console.warn("[WS] MT5 Bridge unreachable — starting mock feed, will retry...");
          if (!mockInterval) startMockInterval();
          if (!bridgeWatchdog) {
            bridgeWatchdog = setInterval(tryConnectBridge, 8000);
          }
        });
    };

    tryConnectBridge();

    // Clean up intervals on disconnect
    ws.on("close", () => {
      if (bridgeWatchdog) clearInterval(bridgeWatchdog);
      if (mt5Interval) clearInterval(mt5Interval);
    });
  } else {
    // No live broker configured — use mock feed
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
