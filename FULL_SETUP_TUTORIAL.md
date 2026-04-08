# Complete Setup Tutorial - Local Deployment with Vercel + Cloudflare

**Last Updated**: April 8, 2026  
**Setup Time**: ~30-45 minutes  
**Difficulty**: Intermediate

---

## Table of Contents

1. [Prerequisites Check](#prerequisites-check)
2. [Step 1: Install PostgreSQL](#step-1-install-postgresql)
3. [Step 2: Install Node.js Dependencies](#step-2-install-nodejs-dependencies)
4. [Step 3: Setup Environment Variables](#step-3-setup-environment-variables)
5. [Step 4: Configure Database](#step-4-configure-database)
6. [Step 5: Start Backend Server](#step-5-start-backend-server)
7. [Step 6: Start MT5 Bridge](#step-6-start-mt5-bridge)
8. [Step 7: Setup Cloudflare Tunnel](#step-7-setup-cloudflare-tunnel)
9. [Step 8: Deploy Frontend to Vercel](#step-8-deploy-frontend-to-vercel)
10. [Step 9: Connect Everything](#step-9-connect-everything)
11. [Troubleshooting](#troubleshooting)
12. [Daily Startup Checklist](#daily-startup-checklist)

---

## Prerequisites Check

Before starting, verify you have:

- ✅ Windows 10/11 PC
- ✅ MetaTrader 5 installed with MT5 account
- ✅ Admin access to your computer
- ✅ GitHub account (for Vercel deployment)
- ✅ ~1.5 GB free disk space

---

## Step 1: Install PostgreSQL

### 1.1 Download PostgreSQL

1. Go to https://www.postgresql.org/download/windows/
2. Click **"Download the installer"**
3. Choose **PostgreSQL 15** (Latest stable)
4. Run the installer

### 1.2 Installation Settings

When installer asks:

| Setting            | Value                                 |
| ------------------ | ------------------------------------- |
| Data Directory     | `C:\Program Files\PostgreSQL\15\data` |
| Port               | `5432`                                |
| Superuser password | `password123` (remember this!)        |
| Locale             | Your timezone                         |

### 1.3 Verify Installation

Open PowerShell and run:

```powershell
psql --version
```

Should show: `psql (PostgreSQL) 15.x`

---

## Step 2: Install Node.js Dependencies

### 2.1 Check Node.js Installation

```powershell
node --version
npm --version
```

If not installed, download from https://nodejs.org (LTS version)

### 2.2 Install Backend Dependencies

```powershell
# Navigate to backend directory
cd d:\Forex\dashboardkiller\backend

# Install dependencies
npm install

# Should complete without errors
```

If you see errors, run:

```powershell
npm install --legacy-peer-deps
```

### 2.3 Build Project

```powershell
npm run build
```

Should create `dist/` folder

---

## Step 3: Setup Environment Variables

### 3.1 Create Backend .env File

Create file: `d:\Forex\dashboardkiller\backend\.env`

```env
# Database Connection
DATABASE_URL=postgresql://postgres:password123@localhost:5432/trading

# Server
PORT=5000
NODE_ENV=production

# MT5 Bridge
MT5_BRIDGE_URL=http://localhost:5003

# Internal Services (if using bots)
PAIR_BOT_URL=http://localhost:5001
XAUUSD_BOT_URL=http://localhost:5000
RISK_TABLE_URL=http://localhost:5002
BACKTESTING_URL=http://localhost:5004
CALENDAR_SHEET_URL=http://localhost:8765
```

### 3.2 Create Frontend .env.local File

Create file: `d:\Forex\dashboardkiller\frontend\.env.local`

```env
# You'll update this after Cloudflare tunnel is created
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Update to Cloudflare URL after Step 7.

---

## Step 4: Configure Database

### 4.1 Create Database

Open PowerShell:

```powershell
# Connect to PostgreSQL
psql -U postgres
```

When prompted for password, enter: `password123`

### 4.2 Run SQL Commands

```sql
-- Create database
CREATE DATABASE trading;

-- Connect to database
\c trading

-- List tables (should be empty)
\dt

-- Exit
\q
```

### 4.3 Run Prisma Migrations

```powershell
cd d:\Forex\dashboardkiller\backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

Should show:

```
✓ Ran 0 migrations (all up to date)
```

---

## Step 5: Start Backend Server

### 5.1 Start in Development Mode

```powershell
cd d:\Forex\dashboardkiller\backend

npm run dev
```

Should show:

```
✓ Server started on port 5000
✓ Connected to database
```

### 5.2 Test Backend

Open new PowerShell and test:

```powershell
# Check server health
curl http://localhost:5000/health

# Should return: {"status":"ok","timestamp":"..."}
```

Keep this terminal open - backend stays running.

---

## Step 6: Start MT5 Bridge

### 6.1 Check mt5_bridge.py

Verify file exists: `d:\Forex\dashboardkiller\mt5_bridge.py`

### 6.2 Install Python Dependencies

```powershell
# Open new PowerShell terminal
python --version

# Should show Python 3.9+
# Install requirements
cd d:\Forex\dashboardkiller

pip install -r requirements.txt
```

### 6.3 Start MT5 Bridge

```powershell
# Same terminal
python mt5_bridge.py
```

Should show:

```
MT5 Bridge Server started on port 5003
Connection: CONNECTED
Account: Your_Account_Number
```

Keep this terminal open - MT5 bridge stays running.

---

## Step 7: Setup Cloudflare Tunnel

### 7.1 Install Cloudflared

**Option A: Using Chocolatey**

```powershell
choco install cloudflared
```

**Option B: Download Manually**

1. Go to https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
2. Download Windows 64-bit version
3. Extract to: `C:\Program Files\cloudflared\`
4. Add to PATH

### 7.2 Verify Installation

```powershell
cloudflared --version
```

Should show version number

### 7.3 Login to Cloudflare

```powershell
# Open new PowerShell terminal
cloudflared login
```

This will:

1. Open browser
2. Ask you to login to Cloudflare (or create free account)
3. Authorize the connection
4. Return to PowerShell with "Success"

### 7.4 Create Tunnel for Backend

```powershell
# Create tunnel
cloudflared tunnel create mytrading-backend
```

Saves tunnel credentials. You'll see output like:

```
Tunnel 'mytrading-backend' created successfully.
```

### 7.5 Run Tunnel (Backend)

```powershell
# Keep in separate terminal
cloudflared tunnel run --url http://localhost:5000 mytrading-backend
```

Should show:

```
INF Connected to cloudflare
INF Route assigned: https://mytrading-backend-xxxxx.trycloudflare.com
```

**Copy this URL** - you'll need it for Vercel.

---

## Step 8: Deploy Frontend to Vercel

### 8.1 Push Code to GitHub

```powershell
# Navigate to project
cd d:\Forex\dashboardkiller

# Initialize git (if not done)
git init
git add .
git commit -m "Initial deploy"

# Create repo on GitHub
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/dashboardkiller.git
git push -u origin main
```

### 8.2 Import to Vercel

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Paste GitHub URL
4. Select **"dashboardkiller"** repository
5. Click **Import**

### 8.3 Configure Environment Variables

In Vercel dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add new variable:

| Key                   | Value                                               |
| --------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | `https://mytrading-backend-xxxxx.trycloudflare.com` |

Replace with your Cloudflare tunnel URL from Step 7.5

### 8.4 Deploy

1. Click **Deploy**
2. Wait for build to complete (2-3 minutes)
3. Get Vercel URL: `https://dashboardkiller-xxxxx.vercel.app`

---

## Step 9: Connect Everything

### 9.1 Update Frontend .env.local

Edit `d:\Forex\dashboardkiller\frontend\.env.local`:

```env
NEXT_PUBLIC_API_URL=https://mytrading-backend-xxxxx.trycloudflare.com
```

### 9.2 Test Connection (Local)

```powershell
cd d:\Forex\dashboardkiller\frontend

npm run dev
```

Open browser: `http://localhost:3000`

Should load dashboard. If data loads, connection works!

### 9.3 Test Connection (Vercel)

Open browser: `https://dashboardkiller-xxxxx.vercel.app`

Should work same as local.

---

## Summary: What's Running

After completing all steps, you have:

```
┌─ Terminal 1 ────────────────────────┐
│ Backend Server                       │
│ npm run dev                          │
│ Running on: http://localhost:5000   │
└──────────────────────────────────────┘

┌─ Terminal 2 ────────────────────────┐
│ MT5 Bridge                           │
│ python mt5_bridge.py                │
│ Running on: http://localhost:5003   │
└──────────────────────────────────────┘

┌─ Terminal 3 ────────────────────────┐
│ Cloudflare Tunnel (Backend)         │
│ cloudflared tunnel run ...          │
│ Exposed at: https://mytrading-...   │
└──────────────────────────────────────┘

┌─ Vercel (Hosted) ────────────────────────┐
│ Frontend Next.js App                     │
│ URL: https://dashboardkiller-xxxxx...   │
│ Calls: Backend via Cloudflare tunnel    │
└──────────────────────────────────────────┘
```

---

## Troubleshooting

### Problem: Backend won't start

**Error**: `Port 5000 already in use`

**Solution**:

```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (replace PID with number from above)
taskkill /PID <PID> /F

# Start backend again
npm run dev
```

---

### Problem: Database connection failed

**Error**: `ECONNREFUSED 127.0.0.1:5432`

**Solution**:

```powershell
# Check if PostgreSQL is running
# Option 1: Restart PostgreSQL service
net stop postgresql-x64-15
net start postgresql-x64-15

# Option 2: Verify .env DATABASE_URL
# Should be: postgresql://postgres:password123@localhost:5432/trading
```

---

### Problem: MT5 Bridge shows "Can't connect to MT5"

**Error**: `MetaTrader5 not available`

**Solution**:

1. Open MetaTrader 5 terminal (manually)
2. Keep it open while running bridge
3. Make sure your MT5 account is logged in
4. Restart bridge:

```powershell
# Ctrl+C to stop
# Then restart
python mt5_bridge.py
```

---

### Problem: Cloudflare tunnel won't connect

**Error**: `Error: Tunnel closed or no route`

**Solution**:

```powershell
# Logout and re-login
cloudflared tunnel logout

# Re-authenticate
cloudflared login

# Delete and recreate tunnel
cloudflared tunnel delete mytrading-backend
cloudflared tunnel create mytrading-backend

# Run again
cloudflared tunnel run --url http://localhost:5000 mytrading-backend
```

---

### Problem: Vercel frontend shows blank page

**Error**: `Failed to fetch from API`

**Solution**:

1. Check NEXT_PUBLIC_API_URL in Vercel settings
2. Verify it matches Cloudflare tunnel URL exactly
3. Redeploy from Vercel dashboard:
   - Settings → Git → Redeploy

---

### Problem: Data not updating in real-time

**Error**: `MT5 positions not showing / stale data`

**Solution**:

1. Check if MT5 terminal is open
2. Check if MT5 account is logged in
3. Restart MT5 bridge:

```powershell
# In MT5 Bridge terminal
Ctrl+C

# Wait 2 seconds
python mt5_bridge.py
```

---

## Daily Startup Checklist

Every time you want to trade, do this:

```powershell
# ✓ Terminal 1: Start Backend
cd d:\Forex\dashboardkiller\backend
npm run dev
# Wait for: "✓ Server started on port 5000"

# ✓ Terminal 2: Start MT5 Bridge
cd d:\Forex\dashboardkiller
python mt5_bridge.py
# Wait for: "MT5 Bridge Server started on port 5003"

# ✓ Terminal 3: Start Cloudflare Tunnel
cloudflared tunnel run --url http://localhost:5000 mytrading-backend
# Wait for: "Route assigned: https://mytrading-backend-..."

# ✓ Open Chrome/Browser
# Go to: https://dashboardkiller-xxxxx.vercel.app
# OR: http://localhost:3000 (if running local frontend)

# ✓ Login and start trading!
```

---

## Quick Reference

| Service               | URL                                               | Runs On  |
| --------------------- | ------------------------------------------------- | -------- |
| **Backend API**       | `http://localhost:5000`                           | Your PC  |
| **MT5 Bridge**        | `http://localhost:5003`                           | Your PC  |
| **PostgreSQL**        | `postgresql://localhost:5432`                     | Your PC  |
| **Cloudflare Tunnel** | `https://mytrading-backend-....trycloudflare.com` | Internet |
| **Frontend (Local)**  | `http://localhost:3000`                           | Your PC  |
| **Frontend (Vercel)** | `https://dashboardkiller-....vercel.app`          | Hosted   |

---

## Costs

| Service               | Cost         | Notes                       |
| --------------------- | ------------ | --------------------------- |
| **PostgreSQL**        | Free         | Open source                 |
| **Node.js**           | Free         | Open source                 |
| **Cloudflare Tunnel** | Free         | No credit card needed       |
| **Vercel**            | Free         | Up to 100GB bandwidth/month |
| **MT5**               | Free         | Your broker provides it     |
| **TOTAL**             | **$0/month** | ✅ Completely free!         |

---

## Next Steps

1. ✅ Complete setup above
2. ✅ Test trading flows (enter trades, view dashboard)
3. ✅ Verify real-time MT5 data updates
4. ⏭️ Consider adding dashboard widgets (see WIDGET_ENHANCEMENT_RECOMMENDATIONS.md)
5. ⏭️ Setup automated trading (Phase 2)

---

## Support

**If you get stuck:**

1. Check Troubleshooting section above
2. Verify all 3 terminals are running
3. Check environment variables in `.env` files
4. Restart everything (stop all terminals, restart)
5. Check logs in each terminal for error messages

---

**Happy Trading!** 🚀

Made with ❤️ for traders who want full control.
