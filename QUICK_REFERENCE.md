# TradeKiller Pro - Quick Feature Reference Guide

## 🎯 ALL FEATURES AT A GLANCE

### TRADING JOURNAL MANAGEMENT

✅ Create/Edit/Delete trade entries
✅ Log entry price, stop loss, take profit, risk-reward ratio
✅ Track outcomes (Win/Loss/Breakeven)
✅ Add trade notes and screenshot evidence
✅ Categorize by strategy and currency pair
✅ Search and filter trades by multiple criteria

### BROKER INTEGRATION & CSV IMPORT

✅ Multi-broker CSV support:

- MetaTrader 5 (MT5)
- MetaTrader 4 (MT4)
- cTrader
- IC Markets
- Pepperstone
- Generic format auto-detection

✅ Bulk import trades from broker exports
✅ Auto-detection of broker format
✅ Automatic metrics calculation:

- Total Profit/Loss
- Win Rate %
- Profit Factor
- Success/Failure counts

### LIVE MT5 BRIDGE

✅ Real-time MetaTrader 5 connection
✅ Live balance & equity monitoring
✅ Open positions display
✅ Live P&L tracking
✅ Zero-latency data feeds
✅ Position monitoring from terminal

### ACCOUNT MANAGEMENT

✅ Add multiple trading accounts per broker
✅ Store broker credentials (API key/secret)
✅ Track account balance & equity
✅ Manage account information
✅ Portfolio overview across multiple brokers

### COMMUNITY & SOCIAL FEATURES

✅ User profiles with avatar/bio
✅ Share trade setups with community
✅ Post trade screenshots and analysis
✅ Comments and discussions
✅ Like/engagement tracking
✅ Create and join trading communities
✅ View community member profiles
✅ Filter by trading style/strategy
✅ Trading style classification (Day/Swing/Position/Scalp)

### TRADING ANALYTICS & INSIGHTS

✅ Win rate calculation
✅ Average win/loss analysis
✅ Profit factor computation
✅ Risk/reward ratio tracking
✅ Strategy performance metrics
✅ Performance by currency pair
✅ Performance by date range
✅ Trading frequency analysis

### CALENDAR & HEATMAP VIEW

✅ Monthly trading calendar
✅ Daily trade count display
✅ Daily profit/loss per day
✅ Wins/losses per day visualization
✅ Trading frequency heatmap
✅ Identify best trading days

### BACKTESTING ENGINE (FXReplay)

✅ Tick-by-tick historical replay
✅ Strategy testing on past data
✅ Speed adjustment (1x to 100x)
✅ Pause and resume at any point
✅ Simulated P&L results
✅ Equity curve projection
✅ Historical data analysis

### RISK MANAGEMENT TOOLS

✅ Lot calculator

- Input: Account size, Risk %, SL distance
- Output: Recommended lot size
  ✅ Risk metrics visualization
  ✅ Daily risk limits tracking
  ✅ Risk per trade monitoring
  ✅ Account risk heatmap

### ALERTS & NOTIFICATIONS

✅ Real-time position alerts
✅ Stop loss hit notifications
✅ Take profit reached alerts
✅ Account balance change alerts
✅ Alert history log
✅ In-app notification center

### MARKET SENTIMENT & NEWS

✅ Live economic calendar
✅ Macroeconomic news feed
✅ AI sentiment analysis (Bullish/Bearish)
✅ Real-time market sentiment
✅ Pair-wise sentiment display
✅ Sentiment trend charts

### TECHNICAL INDICATORS

✅ Moving Averages (SMA, EMA, WMA)
✅ RSI (Relative Strength Index)
✅ MACD (Moving Average Convergence Divergence)
✅ Bollinger Bands
✅ ATR (Average True Range)
✅ Stochastic Oscillator

### MEDIA & FILE UPLOAD

✅ Trade screenshot uploads
✅ Chart image uploads
✅ Profile avatar uploads
✅ Community post images
✅ Supported formats: PNG, JPG, JPEG, GIF, WEBP

### AUTHENTICATION & MULTI-ACCOUNT

✅ Email/password registration
✅ Login with email/password
✅ JWT-based session management
✅ 7-day free trial on signup
✅ Subscription tier gating
✅ Multi-account support per user
✅ User profile management

### DASHBOARD WIDGETS

✅ Active alerts dashboard
✅ Key performance metrics widget
✅ MT5 connection status
✅ Recent backtest results
✅ Trading calendar mini-view
✅ Quick journal entry form
✅ Live community feed
✅ Open positions display
✅ Economic news ticker
✅ Market sentiment gauge
✅ Risk calculator widget

---

## 🔌 TECHNICAL CAPABILITIES

### Backend (Node.js + TypeScript)

- Express.js REST API
- PostgreSQL database via Prisma ORM
- Multer file upload handling
- CSV parsing and validation
- Real-time data routing
- Error handling middleware
- CORS and security (Helmet)

### Frontend (Next.js + React)

- Server-side rendering (SSR)
- Dynamic routing
- React hooks for state management
- Custom API client with axios
- WebSocket real-time connections
- Responsive Tailwind CSS UI
- TypeScript type safety

### Python Bot Service

- FastAPI web server
- MetaTrader 5 connection handler
- Async/await for concurrent operations
- News feed aggregation
- Economic calendar parsing

### Database Models

- **Trades**: Core trading journal entries
- **Accounts**: Multi-broker account management
- **CSV Imports**: Import history and metadata
- **Profit/Loss**: P&L tracking per trade
- **User Profiles**: Community user data
- **Posts**: Social feed posts
- **Comments**: Post commentary
- **Communities**: Trading groups

---

## 📊 TRADING METRICS CALCULATED

| Metric            | Description                   |
| ----------------- | ----------------------------- |
| Win Rate          | (Wins / Total Trades) × 100%  |
| Profit Factor     | Gross Profit / Gross Loss     |
| Average Win       | Total Profit / Number of Wins |
| Average Loss      | Total Loss / Number of Losses |
| Risk:Reward Ratio | Average Loss / Average Win    |
| Drawdown          | Peak-to-trough decline        |
| Daily Performance | P&L per day                   |
| Strategy Win Rate | Wins per strategy             |
| Pair Performance  | Win rate per currency pair    |
| Monthly Return    | Cumulative return per month   |

---

## 🎮 USER SUBSCRIPTION TIERS

### FREE (7-Day Trial)

- Trading journal (basic)
- 1 CSV import
- MT5 live bridge
- Basic analytics
- Community features
- Lot calculator

### PRO

- Unlimited CSV imports
- Advanced analytics
- Backtesting engine (5 runs/day)
- AI sentiment (30-day history)
- Priority support
- Trade sharing

### INSTITUTIONAL

- Everything in Pro, plus:
- 50 backtests/day
- Full API access
- Unlimited history
- White-label option (coming soon)
- Dedicated support

---

## 🔐 API ENDPOINTS QUICK REFERENCE

### TRADES

```
POST /trades                      - Create trade
GET /trades                       - List trades (with filters)
GET /trades/:id                   - Get single trade
PUT /trades/:id                   - Update trade
DELETE /trades/:id                - Delete trade
```

### CSV/BROKER

```
POST /csv/upload                  - Upload broker CSV
GET /csv/imports                  - List import history
GET /csv/imports/:id              - Get import details
GET /csv/imports/:id/trades       - Get trades from import
```

### ACCOUNTS

```
POST /accounts                    - Create account
GET /accounts                     - List accounts
PUT /accounts/:id                 - Update account
```

### COMMUNITY

```
GET /community/profile            - Get user profile
POST /community/profile           - Update profile
POST /community/posts             - Create post
GET /community/posts              - Get feed
PUT /community/posts/:id          - Update post
DELETE /community/posts/:id       - Delete post
POST /community/posts/:id/likes   - Like post
POST /community/posts/:id/comments - Comment
GET /community/groups             - List communities
POST /community/groups            - Create community
POST /community/groups/:id/join   - Join community
POST /community/groups/:id/leave  - Leave community
GET /community/groups/:id/members - Get members
```

### CALENDAR & ANALYTICS

```
GET /calendar/data ?year=2024&month=12  - Get calendar data
```

### MEDIA

```
POST /upload/image                - Upload image
```

---

## 🎨 FRONTEND APP STRUCTURE

```
Dashboard
├── Trading Journal
│   ├── Create Entry
│   ├── View All
│   ├── Edit/Delete
│   └── Filter by Strategy/Outcome/Pair
├── Imports
│   ├── Upload CSV
│   ├── Select Broker
│   ├── Review Summary
│   └── View Import History
├── Analytics
│   ├── Win Rate
│   ├── Profit Factor
│   ├── Strategy Performance
│   ├── Pair Analysis
│   └── Monthly Charts
├── Calendar
│   ├── Monthly Heatmap
│   ├── Daily Trade Count
│   └── P&L Visualization
├── Live MT5
│   ├── Connection Status
│   ├── Account Balance
│   ├── Open Positions
│   └── Real-time P&L
├── Backtesting
│   ├── Strategy Selection
│   ├── Date Range
│   ├── Run Backtest
│   └── View Results
├── Risk Tools
│   ├── Lot Calculator
│   ├── Risk Tracker
│   └── Daily Limits
├── Community
│   ├── User Profile
│   ├── Create Post
│   ├── View Feed
│   ├── Comments
│   └── Communities/Groups
├── News & Sentiment
│   ├── Economic Calendar
│   ├── Market News
│   └── Sentiment Gauge
└── Alerts
    ├── Active Alerts
    ├── History
    └── Settings
```

---

## 🚀 HOW TO BUILD WITH SAME FEATURES

### Stack Required

```
Frontend:  Next.js 14+ | TypeScript | Tailwind CSS | React 18+
Backend:   Node.js 18+ | Express.js | TypeScript
Database:  PostgreSQL 14+ | Prisma ORM
Bot:       Python 3.10+ | FastAPI | MT5 SDK
DevOps:    Docker | Docker Compose
```

### Key Libraries

```
Frontend:
- axios (HTTP client)
- shadcn/ui (UI components)
- recharts (Analytics charts)
- socket.io-client (WebSocket real-time)
- next-auth (Authentication)

Backend:
- express (Web server)
- prisma (ORM)
- multer (File uploads)
- csv-parser (CSV parsing)
- helmet (Security)
- cors (CORS handling)

Python:
- fastapi (Web server)
- MetaTrader5 SDK
- feedparser (News parsing)
- aiohttp (Async HTTP)
```

### Development Phases

1. **Phase 1**: Trading journal CRUD + database schema
2. **Phase 2**: CSV import engine with broker support
3. **Phase 3**: MT5 bridge and real-time connection
4. **Phase 4**: Analytics and metrics calculations
5. **Phase 5**: Community/social features
6. **Phase 6**: Backtesting engine
7. **Phase 7**: Alerts and notifications
8. **Phase 8**: News feeds and sentiment analysis

---

## 📱 SUPPORTED PLATFORMS

- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Tablet (iPad, Android tablets)
- ✅ Mobile responsiveness (Phone-friendly UI)
- 🔄 Mobile apps (Coming soon)

---

**Last Updated**: 2024
**Version**: 1.0.0
**Status**: Production Ready
