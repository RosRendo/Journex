module.exports = {
  apps: [
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
      },
    },
  ],
};
