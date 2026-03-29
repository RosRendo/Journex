# TradeKiller Pro - Architecture & System Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          TRADING SYSTEM OVERVIEW                       │
└─────────────────────────────────────────────────────────────────────────┘

╔════════════════════════════════════════════════════════════════════════════╗
║                         EXTERNAL DATA SOURCES                              ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║   ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────┐   ║
║   │ MetaTrader 5     │  │  Economic        │  │ News APIs            │   ║
║   │ Terminal         │  │  Calendar API    │  │ (Market News)        │   ║
║   └────────┬─────────┘  └────────┬─────────┘  └────────┬────────────┘   ║
║            │                     │                     │                 ║
║            └─────────────────────┼─────────────────────┘                 ║
║                                  │                                       ║
║                      (Live quotes, orders                                ║
║                       News feeds, Events)                                ║
║                                  │                                       ║
╚══════════════════════════════════╪════════════════════════════════════════╝
                                   │
                                   ▼
╔════════════════════════════════════════════════════════════════════════════╗
║                    PYTHON BOT SERVICE LAYER                                ║
║                   (mt5_bridge.py / FastAPI)                               ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  MT5 Connection Handler                                            │ ║
║  │  • Establishes live connection to MT5 terminal                     │ ║
║  │  • Polls account balance, equity, positions                        │ ║
║  │  • Streams real-time P&L updates                                   │ ║
║  │  • Receives and processes order signals                            │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                            ║
║  ┌─────────────────────────────────────────────────────────────────────┐ ║
║  │  News Feed Aggregator                                              │ ║
║  │  • Fetches economic calendar events                                │ ║
║  │  • Parses market news feeds                                        │ ║
║  │  • AI sentiment analysis classification                            │ ║
║  └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                            ║
║  WebSocket Server                                                        ║
║  • Broadcasts live updates to connected clients                       ║
║  • Event streaming (balance, positions, news)                         ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
                               ▲                   ▼
                    (WebSocket) │          (REST, WebSocket)
                               │                   │
        ┌──────────────────────┴───────────────────┴──────────────────────┐
        │                                                                  │
        ▼                                                                  ▼
╔═══════════════════════════════════════════╗    ╔══════════════════════════════╗
║     EXPRESS.JS BACKEND API SERVER         │    │  NEXT.JS FRONTEND SERVER     │
║  (Node.js + TypeScript + Prisma ORM)      │    │  (React + TypeScript)        │
╠═══════════════════════════════════════════╣    ╠══════════════════════════════╣
║                                           │    │                              │
║  ┌────────────────────────────────────┐  │    │  ┌────────────────────────┐  │
║  │ ROUTE HANDLERS                     │  │    │  │ PAGE COMPONENTS        │  │
║  │ • /trades (CRUD)                   │  │    │  │ • /dashboard           │  │
║  │ • /accounts (create/list/update)   │  │    │  │ • /journal             │  │
║  │ • /csv/upload (multi-broker)       │  │    │  │ • /analytics           │  │
║  │ • /calendar/data (heatmap)         │  │    │  │ • /community           │  │
║  │ • /community (posts/comments)      │  │    │  │ • /backtesting         │  │
║  │ • /upload/image (media handling)   │  │    │  │ • /bot                 │  │
║  └────────────────────────────────────┘  │    │  └────────────────────────┘  │
║                                           │    │                              │
║  ┌────────────────────────────────────┐  │    │  ┌────────────────────────┐  │
║  │ CONTROLLERS                        │  │    │  │ COMPONENTS             │  │
║  │ • tradeController                  │  │    │  │ • CsvUploadComponent   │  │
║  │ • accountController                │  │    │  │ • JournalCalendar      │  │
║  │ • csvController (parser)           │  │    │  │ • LotCalculator        │  │
║  │ • communityController              │  │    │  │ • AITradingAssistant   │  │
║  │ • calendarController               │  │    │  │ • Navbar               │  │
║  │ • uploadController                 │  │    │  │ • Sidebar              │  │
║  └────────────────────────────────────┘  │    │  └────────────────────────┘  │
║                                           │    │                              │
║  ┌────────────────────────────────────┐  │    │  ┌────────────────────────┐  │
║  │ MIDDLEWARE                         │  │    │  │ CUSTOM HOOKS           │  │
║  │ • Error handling                   │  │    │  │ • useApi               │  │
║  │ • CORS management                  │  │    │  │ • useTrades            │  │
║  │ • File upload (Multer)             │  │    │  │ • useCsvUpload         │  │
║  │ • Security (Helmet)                │  │    │  │ • useWebSocket         │  │
║  └────────────────────────────────────┘  │    │  │ • useAutoMT5Connect    │  │
║                                           │    │  └────────────────────────┘  │
║  ┌────────────────────────────────────┐  │    │                              │
║  │ SERVICE LAYER                      │  │    │  ┌────────────────────────┐  │
║  │ • CSV parsing (multi-broker)       │  │    │  │ UTILITIES              │  │
║  │ • Metrics calculation              │  │    │  │ • calculations         │  │
║  │ • Data validation                  │  │    │  │ • chartSetup           │  │
║  │ • Trade logic                      │  │    │  │ • technicalIndicators  │  │
║  └────────────────────────────────────┘  │    │  └────────────────────────┘  │
║                                           │    │                              │
╚═══════════════════╤══════════════════════╝    ╚════════════════╤═════════════╝
                    │                                             │
                    │          (JSON/REST)          (HTTP Requests)
                    │                                             │
                    └──────────────────────────┬───────────────────┘
                                              │
                                              ▼
                    ╔═════════════════════════════════════════════╗
                    │     POSTGRESQL DATABASE                    │
                    ║ (Prisma ORM - Data Persistence)            ║
                    ╠═════════════════════════════════════════════╣
                    │                                             │
                    │  Tables:                                   │
                    │  • trades (journal entries)                │
                    │  • accounts (broker connections)           │
                    │  • csv_imports (import history)            │
                    │  • profit_loss (P&L tracking)              │
                    │  • user_profiles (community)               │
                    │  • posts (social feed)                     │
                    │  • comments (discussions)                  │
                    │  • communities (trading groups)            │
                    │  • post_likes (engagement)                 │
                    │                                             │
                    ╚═════════════════════════════════════════════╝
```

---

## Data Flow Diagrams

### 1. CSV IMPORT FLOW

```
User Action: Upload CSV
        │
        ▼
┌─────────────────────────────┐
│ Frontend CSV Upload Modal   │
│ (CsvUploadComponent)        │
└────────────┬────────────────┘
             │ (POST /csv/upload)
             ▼
┌─────────────────────────────┐
│ Backend File Handler        │
│ (Multer middleware)         │
└────────────┬────────────────┘
             │ (Save temp file)
             ▼
┌─────────────────────────────┐
│ CSV Parser                  │
│ (csvController)             │
│ • Detect broker format      │
│ • Create ParsedTrade[]      │
└────────────┬────────────────┘
             │ (mapBrokerDataToTrade)
             ▼
┌─────────────────────────────┐
│ Format-Specific Parsers:    │
│ • parseMT5Format()          │
│ • parseMT4Format()          │
│ • parseCTraderFormat()      │
│ • parsePepperstoneFormat()  │
└────────────┬────────────────┘
             │ (Validated trades)
             ▼
┌─────────────────────────────┐
│ Database Insert             │
│ (Prisma bulk create)        │
│ • Insert trades             │
│ • Create CsvImport record   │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ Calculate Metrics           │
│ • Total Profit              │
│ • Win Rate                  │
│ • Profit Factor             │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ Return Success Response     │
│ to Frontend                 │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│ Display Success Message     │
│ + Import Summary            │
│ (CsvUploadComponent)        │
└─────────────────────────────┘
```

### 2. LIVE MT5 BRIDGE FLOW

```
MT5 Terminal Running
        │
        ▼
┌──────────────────────────┐
│ Python Bot (mt5_bridge)  │
│ • Connect to MT5 via SDK │
│ • Authenticate with creds│
└────────┬─────────────────┘
         │
         ├─ Poll Loop (every 500ms)
         │
         ▼
    ┌─────────────────────────────┐
    │ Fetch Live Data:            │
    │ • Account balance           │
    │ • Account equity            │
    │ • Open positions            │
    │ • Account profit/loss       │
    └────────┬────────────────────┘
             │
             ▼
    ┌─────────────────────────────┐
    │ WebSocket Broadcast         │
    │ (Send to connected clients) │
    └────────┬────────────────────┘
             │
             ▼
    ┌─────────────────────────────┐
    │ Frontend WebSocket Hook     │
    │ (useWebSocket.ts)           │
    │ • Receive update event      │
    │ • Update React state        │
    └────────┬────────────────────┘
             │
             ▼
    ┌─────────────────────────────┐
    │ Dashboard Re-render         │
    │ • Update balance display    │
    │ • Update equity curve       │
    │ • Update open positions     │
    │ • Update live P&L           │
    └─────────────────────────────┘
```

### 3. TRADE JOURNALING FLOW

```
User Action: Create Trade Entry
        │
        ▼
┌──────────────────────────┐
│ Journal Form Component   │
│ (Manual trade entry)     │
└────────┬─────────────────┘
         │ (Input all fields)
         ▼
┌──────────────────────────┐
│ Form Validation          │
│ • Check required fields  │
│ • Verify data types      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Image Upload (optional)  │
│ (POST /upload/image)     │
└────────┬─────────────────┘
         │ (Returns imageUrl)
         ▼
┌──────────────────────────┐
│ POST /trades             │
│ (Send trade data)        │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Backend Trade Creation   │
│ (createTrade controller) │
│ • Save to database       │
│ • Generate ID            │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Return Trade Object      │
│ with ID & timestamp      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Update Frontend State    │
│ • Add to trades array    │
│ • Update calendar view   │
│ • Refresh analytics      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Display Success Message  │
│ Trade saved!             │
└──────────────────────────┘

Later: View in Calendar/Analytics
        │
        ▼
┌──────────────────────────┐
│ GET /calendar/data       │
│ ?year=2024&month=12      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Query trades by date     │
│ Group by day             │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Calculate metrics:       │
│ • Trade count per day    │
│ • P&L per day            │
│ • Wins/losses per day    │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Render Calendar Heatmap  │
│ (JournalCalendar)        │
└──────────────────────────┘
```

### 4. COMMUNITY SHARING FLOW

```
User Action: Share Trade with Community
        │
        ▼
┌───────────────────────────┐
│ Community Post Form       │
│ (Create a post component) │
└────────┬──────────────────┘
         │ (Fill trade details)
         │ (Add analysis/notes)
         │ (Attach screenshot)
         ▼
┌───────────────────────────┐
│ POST /community/posts     │
│ (Create post with author) │
└────────┬──────────────────┘
         │
         ▼
┌───────────────────────────┐
│ Database Create:          │
│ • Post record             │
│ • Link to author          │
│ • Link to community (opt) │
└────────┬──────────────────┘
         │
         ▼
┌───────────────────────────┐
│ Return Post Object        │
│ with ID & timestamp       │
└────────┬──────────────────┘
         │
         ▼
┌───────────────────────────┐
│ Broadcast to Community    │
│ Feed (WebSocket)          │
└────────┬──────────────────┘
         │
         ▼
┌───────────────────────────┐
│ Appear in:                │
│ • Global feed             │
│ • Community group feed    │
│ • Author's profile        │
└────────┬──────────────────┘
         │
         ▼
┌───────────────────────────┐
│ Community Interactions:   │
│ • Like posts              │
│ • Comment on posts        │
│ • Follow authors          │
│ • Join communities        │
└───────────────────────────┘
```

---

## Component Interaction Map

```
                        ┌─────────────────┐
                        │    Navbar       │
                        │  (Auth, Menu)   │
                        └────────┬────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 │               │               │
                 ▼               ▼               ▼
        ┌──────────────┐  ┌─────────────┐  ┌──────────────┐
        │   Sidebar    │  │  Dashboard  │  │    Main      │
        │ (Navigation) │  │   Widgets   │  │   Content    │
        └──────────────┘  └─────────────┘  └──────┬───────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    │                              │                              │
                    ▼                              ▼                              ▼
        ┌────────────────────┐        ┌──────────────────────┐      ┌───────────────────┐
        │ Journal Module     │        │ Analytics Module     │      │ Community Module  │
        │ • CreateTrade      │        │ • Calendar           │      │ • CreatePost      │
        │ • TradesList       │        │ • Charts             │      │ • PostFeed        │
        │ • TradeDetail      │        │ • Statistics         │      │ • UserProfile     │
        │ • EditTrade        │        │ • MetricsCards       │      │ • CommentList     │
        │ • DeleteTrade      │        │ • PerformanceTable   │      │ • CommunityList   │
        └────────────────────┘        └──────────────────────┘      └───────────────────┘
                    │                              │                              │
        ┌───────────┴───────┐        ┌─────────────┴──────┐       ┌──────────────┴──────┐
        │                   │        │                    │       │                     │
        ▼                   ▼        ▼                    ▼       ▼                     ▼
   ┌─────────┐         ┌───────┐  ┌───────┐        ┌──────┐  ┌────────┐        ┌─────────┐
   │ Form    │         │ CSV   │  │useApi │        │Chart │  │useApi  │        │useApi   │
   │Handler  │         │Upload │  │ Hook  │        │Lib   │  │ Hook   │        │Hook     │
   └────┬────┘         └───┬───┘  └───┬───┘        └──┬───┘  └───┬────┘        └────┬────┘
        │                  │          │               │          │                   │
        │  ┌───────────────┴──────────┴───────────────┴──────────┴───────────────────┤
        │  │                                                                         │
        ▼  ▼                                                                         ▼
   ┌────────────────────────────────────────────────────────────────────────────────────┐
   │                     API Client (axios-based)                                       │
   │                                                                                    │
   │  • getTrades()                • uploadCsv()       • createPost()                  │
   │  • createTrade()              • getCsvImports()   • likePost()                    │
   │  • updateTrade()              • getAccounts()     • createComment()               │
   │  • deleteTrade()              • createAccount()   • getProfile()                  │
   │  • getCalendarData()                              • updateProfile()               │
   └────────────┬───────────────────────────────────────────────────────────────────────┘
                │
    ┌───────────┴───────────┐
    │                       │
    ▼                       ▼
GET/POST/PUT/DELETE    WebSocket
Express Routes         Connection
(REST API)             (Real-time)
    │                       │
    └───────────┬───────────┘
                │
                ▼
        ┌──────────────┐
        │  PostgreSQL  │
        │  Database    │
        │  (Prisma ORM)│
        └──────────────┘
```

---

## API Request/Response Pattern

### Example: Create Trade Entry

**REQUEST**

```
POST /trades
Content-Type: application/json

{
  "date": "2024-03-20",
  "pair": "EURUSD",
  "strategy": "Support Breakout",
  "setupType": "Flag Pattern",
  "entry": 1.0850,
  "sl": 1.0820,
  "tp": 1.0920,
  "rr": "1:3",
  "outcome": "Win",
  "direction": "Long",
  "profit": 210,
  "lotSize": 1.0,
  "notes": "Strong support bounce, broke resistance",
  "imageUrl": "https://cdn.example.com/uploads/trade123.jpg"
}
```

**RESPONSE (201 Created)**

```json
{
  "success": true,
  "data": {
    "id": 42,
    "date": "2024-03-20",
    "pair": "EURUSD",
    "strategy": "Support Breakout",
    "setupType": "Flag Pattern",
    "entry": 1.085,
    "sl": 1.082,
    "tp": 1.092,
    "rr": "1:3",
    "outcome": "Win",
    "direction": "Long",
    "profit": 210,
    "lotSize": 1.0,
    "notes": "Strong support bounce, broke resistance",
    "imageUrl": "https://cdn.example.com/uploads/trade123.jpg",
    "createdAt": "2024-03-20T14:30:00Z",
    "updatedAt": "2024-03-20T14:30:00Z"
  }
}
```

---

## Real-time WebSocket Events

```
CLIENT CONNECTS TO WebSocket
        │
        ▼
┌──────────────────────────┐
│ Connection Established   │
│ (auth token validation)  │
└────────┬─────────────────┘
         │
         ▼
Listen for Events:
│
├─ "MT5_BALANCE_UPDATE"
│  {balance: 10500.50, equity: 10620.00}
│
├─ "MT5_POSITION_OPENED"
│  {ticket: "123", pair: "EURUSD", size: 1.0, price: 1.0850}
│
├─ "MT5_POSITION_CLOSED"
│  {ticket: "123", profit: 210.00}
│
├─ "ALERT_TRIGGERED"
│  {type: "SL_HIT", trade_id: 42, message: "Stop loss hit"}
│
├─ "NEWS_ALERT"
│  {title: "Fed Decision", sentiment: "bullish"}
│
└─ "COMMUNITY_POST_CREATED"
   {post_id: "uuid", author: "trader123", pair: "GBPUSD"}
```

---

## Security Architecture

```
┌──────────────────────────────────────────────────────┐
│ SECURITY LAYERS                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Layer 1: HTTPS/TLS                                  │
│ • All data encrypted in transit                     │
│ • SSL certificate validation                        │
│                                                      │
│ Layer 2: Authentication (JWT)                       │
│ • Token generation on login                         │
│ • Token validation on each request                  │
│ • Refresh token rotation                            │
│                                                      │
│ Layer 3: Authorization                              │
│ • User data scoped isolation                        │
│ • Role-based access control                         │
│ • Permission checks on API endpoints                │
│                                                      │
│ Layer 4: Input Validation                           │
│ • Request schema validation (Prisma types)          │
│ • CSV format validation                             │
│ • File upload type checking                         │
│                                                      │
│ Layer 5: Secure Headers (Helmet)                    │
│ • X-Frame-Options: DENY                             │
│ • X-Content-Type-Options: nosniff                   │
│ • Strict-Transport-Security                         │
│ • Content-Security-Policy                           │
│                                                      │
│ Layer 6: Database Security                          │
│ • Parameterized queries (Prisma ORM)                │
│ • Encrypted credentials storage                     │
│ • Row-level security (RLS) ready                    │
│                                                      │
│ Layer 7: File Upload Security                       │
│ • Filename sanitization                             │
│ • File type whitelist (png, jpg, gif, webp)        │
│ • File size limits (Multer)                         │
│ • Virus scan ready                                  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Scalability & Performance Optimization

```
┌────────────────────────────────────────────────────────┐
│ PERFORMANCE OPTIMIZATION STRATEGIES                    │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Database:                                              │
│ • Indexed columns: date, pair, strategy, outcome      │
│ • Connection pooling via Prisma                       │
│ • Query optimization (select fields)                  │
│ • Pagination for large result sets                    │
│                                                        │
│ API Response:                                          │
│ • Gzip compression (compression middleware)           │
│ • JSON serialization optimization                     │
│ • Field selection in queries                          │
│                                                        │
│ Frontend:                                              │
│ • Next.js SSR/SSG where applicable                    │
│ • Code splitting per page                             │
│ • Image optimization                                  │
│ • Lazy loading of components                          │
│                                                        │
│ Real-time:                                             │
│ • WebSocket pooling                                   │
│ • Batch event updates                                 │
│ • Efficient broadcast patterns                        │
│                                                        │
│ Caching (Ready to implement):                          │
│ • Redis for session management                        │
│ • CDN for static assets                               │
│ • Browser cache headers                               │
│                                                        │
│ Horizontal Scaling:                                    │
│ • Stateless API design                                │
│ • Load balancer ready                                 │
│ • Multi-instance deployment                           │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│         PRODUCTION DEPLOYMENT TOPOLOGY              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Load Balancer (Nginx/HAProxy)                     │
│       │                                             │
│  ┌────┴────┬────────┬──────────┐                  │
│  │          │        │          │                   │
│  ▼          ▼        ▼          ▼                   │
│ ┌────────────────────────────────────────┐         │
│ │  Backend Instances (Node.js)           │         │
│ │  ┌──────────┐  ┌──────────┐            │         │
│ │  │Instance 1│  │Instance N│            │         │
│ │  └──────────┘  └──────────┘            │         │
│ │ (Auto-scales with demand)              │         │
│ └────────────────────────────────────────┘         │
│            │                                       │
│            ▼                                       │
│  ┌──────────────────────────────────┐             │
│  │ PostgreSQL Database (Managed)    │             │
│  │ • Replicated                      │             │
│  │ • Daily backups                   │             │
│  │ • Connection pooling              │             │
│  └──────────────────────────────────┘             │
│                                                     │
│  ┌──────────────────────────────────┐             │
│  │ Frontend CDN (Vercel/Cloudflare) │             │
│  │ • Next.js auto-deployment        │             │
│  │ • Global edge caching            │             │
│  │ • Image optimization             │             │
│  └──────────────────────────────────┘             │
│                                                     │
│  ┌──────────────────────────────────┐             │
│  │ File Storage (S3 or alternative) │             │
│  │ • Trade screenshots              │             │
│  │ • Profile avatars                │             │
│  │ • CSV uploads (temp storage)     │             │
│  └──────────────────────────────────┘             │
│                                                     │
│  ┌──────────────────────────────────┐             │
│  │ Python Bot (Dedicated VPS)       │             │
│  │ • MT5 connection                 │             │
│  │ • News aggregation               │             │
│  │ • Event streaming                │             │
│  └──────────────────────────────────┘             │
│                                                     │
│  ┌──────────────────────────────────┐             │
│  │ Monitoring & Logging             │             │
│  │ • ELK Stack or CloudWatch        │             │
│  │ • Error tracking (Sentry)        │             │
│  │ • Performance monitoring         │             │
│  └──────────────────────────────────┘             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Summary

This architecture provides:
✅ **Scalability** - Horizontal scaling ready
✅ **Reliability** - Error handling, backups, monitoring
✅ **Security** - Multi-layer security approach
✅ **Performance** - Optimized queries, caching ready
✅ **Real-time** - WebSocket for live updates
✅ **Separation of Concerns** - Clean layered architecture
✅ **Type Safety** - Full TypeScript across stack
✅ **Developer Experience** - Clear patterns and conventions
