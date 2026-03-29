# TradeKiller Pro - Product Requirements Document (PRD)

## Executive Summary

**TradeKiller Pro** is an institutional-grade forex trading dashboard that unites live MetaTrader 5 execution, real-time AI sentiment analysis, unlimited backtesting, and advanced journaling capabilities. The platform is built as a full-stack application with a Node.js/Express backend, Next.js frontend, and Python bot service for MT5 integration.

---

## 1. TECHNOLOGY STACK

### Backend

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (via Prisma ORM)
- **File Upload**: Multer
- **Security**: Helmet, CORS
- **Real-time**: HTTP Proxy for WebSocket routing

### Frontend

- **Framework**: Next.js (React) with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Context API, Custom Hooks
- **HTTP Client**: Axios-based custom API client
- **Real-time**: WebSocket hooks for live data

### Additional Services

- **Python Bot**: MT5 Bridge for live trading terminal connectivity
- **CSV Processing**: Multi-broker CSV import engine
- **Containerization**: Docker + Docker Compose

---

## 2. CORE FEATURES

### 2.1 TRADING JOURNAL SYSTEM

#### Create Trade Entry

- **Endpoint**: `POST /trades`
- **Fields**:
  - Date of trade
  - Currency pair (e.g., EURUSD)
  - Strategy name
  - Setup type
  - Entry price
  - Stop loss (SL)
  - Take profit (TP)
  - Risk/Reward ratio (RR)
  - Outcome (Win/Loss/Breakeven)
  - Trade notes/commentary
  - Trade screenshot/image upload
  - Direction (Long/Short/Buy/Sell)
  - Lot size
  - Profit/Loss amount

#### View All Trades

- **Endpoint**: `GET /trades`
- **Query Filters**:
  - Pagination (page, limit)
  - Strategy filter
  - Outcome filter (Win/Loss)
  - Pair filter (EURUSD, GBPUSD, etc.)
  - Date range (startDate, endDate)
  - Sort capabilities (by date, profit, strategy)
- **Returns**: Paginated trade list with metadata

#### View Single Trade

- **Endpoint**: `GET /trades/:id`
- **Returns**: Complete trade details

#### Update Trade Entry

- **Endpoint**: `PUT /trades/:id`
- **Capability**: Modify any trade field after creation
- **Use Case**: Correcting entries or adding notes

#### Delete Trade Entry

- **Endpoint**: `DELETE /trades/:id`
- **Capability**: Remove trades from journal

---

### 2.2 CSV IMPORT & MULTI-BROKER SUPPORT

#### Supported Broker Formats

1. **MetaTrader 5 (MT5)**
   - Standard MT5 export format
   - Fields: ticket, open time, close time, symbol, direction, volume, price, profit
2. **MetaTrader 4 (MT4)**
   - Legacy MT4 CSV export
3. **cTrader**
   - cTrader native format
4. **IC Markets**
   - IC Markets-specific CSV layout
5. **Pepperstone**
   - Pepperstone export format
6. **Generic Format**
   - Fallback parser for unknown formats

#### CSV Upload Features

- **Endpoint**: `POST /csv/upload`
- **File Handling**:
  - Multipart file upload via Multer
  - Automatic file validation
  - Error handling with detailed feedback
- **Processing**:
  1. Parse CSV file based on broker detection
  2. Validate each trade row
  3. Calculate trading metrics automatically
  4. Batch insert into database
  5. Generate import summary report

#### Import Metrics Calculation

- **Total Profit**: Sum of all trade profits
- **Win Rate**: (Wins / Total Trades) × 100%
- **Profit Factor**: Gross Profit / Gross Loss
- **Success Count**: Number of trades imported successfully
- **Failure Count**: Number of trades with parsing errors

#### View Import History

- **Endpoint**: `GET /csv/imports`
- **Returns**:
  - List of all CSV imports
  - Broker name, account number
  - Import timestamp
  - Success/failure statistics
  - Summary metrics

#### Retrieve Trades from Import

- **Endpoint**: `GET /csv/imports/:importId/trades`
- **Purpose**: View all trades from a specific import session
- **Use Case**: Audit trail for batch imports

---

### 2.3 ACCOUNT MANAGEMENT

#### Create Trading Account

- **Endpoint**: `POST /accounts`
- **Fields**:
  - Broker name (e.g., Fusion Markets, IC Markets)
  - Account number
  - API Key (optional for live feeds)
  - API Secret (optional for live feeds)
  - Current balance
  - Current equity

#### View All Accounts

- **Endpoint**: `GET /accounts`
- **Returns**: List of all connected trading accounts
- **Use Case**: Portfolio overview across multiple brokers

#### Update Account Information

- **Endpoint**: `PUT /accounts/:id`
- **Capability**:
  - Update balance/equity
  - Modify credentials
  - Track account changes

---

### 2.4 LIVE MT5 BRIDGE INTEGRATION

#### Real-time Terminal Connection

- **Python Service**: MT5 Bridge (`mt5_bridge.py`)
- **Capabilities**:
  - Zero-latency connection to MetaTrader 5 terminal
  - Live equity tracking
  - Balance monitoring
  - Open positions display
  - Real-time P&L calculations

#### Live Data Feed

- **WebSocket Connection**: Bidirectional updates
- **Data Points**:
  - Account balance
  - Equity value
  - Number of open positions
  - Running P&L
  - Connected pairs list

---

### 2.5 COMMUNITY & SOCIAL FEATURES

#### User Profile Management

- **Endpoint**: `GET/POST /community/profile`
- **Profile Information**:
  - User name
  - Bio/About section
  - Avatar/Profile picture
  - Trading style (Day Trader, Swing Trader, etc.)
  - Created post/activity history

#### Create & Share Trade Posts

- **Endpoint**: `POST /community/posts`
- **Post Content**:
  - Trade setup details
  - Currency pair
  - Direction (Long/Short)
  - Entry/TP/SL prices
  - Trade result/outcome
  - Post image/screenshot
  - Commentary/analysis

#### View Community Feed

- **Endpoint**: `GET /community/posts`
- **Filters**:
  - By pair
  - By trading style
  - By author
  - Sorting (recent, popular)

#### Comments & Discussion

- **Create Comment**: `POST /community/posts/:postId/comments`
- **View Comments**: `GET /community/posts/:postId/comments`
- **Features**:
  - Thread discussions
  - Comment timestamps
  - Author information

#### Like & Engagement

- **Endpoint**: `POST /community/posts/:postId/likes`
- **Tracking**: Like count, user engagement metrics

#### Community Groups

- **Create Community**: `POST /community/groups`
- **Join Community**: `POST /community/groups/:groupId/join`
- **Leave Community**: `POST /community/groups/:groupId/leave`
- **View Members**: `GET /community/groups/:groupId/members`
- **Purpose**: Trading strategy groups, skill level communities, pair-specific channels

#### Post Management

- **Update Post**: `PUT /community/posts/:postId`
- **Delete Post**: `DELETE /community/posts/:postId`

---

### 2.6 TRADING ANALYTICS & METRICS

#### Trading Statistics

- **Win Rate Calculation**: Total wins / Total trades
- **Average Win/Loss**: Mean profit/loss per trade
- **Profit Factor**: Gross wins / Gross losses
- **Risk/Reward Analysis**: RR per trade tracking

#### Calendar View

- **Endpoint**: `GET /calendar/data?year=2024&month=12`
- **Data Point Per Day**:
  - Number of trades executed
  - Net profit/loss for the day
  - Win count
  - Loss count
  - Trading frequency heatmap

#### Trade Performance Filtering

- **By Strategy**: Performance per strategy
- **By Pair**: Win rate per currency pair
- **By Date Range**: Monthly/weekly analysis
- **By Outcome**: Win vs. Loss breakdown

---

### 2.7 UPLOAD & MEDIA HANDLING

#### Image Upload

- **Endpoint**: `POST /upload/image`
- **Purpose**:
  - Trade screenshots
  - Chart analysis images
  - Profile avatars
  - Community post images

#### File Storage

- **Location**: `/uploads` directory
- **Supported Formats**: PNG, JPG, JPEG, GIF, WEBP
- **Return**: File URL for reference in database

---

### 2.8 BACKTESTING ENGINE (FXReplay)

#### Tick-by-Tick Playback

- **Capability**: Replay historical market data
- **Features**:
  - Speed adjustment (1x to 100x)
  - Pause/resume at any point
  - Candle-by-candle analysis

#### Strategy Testing

- **Purpose**: Test trading strategies on historical data
- **Output**:
  - Simulated P&L
  - Win/loss results
  - Equity curve projection

---

### 2.9 ALERT & MONITORING SYSTEM

#### Real-time Notifications

- **Trigger Points**:
  - Position open/close
  - Stop loss hit
  - Take profit reached
  - Account balance changes

#### Alert Delivery

- **In-app notifications**
- **Event logging**
- **Historical alert feed**

---

### 2.10 RISK MANAGEMENT TOOLS

#### Lot Calculator

- **Inputs**:
  - Account size
  - Risk percentage
  - Pair volatility
  - Stop loss distance
- **Output**: Recommended lot size

#### Risk Metrics Visualization

- **Risk per trade tracking**
- **Daily risk limits**
- **Risk/Reward ratio analysis**
- **Account risk heatmap**

---

### 2.11 SENTIMENT & NEWS

#### Live Market News Feed

- **Source**: Global macroeconomic/forex news APIs
- **Content**:
  - Economic calendar events
  - Central bank announcements
  - Market news
  - Volatility indicators

#### AI Sentiment Analysis

- **Analysis**: Bullish/Bearish market sentiment
- **Update Frequency**: Real-time
- **Use Case**: Decision support for trade entries

#### Market Sentiment Visualization

- **Pair-wise sentiment display**
- **Historical sentiment trends**
- **Correlation with price action**

---

### 2.12 AUTHENTICATION & AUTHORIZATION

#### User Registration

- **Endpoint**: `POST /auth/register`
- **Fields**: Email, password, name
- **7-Day Free Trial**: Automatic on signup

#### User Login

- **Endpoint**: `POST /auth/login`
- **Session Management**: JWT/token-based
- **Credential Verification**: Email/password validation

#### Access Control

- **Subscription Levels**:
  - Free (7-day trial)
  - Pro
  - Institutional
- **Feature Gating**: SubscriptionGate component restricts premium features

#### Multi-Account Support

- **Capability**: Link multiple trading accounts per user
- **Isolation**: Data scoped by user authentication

---

### 2.13 TRADING STYLES & STRATEGY MANAGEMENT

#### Strategy Tracking

- **Endpoint**: `/tradingstyle`
- **Features**:
  - Define custom trading strategies
  - Tag trades with strategy
  - Strategy performance metrics
  - Identify best-performing strategies

#### Trading Style Classification

- **Categories**: Day Trading, Swing Trading, Position Trading, Scalping
- **Metadata**: Associated trades, win rate per style

---

### 2.14 ADDITIONAL DASHBOARD MODULES

#### Dashboard Widgets

- **Available Views**:
  - **Alerts**: Active trading alerts
  - **Analytics**: Key performance metrics
  - **Bot Status**: Live MT5 connection status
  - **Backtesting Results**: Recent backtest runs
  - **Calendar**: Monthly trading heatmap
  - **Journal**: Quick-entry form
  - **Community Feed**: Recent community posts
  - **Positions**: Open positions from MT5
  - **Indicators**: Technical indicators (MA, RSI, etc.)
  - **News**: Live economic calendar
  - **Sentiment**: Market sentiment gauge
  - **Risk Calculator**: Position sizing tools

---

## 3. DATABASE SCHEMA

### Tables/Models

#### `trades` Table

```sql
- id (Primary Key)
- date (Date)
- pair (String)
- strategy (String, nullable)
- setup_type (String, nullable)
- entry (Decimal)
- sl (Decimal, nullable)
- tp (Decimal, nullable)
- rr (String, nullable)
- outcome (String)
- notes (Text, nullable)
- image_url (Text, nullable)
- ticket (String, nullable) [Broker identifier]
- broker_symbol (String, nullable)
- direction (String) [Long/Short/Buy/Sell]
- lot_size (Decimal, nullable)
- profit (Decimal)
- close_price (Decimal, nullable)
- open_time (DateTime, nullable)
- close_time (DateTime, nullable)
- commission (Decimal, nullable)
- csv_import_id (Foreign Key, nullable)
- created_at (DateTime)
- updated_at (DateTime)
```

#### `accounts` Table

```sql
- id (Primary Key)
- broker_name (String)
- account_number (String)
- api_key (Text, nullable)
- api_secret (Text, nullable)
- balance (Decimal, nullable)
- equity (Decimal, nullable)
- last_updated (DateTime, nullable)
```

#### `csv_imports` Table

```sql
- id (Primary Key)
- file_name (String)
- broker_name (String)
- account_number (String, nullable)
- total_trades (Integer)
- success_count (Integer)
- failure_count (Integer)
- total_profit (Decimal)
- win_rate (Decimal)
- profit_factor (Decimal, nullable)
- status (String) [pending/processing/completed/failed]
- error_message (Text, nullable)
- created_at (DateTime)
- updated_at (DateTime)
```

#### `profit_loss` Table

```sql
- id (Primary Key)
- trade_id (Foreign Key)
- profit (Decimal)
- loss (Decimal)
```

#### `user_profiles` Table

```sql
- id (UUID Primary Key)
- user_id (String, unique) [Auth token ID/email]
- name (String)
- bio (Text, nullable)
- avatar (Text, nullable)
- trade_style (String, nullable)
- created_at (DateTime)
- updated_at (DateTime)
```

#### `posts` Table

```sql
- id (UUID Primary Key)
- content (Text)
- image (Text, nullable)
- pair (String, nullable)
- direction (String, nullable)
- entry (String, nullable)
- tp (String, nullable)
- sl (String, nullable)
- result (String, nullable)
- author_id (Foreign Key)
- community_id (Foreign Key, nullable)
- created_at (DateTime)
```

#### `comments` Table

```sql
- id (UUID Primary Key)
- content (Text)
- post_id (Foreign Key)
- author_id (Foreign Key)
- created_at (DateTime)
```

#### `post_likes` Table

```sql
- id (UUID Primary Key)
- post_id (Foreign Key)
- user_id (Foreign Key)
```

#### `communities` Table

```sql
- id (UUID Primary Key)
- name (String)
- description (Text, nullable)
- creator_id (Foreign Key)
- created_at (DateTime)
```

---

## 4. API ENDPOINTS SUMMARY

### Trade Management

```
POST   /trades              - Create new trade
GET    /trades              - List trades (with filters)
GET    /trades/:id          - Get single trade
PUT    /trades/:id          - Update trade
DELETE /trades/:id          - Delete trade
```

### CSV/Broker Integration

```
POST   /csv/upload          - Upload CSV file
GET    /csv/imports         - List imports
GET    /csv/imports/:id     - Get import details
GET    /csv/imports/:id/trades - Get trades from import
```

### Account Management

```
POST   /accounts            - Create account
GET    /accounts            - List accounts
PUT    /accounts/:id        - Update account
```

### Community

```
GET    /community/profile   - Get user profile
POST   /community/profile   - Update profile
POST   /community/posts     - Create post
GET    /community/posts     - Get feed
PUT    /community/posts/:id - Update post
DELETE /community/posts/:id - Delete post
POST   /community/posts/:id/likes - Like post
POST   /community/posts/:id/comments - Comment on post
GET    /community/groups    - List communities
POST   /community/groups    - Create community
POST   /community/groups/:id/join - Join community
POST   /community/groups/:id/leave - Leave community
GET    /community/groups/:id/members - List members
```

### Calendar & Analytics

```
GET    /calendar/data       - Get calendar data (with year/month filters)
```

### Upload & Media

```
POST   /upload/image        - Upload image
```

---

## 5. FRONTEND ARCHITECTURE

### Page Structure (Next.js App Router)

```
/
├── page.tsx                    [Landing page with features]
├── auth/                       [Authentication pages]
├── dashboard/                  [Main dashboard]
├── journal/                    [Trading journal form & view]
├── accounts/                   [Account management]
├── analytics/                  [Trading analytics/metrics]
├── backtesting/               [Backtest engine]
├── bot/                       [MT5 connection status]
├── calendar/                  [Trading calendar heatmap]
├── community/                 [Social feed & posts]
├── positions/                 [Open positions from MT5]
├── strategies/                [Strategy management]
├── tradingstyle/              [Trading style tracking]
├── risk/                      [Risk calculator & metrics]
├── alerts/                    [Alert management]
├── news/                      [Economic news feed]
├── sentiment/                 [Market sentiment analysis]
└── profiles/                  [User profile]
```

### Key Components

- `Navbar.tsx` - Navigation header with user menu
- `Sidebar.tsx` - Collapsible sidebar navigation
- `CsvUploadComponent.tsx` - CSV file upload interface
- `JournalCalendar.tsx` - Calendar heatmap visualization
- `LotCalculator.tsx` - Position sizing calculator
- `AITradingAssistant.tsx` - AI-powered trade analysis
- `ServiceError.tsx` - Error handling display
- `SubscriptionGate.tsx` - Premium feature lock

### Custom Hooks

- `useApi.ts` - Generic API request hook
- `useTrades.ts` - Trade data fetching
- `useCsvUpload.ts` - CSV upload management
- `useJournalData.ts` - Journal data management
- `useWebSocket.ts` - Real-time WebSocket connection
- `useAutoMT5Connect.ts` - Auto-reconnection to MT5

### Utilities

- `calculations.ts` - Trading math (lot size, RR, etc.)
- `chartSetup.ts` - Chart library configuration
- `utils.ts` - General utilities
- `technicalIndicators.ts` - Indicator calculations (MA, RSI, etc.)

---

## 6. PYTHON BOT SERVICE

### MT5 Bridge (`mt5_bridge.py`)

**Purpose**: Direct communication with MetaTrader 5 terminal

**Capabilities**:

- Establish connection to MT5
- Retrieve live account data
- Stream open positions
- Monitor real-time P&L
- Send order signals (when enabled)

**Dependencies**:

```
fastapi==0.104.1              [Web server]
uvicorn==0.24.0               [ASGI server]
aiohttp==3.9.1                [Async HTTP client]
requests==2.31.0              [HTTP requests]
feedparser==6.0.10            [News feed parsing]
python-dotenv==1.0.0          [Environment variables]
pydantic==2.5.0               [Data validation]
```

---

## 7. DEPLOYMENT CONFIGURATION

### Docker Setup

- **docker-compose.yml**: Multi-service orchestration
- Backend service
- Frontend service (Next.js)
- PostgreSQL database
- Python bot service

### Environment Variables Required

```
DATABASE_URL=postgresql://...
MT5_CREDENTIALS_PATH=./user_mt5_credentials.json
API_BASE_URL=...
JWT_SECRET=...
```

### Railway Deployment

- **railway.toml**: Deployment configuration for Railway.app
- Auto-scaling settings
- Environment configuration

---

## 8. KEY FEATURES MATRIX

| Feature               | Free Trial | Pro | Institutional |
| --------------------- | ---------- | --- | ------------- |
| Trading Journal       | ✓          | ✓   | ✓             |
| CSV Import (1 file)   | ✓          | ✓   | ✓             |
| MT5 Live Bridge       | ✓          | ✓   | ✓             |
| Analytics (basic)     | ✓          | ✓   | ✓             |
| Community Features    | ✓          | ✓   | ✓             |
| Unlimited CSV Imports | ✗          | ✓   | ✓             |
| Advanced Analytics    | ✗          | ✓   | ✓             |
| Backtesting Engine    | ✗          | ✓   | ✓             |
| AI Sentiment (30-day) | ✗          | ✓   | ✓             |
| Priority Support      | ✗          | ✗   | ✓             |
| API Access            | ✗          | ✗   | ✓             |

---

## 9. USER WORKFLOWS

### Workflow 1: Manual Trade Journaling

1. User logs in
2. Navigate to Journal
3. Fill out trade form:
   - Date, Pair, Strategy, Entry, SL, TP, RR, Outcome
   - Add notes and screenshot
4. Save trade
5. View in calendar/analytics

### Workflow 2: Bulk Import from Broker

1. Export trades from MT5/MT4/cTrader as CSV
2. Log into TradeKiller Pro
3. Navigate to CSV Import
4. Upload file
5. System auto-detects broker format
6. Review import summary (success rate, metrics)
7. Trades appear in journal

### Workflow 3: Live Monitoring (MT5 Connected)

1. Start MT5 Terminal
2. Open TradeKiller Pro dashboard
3. MT5 Bridge establishes connection
4. See live balance, equity, open positions
5. Receive real-time P&L updates
6. Get alerts on position changes

### Workflow 4: Community Sharing

1. Execute a trade (manual or live)
2. Navigate to Community
3. Create Post with trade details
4. Add screenshot/analysis
5. Share with community
6. Receive feedback/comments from other traders

### Workflow 5: Strategy Analysis

1. Filter trades by strategy in Journal
2. View strategy-specific win rate
3. See most profitable strategies
4. Backtest top strategies
5. Optimize entry/exit rules

---

## 10. TECHNICAL INTEGRATION POINTS

### Real-time Data Flow

```
MT5 Terminal
  → Python Bot (mt5_bridge.py)
    → WebSocket server
      → Frontend (WebSocket hook)
        → React components (live updates)
```

### CSV Import Pipeline

```
User Upload
  → Multer (file handling)
    → CSV Parser
      → Broker format detection
        → Data validation
          → Database insert
            → Metrics calculation
              → Success response
```

### API Communication

```
Frontend React Components
  → useApi hook
    → Axios client
      → Express API routes
        → Controllers
          → Prisma ORM
            → PostgreSQL
```

---

## 11. SECURITY CONSIDERATIONS

- **Helmet**: HTTP header security
- **CORS**: Cross-origin request control
- **JWT Authentication**: Stateless session management
- **API Key Encryption**: Stored securely (api_key, api_secret)
- **CSV Validation**: Prevent malicious CSV uploads
- **Input Sanitization**: All user inputs validated

---

## 12. PERFORMANCE & SCALABILITY

- **Database Indexing**: Date, pair, strategy columns indexed
- **Pagination**: Trades endpoint supports limit/offset
- **Caching**: Consider Redis for frequently accessed data
- **Real-time**: WebSocket for low-latency updates
- **File Storage**: Uploads served from `/uploads` directory
- **Horizontal Scaling**: Stateless backend deployable to multiple instances

---

## 13. FUTURE ENHANCEMENT OPPORTUNITIES

1. **Advanced AI**: ML-based trade recommendation engine
2. **Social Trading**: Copy-trading from top performers
3. **Mobile App**: Native iOS/Android apps
4. **Webhooks**: Third-party integrations
5. **Advanced Charting**: TradingView-like charting
6. **Signal Services**: Alert subscriptions from analysts
7. **API v2**: RESTful API for developers
8. **White Label**: SaaS multi-tenant solution

---

## SUMMARY

**TradeKiller Pro** is a comprehensive forex trading platform combining:

- ✅ Manual & automated trade journaling
- ✅ Multi-broker CSV import with smart parsing
- ✅ Live MT5 terminal integration
- ✅ Professional analytics & metrics
- ✅ Social trading community
- ✅ Advanced risk management tools
- ✅ Real-time alerts & notifications
- ✅ Backtesting engine
- ✅ AI-powered market sentiment
- ✅ Scalable modern stack (TypeScript, Next.js, PostgreSQL)

Perfect for professional traders, retail traders, and trading educators seeking a unified platform to manage, analyze, and improve their trading performance.
