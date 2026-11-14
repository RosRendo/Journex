module.exports = {
  apps: [
    {
      name: "mt5-sync-engine",
      cwd: ".",
      script: "scripts/mt5_sync_engine.py",
      interpreter: ".venv\\Scripts\\python.exe",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        SYNC_PORT: 5005,
      },
    },
    {
      name: "mt5-bridge",
      cwd: ".",
      script: "mt5_bridge.py",
      interpreter: ".venv\\Scripts\\python.exe",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "journex-backend",
      cwd: "./backend",
      script: "dist/server.js",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        MT5_SYNC_ENGINE_URL: "http://localhost:5005",
      },
    },
  ],
};
