# Complete Docker Setup Tutorial - Local Deployment with Vercel + Cloudflare

**Last Updated**: April 8, 2026  
**Setup Time**: ~20-30 minutes  
**Difficulty**: Easy

---

## Table of Contents

1. [Prerequisites Check](#prerequisites-check)
2. [Step 1: Install Docker Desktop](#step-1-install-docker-desktop)
3. [Step 2: Setup Environment Variables](#step-2-setup-environment-variables)
4. [Step 3: Start All Services with Docker](#step-3-start-all-services-with-docker)
5. [Step 4: Setup Cloudflare Tunnel](#step-4-setup-cloudflare-tunnel)
6. [Step 5: Deploy Frontend to Vercel](#step-5-deploy-frontend-to-vercel)
7. [Step 6: Connect Everything](#step-6-connect-everything)
8. [Troubleshooting](#troubleshooting)
9. [Daily Startup Checklist](#daily-startup-checklist)

---

## Prerequisites Check

Before starting, verify you have:

- ✅ Windows 10/11 PC with virtualization enabled
- ✅ MetaTrader 5 installed with MT5 account
- ✅ Admin access to your computer
- ✅ GitHub account (for Vercel deployment)
- ✅ ~3 GB free disk space
- ✅ 8 GB RAM minimum (for Docker)

---

## Step 1: Install Docker Desktop

### 1.1 Download Docker Desktop

1. Go to https://www.docker.com/products/docker-desktop
2. Click **"Download for Windows"**
3. Choose **Docker Desktop for Windows (x86)**
4. Run installer

### 1.2 Installation Settings

When installer asks:

| Setting                         | Value                             |
| ------------------------------- | --------------------------------- |
| WSL 2 Based Engine              | ✅ Enabled (default)              |
| Hyper-V Backend                 | Can be disabled if WSL2 available |
| Start Docker Desktop when login | Up to you                         |

### 1.3 Verify Installation

Open PowerShell:

```powershell
docker --version
docker ps
```

Should show version and no errors.

---

## Step 2: Setup Environment Variables

### 2.1 Create Backend .env File

Create file: `d:\Forex\dashboardkiller\backend\.env`

```env
# Database Connection
DATABASE_URL=postgresql://postgres:password123@postgres:5432/trading

# Server
PORT=5000
NODE_ENV=production

# MT5 Bridge (runs on host machine)
MT5_BRIDGE_URL=http://host.docker.internal:5003

# Internal Services (if using bots)
PAIR_BOT_URL=http://pair_bot:5001
XAUUSD_BOT_URL=http://xauusd_bot:5000
RISK_TABLE_URL=http://risk_table:5002
BACKTESTING_URL=http://backtesting:5004
CALENDAR_SHEET_URL=http://calendar_sheet:8765
```

**Key difference**: Database is `postgres` (container name) not `localhost`

### 2.2 Create Frontend .env.local File

Create file: `d:\Forex\dashboardkiller\frontend\.env.local`

```env
# You'll update this after Cloudflare tunnel is created
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Update to Cloudflare URL after Step 4.

---

## Step 3: Start All Services with Docker

### 3.1 Verify docker-compose.yml

Your existing `docker-compose.yml` should have:

```yaml
version: "3"

services:
  main_gateway:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password123@postgres:5432/trading
      - MT5_BRIDGE_URL=http://host.docker.internal:5003
    networks:
      - trading_network
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_PASSWORD=password123
      - POSTGRES_DB=trading
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - trading_network
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  trading_network:
    driver: bridge
```

### 3.2 Start Docker Services

Open PowerShell in project directory:

```powershell
cd d:\Forex\dashboardkiller

# Start all containers
docker-compose up -d
```

Should show:

```
[+] Running 3/3
 ✔ Container dashboardkiller-postgres-1     Started
 ✔ Container dashboardkiller-main_gateway-1 Started
```

### 3.3 Verify Services are Running

```powershell
# List running containers
docker-compose ps
```

Should show both `main_gateway` and `postgres` with status "Up"

### 3.4 Test Backend

```powershell
# Check server health
curl http://localhost:5000/health

# Should return: {"status":"ok","..."}
```

If error, check logs:

```powershell
# View backend logs
docker-compose logs main_gateway

# View database logs
docker-compose logs postgres
```

---

## Step 4: Start MT5 Bridge (Local)

**Important**: MT5 Bridge still runs on your Windows PC (not in Docker)

### 4.1 Install Python Dependencies

```powershell
# Open new PowerShell terminal
cd d:\Forex\dashboardkiller

# Install requirements
pip install -r requirements.txt
```

### 4.2 Start MT5 Bridge

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

Keep this terminal open.

---

## Step 5: Setup Cloudflare Tunnel

### 5.1 Install Cloudflared

```powershell
choco install cloudflared
```

Or download manually from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

### 5.2 Verify Installation

```powershell
cloudflared --version
```

### 5.3 Login to Cloudflare

```powershell
# Open new PowerShell terminal
cloudflared login
```

Browser will open. Login to Cloudflare (create free account if needed):

1. Authorize the connection
2. Return to PowerShell with "Success"

### 5.4 Create Tunnel

```powershell
cloudflared tunnel create mytrading-backend
```

Should show:

```
Tunnel 'mytrading-backend' created successfully.
```

### 5.5 Run Tunnel

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

## Step 6: Deploy Frontend to Vercel

### 6.1 Push Code to GitHub

```powershell
# Navigate to project
cd d:\Forex\dashboardkiller

# Initialize git (if not done)
git init
git add .
git commit -m "Initial deploy with Docker"

# Create repo on GitHub, then push:
git remote add origin https://github.com/YOUR_USERNAME/dashboardkiller.git
git push -u origin main
```

### 6.2 Import to Vercel

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Paste GitHub URL
4. Select **"dashboardkiller"** repository
5. Click **Import**

### 6.3 Configure Environment Variables

In Vercel dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add variable:

| Key                   | Value                                               |
| --------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | `https://mytrading-backend-xxxxx.trycloudflare.com` |

Replace with your Cloudflare tunnel URL.

### 6.4 Deploy

1. Click **Deploy**
2. Wait 2-3 minutes for build
3. Get URL: `https://dashboardkiller-xxxxx.vercel.app`

---

## Step 7: Connect Everything

### 7.1 Update Frontend .env.local

Edit `d:\Forex\dashboardkiller\frontend\.env.local`:

```env
NEXT_PUBLIC_API_URL=https://mytrading-backend-xxxxx.trycloudflare.com
```

### 7.2 Test Connection (Local)

```powershell
cd d:\Forex\dashboardkiller\frontend

npm run dev
```

Open browser: `http://localhost:3000`

Should load dashboard with live data!

### 7.3 Test Connection (Vercel)

Open browser: `https://dashboardkiller-xxxxx.vercel.app`

Should work same as local.

---

## Summary: What's Running

After setup, you have:

```
┌─ Docker Container 1 ────────────┐
│ Backend Server (Node.js)        │
│ Port: 5000                      │
│ Status: Running in container    │
└─────────────────────────────────┘

┌─ Docker Container 2 ────────────┐
│ PostgreSQL Database             │
│ Port: 5432                      │
│ Status: Running in container    │
└─────────────────────────────────┘

┌─ Host Machine (Windows) ────────┐
│ MT5 Bridge (Python)             │
│ Port: 5003                      │
│ Status: Running locally         │
└─────────────────────────────────┘

┌─ Cloudflare Tunnel ─────────────┐
│ Exposed to Internet             │
│ https://mytrading-backend-...   │
└─────────────────────────────────┘

┌─ Vercel (Hosted) ───────────────┐
│ Frontend (Next.js)              │
│ https://dashboardkiller-...     │
└─────────────────────────────────┘
```

---

## Troubleshooting

### Problem: Docker containers won't start

**Error**: `Cannot connect to Docker daemon`

**Solution**:

```powershell
# Start Docker Desktop application
# Wait 30 seconds for Docker to initialize
# Then try again:
docker-compose up -d
```

---

### Problem: Port already in use

**Error**: `Error response from daemon: driver failed programming external connectivity on endpoint`

**Solution**:

```powershell
# Stop all containers
docker-compose down

# Check what's using port 5000
netstat -ano | findstr :5000

# Kill the process
taskkill /PID <PID> /F

# Start Docker again
docker-compose up -d
```

---

### Problem: Backend container keeps crashing

**Error**: `Container exited with code 1`

**Solution**:

```powershell
# View detailed logs
docker-compose logs main_gateway

# Common causes:
# 1. Database not ready - wait 10 seconds, restart:
docker-compose restart main_gateway

# 2. Port conflict - see above
# 3. Environment variables wrong - check backend/.env file
```

---

### Problem: Database connection error

**Error**: `ECONNREFUSED postgres:5432`

**Solution**:

```powershell
# Verify postgres container is running
docker-compose ps

# If postgres is not running:
docker-compose up -d postgres

# Wait 10 seconds for database to start
# Then restart backend:
docker-compose restart main_gateway
```

---

### Problem: MT5 Bridge won't connect

**Error**: `MetaTrader5 not available`

**Solution**:

1. Keep MetaTrader 5 terminal open (with account logged in)
2. Restart MT5 Bridge:

```powershell
# In MT5 Bridge terminal
Ctrl+C

# Wait 2 seconds
python mt5_bridge.py
```

---

### Problem: Cloudflare tunnel shows "Error"

**Error**: `Tunnel disconnected`

**Solution**:

```powershell
# Delete tunnel
cloudflared tunnel delete mytrading-backend

# Recreate it
cloudflared tunnel create mytrading-backend

# Run again
cloudflared tunnel run --url http://localhost:5000 mytrading-backend
```

---

### Problem: Vercel frontend loading but no data

**Error**: `Failed to fetch from API`

**Solution**:

1. Check NEXT_PUBLIC_API_URL in Vercel settings
2. Verify it matches Cloudflare URL exactly
3. Redeploy from Vercel:
   - Settings → Deployments → Redeploy

---

## Daily Startup Checklist

Every time you want to trade:

```powershell
# ✓ Start Docker containers (1 command)
cd d:\Forex\dashboardkiller
docker-compose up -d
# Wait 10 seconds for services to start

# ✓ Start MT5 Bridge (Terminal 2)
cd d:\Forex\dashboardkiller
python mt5_bridge.py
# Wait for: "MT5 Bridge Server started on port 5003"

# ✓ Start Cloudflare Tunnel (Terminal 3)
cloudflared tunnel run --url http://localhost:5000 mytrading-backend
# Wait for: "Route assigned: https://mytrading-backend-..."

# ✓ Open Browser
# Go to: https://dashboardkiller-xxxxx.vercel.app
# OR: http://localhost:3000 (if running local frontend)

# ✓ Done! Start trading!
```

---

## Stopping Everything

When you're done trading:

```powershell
# Stop all Docker containers
docker-compose down

# Stop MT5 Bridge (press Ctrl+C in that terminal)
# Stop Cloudflare Tunnel (press Ctrl+C in that terminal)
```

---

## Quick Reference

| Service               | URL                              | Runs On          |
| --------------------- | -------------------------------- | ---------------- |
| **Backend API**       | `http://localhost:5000`          | Docker container |
| **PostgreSQL**        | `postgresql://localhost:5432`    | Docker container |
| **MT5 Bridge**        | `http://localhost:5003`          | Windows PC       |
| **Cloudflare Tunnel** | `https://mytrading-backend-....` | Internet         |
| **Frontend (Local)**  | `http://localhost:3000`          | Windows PC       |
| **Frontend (Vercel)** | `https://dashboardkiller-....`   | Hosted           |

---

## Docker Commands Reference

```powershell
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View running containers
docker-compose ps

# View logs
docker-compose logs main_gateway
docker-compose logs postgres

# Restart specific service
docker-compose restart main_gateway

# View all images
docker images

# Remove unused containers
docker-compose down -v
```

---

## Costs

| Service               | Cost         | Notes                       |
| --------------------- | ------------ | --------------------------- |
| **Docker Desktop**    | Free         | Community edition           |
| **PostgreSQL**        | Free         | Container image             |
| **Node.js**           | Free         | Container image             |
| **Cloudflare Tunnel** | Free         | No credit card needed       |
| **Vercel**            | Free         | Up to 100GB bandwidth/month |
| **MT5**               | Free         | Your broker provides it     |
| **TOTAL**             | **$0/month** | ✅ Completely free!         |

---

## Advantages of Docker Setup

✅ **One command to start everything**: `docker-compose up -d`  
✅ **No manual installation**: Database & backend pre-configured  
✅ **Easy to stop/start**: No lingering processes  
✅ **Reproducible**: Same setup everywhere  
✅ **Isolated**: Services don't interfere with system

---

## Next Steps

1. ✅ Complete Docker setup above
2. ✅ Test trading flows (enter trades, view dashboard)
3. ✅ Verify real-time MT5 data updates
4. ⏭️ Add dashboard widgets (see WIDGET_ENHANCEMENT_RECOMMENDATIONS.md)
5. ⏭️ Setup automated trading (Phase 2)

---

## Support

**If you get stuck:**

1. Check Troubleshooting section above
2. Verify Docker Desktop is running
3. Check `docker-compose ps` - all containers should show "Up"
4. View logs: `docker-compose logs`
5. Try restarting: `docker-compose down && docker-compose up -d`

---

**Happy Trading!** 🚀

Made with ❤️ for traders who want simplicity + Docker.
