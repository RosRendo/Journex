/**
 * Journex unified production server.
 * ONE process, ONE port, ONE deployment:
 *   - /api/*  /uploads  /health  → Express backend (routes unchanged)
 *   - /api/auth/*  /api/bridge-status → Next.js (NextAuth)
 *   - everything else → Next.js pages
 *   - /api/ws/prices → WebSocket upgraded directly by the same HTTP server
 *
 * Deploy (Railway): build backend + frontend, then `node frontend/server.js`
 * Local dev is unchanged: `npm run dev` (separate procesess + rewrites).
 */
process.env.MOUNT_BACKEND = "1"; // backend must not listen on its own port

const http = require("http");
const path = require("path");
const next = require("next");

const port = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== "production";

const backendModule = require(path.join(__dirname, "..", "backend", "dist", "server.js"));
const backendApp = backendModule.default || backendModule;
const attachWsUpgrade = backendModule.attachWsUpgrade;
const startBackgroundJobs = backendModule.startBackgroundJobs;

if (typeof backendApp !== "function") {
  console.error("[MERGED] Backend app failed to load — did you build backend first? (cd backend && npm run build)");
  process.exit(1);
}

const nextApp = next({ dev, dir: __dirname });
const handle = nextApp.getRequestHandler();

nextApp
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => {
      const url = req.url || "";

      // Next.js-owned endpoints (NextAuth handlers + lightweight status route)
      if (url.startsWith("/api/auth") || url === "/api/bridge-status") {
        return handle(req, res);
      }

      // Backend API, health check, and uploaded files → Express
      if (url.startsWith("/api/") || url.startsWith("/uploads") || url === "/health") {
        return backendApp(req, res);
      }

      // Everything else → Next.js pages
      return handle(req, res);
    });

    if (typeof attachWsUpgrade === "function") {
      attachWsUpgrade(server);
    } else {
      console.warn("[MERGED] attachWsUpgrade missing — live price WebSocket will not work");
    }

    server.listen(port, () => {
      console.log(`🚀 Journex unified server listening on http://0.0.0.0:${port}`);
      if (typeof startBackgroundJobs === "function") {
        startBackgroundJobs();
      }
    });
  })
  .catch((err) => {
    console.error("[MERGED] Fatal startup error:", err);
    process.exit(1);
  });
