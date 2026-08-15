module.exports = {
  apps: [
    {
      name: "mt5-bridge-dev",
      cwd: ".",
      script: "mt5_bridge.py",
      interpreter: ".venv\\Scripts\\python.exe",
      env: {
        NODE_ENV: "development"
      }
    }
  ]
};
