# 🚀 DashboardKiller — Complete Production & Local Startup Guide

---

## 🗺️ Architecture at a Glance

```
┌────────────────────────────────────────────────────────────────┐
│  CLOUD (always on, accessible from anywhere)                   │
│                                                                │
│   Vercel                    Railway                            │
│   ┌──────────────┐          ┌─────────────────────────┐        │
│   │ Next.js      │  HTTPS   │ Express Backend (Node)  │        │
│   │ Frontend     │◄────────►│ + PostgreSQL Database   │        │
│   │ (Vercel)     │          │ (Railway Postgres add-on)│        │
│   └──────────────┘          └─────────────────────────┘        │
└────────────────────────────────────────────────────────────────┘
              │                          │
              │ Auth gated               │ Railway calls Ngrok
              │ (Google OAuth)           │ to reach local MT5
              ▼                          ▼
┌────────────────────────────────────────────────────────────────┐
│  YOUR LAPTOP (only runs when you are trading)                  │
│                                                                │
│   Windows Native                                               │
│   ┌─────────────────────────┐   ┌───────────────┐             │
│   │ MT5 Bridge              │   │ Ngrok Tunnel  │             │
│   │ (python mt5_bridge.py)  │◄──│ :5003 → cloud │             │
│   │ Port 5003               │   └───────────────┘             │
│   └─────────────────────────┘                                 │
│          │                                                     │
│          ▼                                                     │
│   MetaTrader 5 Client                                          │
│   (Your live broker account)                                   │
└────────────────────────────────────────────────────────────────┘
```

**Your friend** visits `https://dashboard-nine-flax-74.vercel.app` →  
signs in with their Google account → gets **paper trading (mock)** only.  
Your live MT5 data stays private — only your admin email sees it.

---

## 🌐 PRODUCTION Mode (Daily Use — Vercel + Railway)

This is how you access the dashboard after setup. **No Docker needed.**

### Step 1 — Double-click `start_production.bat`

This script automatically:
1. Starts the MT5 Bridge on Windows (`python mt5_bridge.py`)
2. Starts Ngrok to expose the bridge to the Railway backend

### Step 2 — Update Railway `LOCAL_MT5_URL` (only when Ngrok URL changes)

After Ngrok starts, look at the Ngrok terminal window for a line like:
```
Forwarding  https://abcd1234.ngrok-free.app -> http://localhost:5003
```

Copy that HTTPS URL and update it in Railway:
1. Go to [railway.app](https://railway.app) → Your Project → Backend service
2. Click **Variables** tab
3. Set `LOCAL_MT5_URL = https://abcd1234.ngrok-free.app`
4. Railway will redeploy automatically (~30 seconds)

> **Tip**: Buy a static Ngrok domain (free plan = 1 static domain) at
> [dashboard.ngrok.com/domains](https://dashboard.ngrok.com/domains).
> Then your URL never changes and you skip this step.

### That's it! Open your browser to:
```
https://dashboard-nine-flax-74.vercel.app/dashboard
```

---

## 💻 LOCAL DEV Mode (Code Changes / Testing)

Use this when you are actively editing code and want fast hot-reload.

### Step 1 — Double-click `start_local.bat`

This script automatically:
1. Starts PostgreSQL + Express Backend via Docker in WSL
2. Starts MT5 Bridge on Windows
3. Starts Next.js frontend with hot-reload (`npm run dev`)
4. Opens `http://localhost:3000/dashboard` in your browser

### What runs where:

| Service | URL | How it starts |
|---|---|---|
| Frontend | `http://localhost:3000` | `npm run dev` in `/frontend` |
| Backend API | `http://localhost:5000` | Docker (WSL) |
| PostgreSQL | `localhost:5432` | Docker (WSL) |
| MT5 Bridge | `http://localhost:5003` | Python on Windows |

---

## ☁️ Railway Backend Setup (One-Time)

If Railway is not yet set up, follow these steps **once**:

### 1. Create Railway Project
```bash
# Install Railway CLI if you don't have it:
npm install -g @railway/cli

# Login:
railway login

# Link your project:
cd d:\Forex\dashboardkiller
railway init
```

### 2. Add PostgreSQL Database
In the Railway dashboard:
- Click **+ New** → **Database** → **PostgreSQL**
- Railway auto-injects `DATABASE_URL` into your backend service

### 3. Set Environment Variables
In Railway → Backend service → **Variables** tab, add:

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://dashboard-nine-flax-74.vercel.app
LOCAL_MT5_URL=https://YOUR-NGROK-URL.ngrok-free.app
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

> `DATABASE_URL` is auto-filled by Railway when you link the Postgres add-on.

### 4. Deploy
```bash
# From the project root (deploys backend subfolder):
railway up
```

Or connect your GitHub repo and Railway deploys on every `git push`.

---

## ☁️ Vercel Frontend Setup (One-Time)

```bash
cd d:\Forex\dashboardkiller\frontend
npx vercel --prod
```

### Environment Variables on Vercel Dashboard:

| Variable | Value |
|---|---|
| `NEXTAUTH_URL` | `https://dashboard-nine-flax-74.vercel.app` |
| `NEXTAUTH_SECRET` | *(your secret from `.env.production`)* |
| `NEXT_PUBLIC_BACKEND_URL` | `https://dashboard-production-f374.up.railway.app` |
| `NEXT_PUBLIC_BRIDGE_URL` | `http://localhost:5003` *(frontend never calls this in prod)* |
| `GOOGLE_CLIENT_ID` | *(from Google Cloud Console)* |
| `GOOGLE_CLIENT_SECRET` | *(from Google Cloud Console)* |

---

## 🔒 Security: Admin vs Friend Access

| Feature | You (admin) | Your Friend |
|---|---|---|
| Login | `rousrendo@gmail.com` | Any Google account |
| Broker | Live Oanda / MT5 | Paper trading only |
| Real positions | ✅ Visible | ❌ Empty / Mock |
| API keys | ✅ Visible (masked) | ❌ All blank |
| Save settings | ✅ Writes to file | ❌ Silent no-op |
| WebSocket prices | Live Oanda ticks | Mock random walk |
| Can place orders | Live orders | Paper orders only |

---

## 🔁 Auto-Start on Boot (Optional)

1. Press `Win + R` → type `shell:startup` → press Enter
2. Create a shortcut to `start_production.bat` in that folder
3. Every time Windows boots, production mode starts automatically

---

## ✅ Is Everything Ready? (Checklist)

Before you share the link with your friend, verify:

| Check | How to Test | Expected |
|---|---|---|
| 1. Auth Gate | Open Vercel URL in Incognito → go to `/dashboard` | Redirected to `/login` |
| 2. Friend Mock Mode | Sign in with a non-admin Google account | Shows mock data, $100k paper account |
| 3. Admin Live Mode | Sign in as `rousrendo@gmail.com` | Shows real Oanda positions |
| 4. HTTPS Encryption | Check browser address bar on Vercel URL | 🔒 padlock, `https://` |
| 5. DB Persistence | Restart Railway backend | Past journals still show |
| 6. MT5 Orders | Test a BUY on terminal as admin | Executes in MetaTrader 5 |

**If all 6 pass — you are production-ready. Stop changing code.**
