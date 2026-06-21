module.exports = {
  apps: [
    {
      name: "frontend-dev",
      cwd: "./frontend",
      script: "cmd.exe",
      args: "/c npm run dev",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
        INIT_CWD: "D:\\Forex\\journex\\frontend",
        PWD: "D:\\Forex\\journex\\frontend"
      }
    },
    {
      name: "backend-dev",
      cwd: "./backend",
      script: "cmd.exe",
      args: "/c npm run dev",
      env: {
        NODE_ENV: "development",
        PORT: 5000
      }
    },
    {
      name: "mt5-bridge-dev",
      cwd: ".",
      script: "mt5_bridge.py",
      interpreter: "python",
      env: {
        NODE_ENV: "development"
      }
    }
  ]
};
