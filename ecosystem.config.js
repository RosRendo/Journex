module.exports = {
  apps: [
    {
      name: "dashboard-frontend",
      cwd: "./frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        AUTH_TRUST_HOST: "true"
      }
    },
    {
      name: "dashboard-backend",
      cwd: "./backend",
      script: "dist/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    },
    {
      name: "mt5-bridge",
      cwd: ".",
      script: "mt5_bridge.py",
      interpreter: "python"
    }
  ]
};
