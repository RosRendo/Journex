# 🚀 Journex — Complete Production & Local Startup Guide

---

## 🗺️ Architecture at a Glance

┌────────────────────────────────────────────────────────────────┐
│  ONE RAILWAY SERVICE (always on, accessible from anywhere)     │
│                                                                │
│   ┌──────────────────────────────────────────────┐             │
│   │  Journex Unified Server (frontend/server.js) │             │
│   │  Next.js pages  +  Express /api  +  WS prices│             │
│   │  + PostgreSQL Database (Railway add-on)      │             │
│   └──────────────────────────────────────────────┘             │
│        Auth gated (Google OAuth / credentials)                 │
│        Calls Ngrok to reach your local MT5 (admin only)        │
└────────────────────────────────────────────────────────────────┘
                              │
                              │ Ngrok tunnel (admin only)
                              ▼
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

**Your friend** visits `https://YOUR-APP.up.railway.app` →  
signs in with their Google account → gets **paper trading (mock)** only.  
Your live MT5 data stays private — only your admin email sees it.

---

## 🌐 PRODUCTION Mode (Daily Use — One Railway Service)

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
1. Go to [railway.app](https://railway.app) → Your Project → Service
2. Click **Variables** tab
3. Set `LOCAL_MT5_URL = https://abcd1234.ngrok-free.app`
4. Railway will redeploy automatically (~30 seconds)

> **Tip**: Buy a static Ngrok domain (free plan = 1 static domain) at
> [dashboard.ngrok.com/domains](https://dashboard.ngrok.com/domains).
> Then your URL never changes and you skip this step.

### That's it! Open your browser to:
```
https://YOUR-APP.up.railway.app/dashboard
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

## ☁️ Railway Setup (One-Time) — UNIFIED SINGLE-SERVICE DEPLOY

The whole app runs as ONE Railway service: Next.js pages + Express API + WebSocket
on one port via frontend/server.js. No Vercel, no separate backend URL, no CORS.

### 1. Create Railway Project

`ash
npm install -g @railway/cli
railway login
railway init
`

### 2. Add PostgreSQL Database

In the Railway dashboard:

- Click **+ New** → **Database** → **PostgreSQL**
- Railway auto-injects DATABASE_URL into your service

### 3. Set Environment Variables

In Railway → Service → **Variables** tab, add:

| Variable | Value | Notes |
|---|---|---|
| NODE_ENV | production | ⚠️ MANDATORY — non-prod treats every request as admin |
| PORT | 3000 | unified server port |
| API_SECRET_KEY | random 32+ chars | signs admin JWTs — never keep dev fallback |
| NEXTAUTH_SECRET | random 32+ chars | session signing — dev fallback fails in prod |
| NEXTAUTH_URL | https://YOUR-RAILWAY-DOMAIN.up.railway.app | from Railway after deploy |
| NEXT_PUBLIC_ADMIN_EMAIL | 
ousrendo@gmail.com | admin sees MT5 tools |
| LOCAL_MT5_URL | https://YOUR-NGROK-URL.ngrok-free.app | your laptop MT5 bridge |
| DATABASE_URL | ${{Postgres.DATABASE_URL}} | auto-filled by Railway add-on |
| GOOGLE_CLIENT_ID | from Google Cloud Console | OAuth sign-in |
| GOOGLE_CLIENT_SECRET | from Google Cloud Console | OAuth sign-in |

(Generate secrets: 
ode -e "console.log(require('crypto').randomBytes(24).toString('hex'))")

### 4. Deploy

`ash
# From the project root:
railway up
`

Or connect the GitHub repo (RosRendo/Journex) and Railway redeploys on every git push.

Local dev is unchanged: double-click start_local.bat (frontend, backend,
Postgres, and MT5 bridge still run as separate processes with hot-reload).

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
| 1. Auth Gate | Open app URL in Incognito → go to `/dashboard` | Redirected to `/auth` |
| 2. Friend Mock Mode | Sign in with a non-admin Google account | Shows mock data, $100k paper account |
| 3. Admin Live Mode | Sign in as `rousrendo@gmail.com` | Shows real Oanda positions |
| 4. HTTPS Encryption | Check browser address bar on Vercel URL | 🔒 padlock, `https://` |
| 5. DB Persistence | Restart Railway service | Past journals still show |
| 6. MT5 Orders | Test a BUY on terminal as admin | Executes in MetaTrader 5 |

**If all 6 pass — you are production-ready. Stop changing code.**
