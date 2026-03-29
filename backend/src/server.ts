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
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
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

// --- MT5 BRIDGE PROXY SYSTEM (Production vs Local) ---
// If TRADE_MODE = 'cloud', we would route this to MetaApi REST endpoints.
// If TRADE_MODE = 'local', we route this to the local Python script (port 5003).
const tradeMode = process.env.TRADE_MODE || "local";
const localMt5Url = process.env.LOCAL_MT5_URL || "http://localhost:5003";

app.use(
  "/bridge",
  (req, res, next) => {
    if (tradeMode === "cloud") {
      // In a real production Option 2 environment, you would use the
      // MetaApi JS SDK here to forward the req.body securely.
      // For now, we simulate what the cloud routing would look like.
      console.log(
        `[CLOUD PROXY] Routing to MetaApi... (Not implemented in local test mode)`,
      );
      return res
        .status(501)
        .json({
          error: "Cloud MetaApi integration requires production credentials.",
        });
    }
    next();
  },
  createProxyMiddleware({
    target: localMt5Url,
    changeOrigin: true,
    pathRewrite: {
      "^/bridge": "", // strip /bridge off the URL
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
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Trading Journal API ready`);
});

export default app;
