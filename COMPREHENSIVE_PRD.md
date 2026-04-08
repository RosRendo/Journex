# TradeKiller Pro - Complete Product Requirements Document (PRD)

**Last Updated**: April 2026  
**Project Status**: Full-Stack Forex Trading Dashboard  
**Technology**: Node.js + Express + PostgreSQL + Next.js + React + Python

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [Functional Requirements](#functional-requirements)
4. [Non-Functional Requirements](#non-functional-requirements)
5. [Technical Architecture](#technical-architecture)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Frontend Features & Pages](#frontend-features--pages)
9. [User Roles & Permissions](#user-roles--permissions)
10. [Subscription Tiers](#subscription-tiers)
11. [Security & Compliance](#security--compliance)
12. [Performance Requirements](#performance-requirements)
13. [Feature Roadmap](#feature-roadmap)

---

## EXECUTIVE SUMMARY

**TradeKiller Pro** is an institutional-grade forex trading platform that combines:

- **Live MetaTrader 5 Integration** for real-time account monitoring
- **Advanced Trading Journal** for performance tracking
- **Multi-Broker CSV Import** supporting MT5, MT4, cTrader, IC Markets, Pepperstone
- **Community & Social Features** for trader collaboration
- **Backtesting Engine** with historical replay
- **Risk Management Tools** including lot calculation
- **Economic Calendar & Sentiment Analysis** with AI-powered insights
- **Technical Indicators** for technical analysis
- **Real-time Alerts & Notifications** for position monitoring

**Target Users**: Forex traders (retail to institutional)  
**Business Model**: Freemium with tiered subscriptions  
**MVP Status**: MVP with production-ready core features

---

## PRODUCT OVERVIEW

### Vision

Empower forex traders with institutional-grade tools for journaling, analysis, and community collaboration while maintaining direct connectivity to MetaTrader 5 for real-time execution monitoring.

### Core Value Propositions

1. **All-in-One Trading Dashboard** - No need for separate tools
2. **Real-Time MT5 Integration** - Live feed without lag
3. **Smart CSV Import** - Auto-detect broker format with metrics
4. **Community Collaboration** - Share setups and learn from others
5. **Risk Management** - Built-in lot calculator and risk tracking
6. **Backtesting** - Test strategies on historical data
7. **AI Sentiment Analysis** - Real-time market sentiment

### Key Differentiators

- Supports **6+ broker CSV formats** with auto-detection
- **Zero-latency** live MT5 bridge for position monitoring
- **Trade copier** functionality (master/slave accounts)
- **Economic calendar** with sentiment classification
- **Technical indicators** pre-built and calculated
- **Community features** for trader networking

---

## FUNCTIONAL REQUIREMENTS

### 1. TRADING JOURNAL SYSTEM

#### 1.1 Create Trade Entry

**Endpoint**: `POST /api/trades`

**Purpose**: Allow traders to manually log trades with comprehensive details

**Input Fields**:

- `date` (required): Date of trade (ISO 8601)
- `pair` (required): Currency pair (e.g., EURUSD)
- `strategy` (optional): Strategy name
- `setupType` (optional): Type of setup
- `entry` (required): Entry price (Decimal)
- `sl` (optional): Stop loss price (Decimal)
- `tp` (optional): Take profit price (Decimal)
- `rr` (optional): Risk/reward ratio (String, e.g., "1:2")
- `outcome` (required): Win/Loss/Breakeven
- `notes` (optional): Trade commentary (Text)
- `imageUrl` (optional): Screenshot/chart image URL
- `direction` (required): Long/Short/Buy/Sell
- `lotSize` (optional): Trade size (Decimal)
- `profit` (required): P&L amount (Decimal)
- `commission` (optional): Broker commission (Decimal)

**Output**: Created trade object with ID

**Validations**:

- Pair must be valid forex symbol
- Entry price must be > 0
- SL < Entry for shorts, SL > Entry for longs
- TP > Entry for longs, TP < Entry for shorts
- Outcome must be Win/Loss/Breakeven
- Profit amount can be negative

**Business Logic**:

- Calculate RR if not provided: `RR = |Entry - SL| / |TP - Entry|`
- Create linked ProfitLoss record
- Store timestamp of creation

#### 1.2 List All Trades

**Endpoint**: `GET /api/trades`

**Purpose**: Retrieve paginated trades with filtering

**Query Parameters**:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Trades per page (default: 20, max: 100)
- `strategy` (optional): Filter by strategy name
- `outcome` (optional): Win/Loss/Breakeven
- `pair` (optional): Currency pair filter
- `startDate` (optional): Date range start (ISO 8601)
- `endDate` (optional): Date range end (ISO 8601)
- `sortBy` (optional): date/profit/strategy
- `order` (optional): asc/desc

**Output**:

```json
{
  "trades": [
    {
      "id": 1,
      "date": "2025-11-27",
      "pair": "EURUSD",
      "strategy": "Support Resistance",
      "entry": 1.085,
      "sl": 1.082,
      "tp": 1.09,
      "outcome": "Win",
      "profit": 500.0,
      "createdAt": "2025-11-27T12:34:56Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

**Calculations Performed**:

- Win count
- Total profit/loss
- Win rate percentage
- Average win amount
- Average loss amount
- Profit factor

#### 1.3 View Single Trade

**Endpoint**: `GET /api/trades/:id`

**Output**: Complete trade details with all fields

#### 1.4 Update Trade Entry

**Endpoint**: `PUT /api/trades/:id`

**Purpose**: Edit existing trade (for corrections/additions)

**Allowed Fields**:

- Any field except csvImportId (immutable once created)

**Business Logic**:

- Recalculate all dependent metrics
- Update editedAt timestamp
- Maintain creation timestamp

#### 1.5 Delete Trade Entry

**Endpoint**: `DELETE /api/trades/:id`

**Purpose**: Remove trade from journal

**Cascade Behavior**:

- Delete linked ProfitLoss record
- Remove from analytics calculations

---

### 2. CSV IMPORT & MULTI-BROKER SUPPORT

#### 2.1 Supported Broker Formats

| Broker             | Format        | Key Fields                                                                                 | Status       |
| ------------------ | ------------- | ------------------------------------------------------------------------------------------ | ------------ |
| MetaTrader 5 (MT5) | Native CSV    | Ticket, OpenTime, CloseTime, Symbol, Direction, Volume, Price, Profit                      | ✅ Supported |
| MetaTrader 4 (MT4) | CSV export    | Order number, Open Time, Close Time, Symbol, Type, Lots, Open Price, Close Price, Profit   | ✅ Supported |
| cTrader            | Native format | TradeId, OpenTime, CloseTime, Symbol, Side, Volume, OpenPrice, ClosePrice, GrossPnL        | ✅ Supported |
| IC Markets         | CSV           | OrderID, OpenDateTime, CloseDateTime, Instrument, Side, Volume, EntryPrice, ExitPrice, PnL | ✅ Supported |
| Pepperstone        | CSV           | Trade ID, Open Date, Close Date, Pair, Side, Lots, Entry, Exit, P/L                        | ✅ Supported |
| Generic            | Generic CSV   | Auto-detect columns                                                                        | ✅ Fallback  |

#### 2.2 CSV Upload & Processing

**Endpoint**: `POST /api/csv/upload`

**Purpose**: Bulk import trades from broker CSV export

**Input**:

- File: Multipart CSV file (max 50MB)
- `accountNumber` (optional): Associated account
- `brokerName` (optional): Force broker format

**Processing Pipeline**:

1. **File Validation**
   - Check MIME type (text/csv, application/vnd.ms-excel)
   - Validate file size
   - Save temp file

2. **Format Detection**
   - Scan header row
   - Match column patterns against known brokers
   - Auto-detect format or use forced broker

3. **Row Parsing**
   - Skip header row
   - Parse each CSV row
   - Validate data types and ranges
   - Extract required fields per broker format

4. **Trade Creation**
   - Create Trade records from parsed data
   - Calculate metrics for each trade
   - Batch insert for performance

5. **Summary Generation**
   - Count successful imports
   - Count failures with reasons
   - Calculate aggregate metrics
   - Create CsvImport record

**Output**:

```json
{
  "importId": 42,
  "fileName": "MT5_Trades_2025.csv",
  "brokerName": "MetaTrader 5",
  "totalTrades": 150,
  "successCount": 148,
  "failureCount": 2,
  "totalProfit": 5250.0,
  "winRate": 65.33,
  "profitFactor": 2.45,
  "errors": [
    { "row": 15, "reason": "Invalid date format" },
    { "row": 47, "reason": "Missing profit value" }
  ]
}
```

**Error Handling**:

- Log individual row errors
- Continue processing valid rows
- Report failures in summary
- Allow user to fix and retry

#### 2.3 CSV Metrics Calculation

**Automatic Calculations**:

```
totalProfit = SUM(profit for all trades)
winCount = COUNT(outcome = 'Win')
lossCount = COUNT(outcome = 'Loss')
breakEvenCount = COUNT(outcome = 'Breakeven')
winRate = (winCount / totalTrades) * 100
grossProfit = SUM(profit > 0 for all trades)
grossLoss = ABS(SUM(profit < 0 for all trades))
profitFactor = grossProfit / grossLoss
averageWin = grossProfit / winCount
averageLoss = grossLoss / lossCount
expectancy = (winRate/100 * averageWin) - ((100-winRate)/100 * averageLoss)
largestWin = MAX(profit)
largestLoss = MIN(profit)
consecutiveWins = longest sequence of wins
consecutiveLosses = longest sequence of losses
```

#### 2.4 View Import History

**Endpoint**: `GET /api/csv/imports`

**Purpose**: List all import sessions

**Output**: Array of CsvImport records with metrics

#### 2.5 Retrieve Trades from Specific Import

**Endpoint**: `GET /api/csv/imports/:importId/trades`

**Purpose**: Audit all trades from specific import

**Output**: Paginated trades array

---

### 3. ACCOUNT MANAGEMENT

#### 3.1 Create Trading Account

**Endpoint**: `POST /api/accounts`

**Purpose**: Connect broker account for tracking

**Input Fields**:

- `brokerName` (required): Broker name (Text)
- `accountNumber` (required): Account ID/number (Text)
- `apiKey` (optional): Broker API key (encrypted storage)
- `apiSecret` (optional): Broker API secret (encrypted storage)
- `mt5Password` (optional): MT5 login password (encrypted)
- `mt5Server` (optional): MT5 server name
- `balance` (optional): Initial balance (Decimal)
- `equity` (optional): Current equity (Decimal)
- `isMaster` (optional): Is master account for trade copier (Boolean)
- `copierEnabled` (optional): Enable trade copier (Boolean)
- `copierMultiplier` (optional): Lot size multiplier (Decimal, default 1.0)

**Output**: Created Account record

**Validations**:

- Account number must be unique per user
- API keys must meet minimum length
- MT5 server must be valid MetaTrader server
- Multiplier must be between 0.01 and 10.0

**Business Logic**:

- Encrypt sensitive fields (API keys, passwords)
- Create account record
- Initialize last_updated timestamp

#### 3.2 List All Accounts

**Endpoint**: `GET /api/accounts`

**Purpose**: View all connected accounts

**Output**: Array of Account records (sensitive fields redacted)

#### 3.3 Update Account

**Endpoint**: `PUT /api/accounts/:id`

**Purpose**: Update account details

**Allowed Fields**:

- balance, equity (for manual updates)
- apiKey, apiSecret, mt5Password (re-encrypted)
- copierEnabled, copierMultiplier
- Any non-sensitive field

**Business Logic**:

- Update lastUpdated timestamp
- Re-encrypt sensitive fields if changed

#### 3.4 Delete Account

**Endpoint**: `DELETE /api/accounts/:id`

**Purpose**: Remove account connection

**Cascade Behavior**:

- Keep associated trades for history
- Stop live data polling

---

### 4. LIVE MT5 BRIDGE INTEGRATION

#### 4.1 Real-Time Terminal Connection

**Service**: Python FastAPI (mt5_bridge.py)  
**Port**: 5003 (default)  
**Protocol**: WebSocket + REST

**Capabilities**:

- Establish persistent connection to MT5 terminal
- Poll account data every 1-5 seconds
- Stream real-time updates to frontend
- Handle connection failures gracefully

#### 4.2 Live Data Feed

**Endpoint**: `GET /bridge/accounts/:accountId/live`

**Purpose**: Real-time account status

**Polling Frequency**: 2 seconds (configurable)

**Data Points**:

```json
{
  "accountId": "12345",
  "balance": 10000.0,
  "equity": 10500.0,
  "openPositions": 3,
  "runningPL": 500.0,
  "pairs": ["EURUSD", "GBPUSD", "USDJPY"],
  "timestamp": "2025-11-27T14:30:00Z"
}
```

#### 4.3 Open Positions Display

**Endpoint**: `GET /bridge/accounts/:accountId/positions`

**Purpose**: List all open trades

**Output**:

```json
{
  "positions": [
    {
      "ticket": 123456,
      "pair": "EURUSD",
      "direction": "Long",
      "lotSize": 0.5,
      "entry": 1.085,
      "current": 1.0875,
      "sl": 1.082,
      "tp": 1.09,
      "pnl": 125.0,
      "openTime": "2025-11-27T10:15:00Z"
    }
  ]
}
```

#### 4.4 MT5 Bridge Proxy Routing

**Architecture**:

- **Local Mode** (`TRADE_MODE=local`): Route to Python service on port 5003
- **Cloud Mode** (`TRADE_MODE=cloud`): Route to MetaApi REST endpoints (future)

**Endpoint**: `POST /bridge/...` (proxied to Python service)

---

### 5. COMMUNITY & SOCIAL FEATURES

#### 5.1 User Profile Management

**Endpoint**: `GET/POST /api/community/profile`

**Purpose**: Create and manage trader profiles

**Fields**:

- `name` (required): Display name (100 chars)
- `bio` (optional): User bio/about (Text)
- `avatar` (optional): Profile picture (URL/base64)
- `tradeStyle` (optional): Day/Swing/Position/Scalp

**Output**: UserProfile object

#### 5.2 Create Trading Post

**Endpoint**: `POST /api/community/posts`

**Purpose**: Share trade setups and analysis

**Input Fields**:

- `content` (required): Post text/analysis (Text)
- `image` (optional): Trade chart/screenshot (URL)
- `pair` (optional): Currency pair
- `direction` (optional): Long/Short
- `entry` (optional): Entry price
- `tp` (optional): Take profit level
- `sl` (optional): Stop loss level
- `result` (optional): Win/Loss/Pending
- `communityId` (optional): Post to specific community

**Output**: Post object with ID

**Validations**:

- Content must be 1-5000 characters
- Image must be valid image URL
- Pair, direction, etc. must be valid

#### 5.3 View Community Feed

**Endpoint**: `GET /api/community/posts`

**Purpose**: Paginated feed of community posts

**Query Parameters**:

- `page` (optional): Page number
- `limit` (optional): Posts per page (default 10)
- `pair` (optional): Filter by pair
- `communityId` (optional): Filter by community
- `sortBy` (optional): newest/popular/trending

**Output**: Paginated array of Post objects with author info

#### 5.4 Like/Engagement Tracking

**Endpoint**: `POST /api/community/posts/:id/likes`

**Purpose**: Toggle like on post

**Output**: Updated like count

#### 5.5 Comment on Post

**Endpoint**: `POST /api/community/posts/:id/comments`

**Purpose**: Add comment to post

**Input**:

- `content` (required): Comment text

**Output**: Comment object

#### 5.6 Create Trading Community

**Endpoint**: `POST /api/community/groups`

**Purpose**: Create trading community/group

**Input Fields**:

- `name` (required): Community name
- `description` (optional): Community description
- `style` (optional): Trading style (Day/Swing/etc.)
- `isPrivate` (optional): Private/public toggle

**Output**: Community object

#### 5.7 Join/Leave Community

**Endpoints**:

- `POST /api/community/groups/:id/join` - Add to community
- `POST /api/community/groups/:id/leave` - Remove from community

#### 5.8 Community Members

**Endpoint**: `GET /api/community/groups/:id/members`

**Purpose**: List community members

**Output**: Array of UserProfile objects with join date

---

### 6. TRADING ANALYTICS & PERFORMANCE

#### 6.1 Analytics Calculations

**Metrics Computed**:

| Metric             | Formula                                | Purpose                  |
| ------------------ | -------------------------------------- | ------------------------ |
| Win Rate           | (Wins / Total Trades) × 100            | Consistency measure      |
| Profit Factor      | Gross Profit / Gross Loss              | Risk efficiency          |
| Expectancy         | (WR% × AvgWin) - ((100-WR)% × AvgLoss) | Expected value per trade |
| Average Win        | Total Profit / Win Count               | Avg winning trade size   |
| Average Loss       | Total Loss / Loss Count                | Avg losing trade size    |
| Risk/Reward        | Average Loss / Average Win             | Trade ratio              |
| Drawdown           | Peak-to-trough decline in equity       | Maximum loss from peak   |
| Calmar Ratio       | Return / Maximum Drawdown              | Return per risk unit     |
| Daily Return       | P&L per day                            | Daily performance        |
| Monthly Return     | Cumulative P&L per month               | Monthly performance      |
| Consecutive Wins   | Longest win streak                     | Trader confidence        |
| Consecutive Losses | Longest loss streak                    | Resilience               |

#### 6.2 Strategy Performance

**Endpoint**: `GET /api/trades/analytics/strategies`

**Purpose**: Performance breakdown by strategy

**Output**:

```json
{
  "strategies": [
    {
      "name": "Support Resistance",
      "totalTrades": 25,
      "wins": 17,
      "losses": 8,
      "winRate": 68.0,
      "profitFactor": 2.1,
      "totalProfit": 3500.0
    }
  ]
}
```

#### 6.3 Pair Performance

**Endpoint**: `GET /api/trades/analytics/pairs`

**Purpose**: Performance per currency pair

**Output**: Array with performance per pair

#### 6.4 Time-Based Analysis

**Endpoints**:

- `GET /api/trades/analytics/daily` - Per-day metrics
- `GET /api/trades/analytics/weekly` - Per-week metrics
- `GET /api/trades/analytics/monthly` - Per-month metrics

---

### 7. CALENDAR & HEATMAP VIEW

#### 7.1 Monthly Calendar Data

**Endpoint**: `GET /api/calendar/data`

**Purpose**: Trade frequency and P&L per day

**Query Parameters**:

- `year` (required): Year
- `month` (required): Month (1-12)

**Output**:

```json
{
  "month": 11,
  "year": 2025,
  "days": [
    {
      "date": "2025-11-01",
      "tradeCount": 3,
      "profit": 250.0,
      "wins": 2,
      "losses": 1,
      "isWeekend": false
    }
  ]
}
```

#### 7.2 Heatmap View Features

- Daily trade count visualization
- Color-coded profitability (green/red)
- Trade frequency density
- Best/worst trading days identification
- Year/month navigation

---

### 8. BACKTESTING ENGINE

#### 8.1 Tick-by-Tick Replay

**Service**: FXReplay integration (external)

**Purpose**: Test strategies on historical data

**Capabilities**:

- Load historical OHLC data
- Simulate trade execution
- Adjust playback speed (1x to 100x)
- Pause/resume at any point
- Mark entry/exit points

#### 8.2 Backtest Results

**Output**:

```json
{
  "backtestId": "uuid",
  "strategyName": "Support Resistance",
  "startDate": "2025-01-01",
  "endDate": "2025-11-27",
  "trades": 125,
  "wins": 85,
  "losses": 40,
  "winRate": 68.0,
  "totalProfit": 12500.00,
  "profitFactor": 3.2,
  "maxDrawdown": 2500.00,
  "equityCurve": [...]
}
```

#### 8.3 Speed Controls

- 1x: Real-time simulation
- 5x, 10x, 50x, 100x: Accelerated replay

---

### 9. RISK MANAGEMENT TOOLS

#### 9.1 Lot Calculator

**Endpoint**: `POST /api/risk/calculate-lot`

**Purpose**: Calculate safe lot size for trade

**Input**:

- `accountSize` (required): Decimal
- `riskPercentage` (required): 0.1 to 10 (percent)
- `slDistance` (required): Decimal (pip distance)

**Formula**:

```
Lot Size = (Account Size × Risk% / 100) / (SL Distance in pips × Pip Value)
```

**Output**:

```json
{
  "accountSize": 10000.0,
  "riskPercentage": 2.0,
  "slDistance": 30,
  "recommendedLot": 0.67,
  "potentialLoss": 200.0,
  "potentialGain": 600.0,
  "riskReward": "1:3"
}
```

#### 9.2 Risk Metrics Dashboard

**Endpoint**: `GET /api/risk/dashboard`

**Purpose**: Risk overview

**Output**:

- Daily risk used (%)
- Daily risk remaining (%)
- Open position risk
- Account heat (risk level)

#### 9.3 Daily Risk Limits

**Configuration**:

- Max risk per trade: User-defined
- Max daily risk: User-defined
- Stop trading at % of daily limit

---

### 10. ALERTS & NOTIFICATIONS

#### 10.1 Alert Types

- Stop loss hit
- Take profit reached
- Balance changed (>X%)
- Position opened/closed
- CSV import complete
- Economic event (upcoming)

#### 10.2 Notification Channels

- In-app notifications
- Email alerts (optional)
- Webhook integrations (future)

#### 10.3 Alert History

**Endpoint**: `GET /api/alerts/history`

**Purpose**: List all historical alerts

---

### 11. MARKET SENTIMENT & NEWS

#### 11.1 Economic Calendar

**Endpoint**: `GET /api/macro/calendar`

**Purpose**: Upcoming economic events

**Query Parameters**:

- `daysAhead` (optional): Look ahead period (default 7)
- `countries` (optional): Filter by countries
- `importance` (optional): Low/Medium/High

**Output**:

```json
{
  "events": [
    {
      "eventId": "123",
      "name": "ECB Interest Rate Decision",
      "country": "EUR",
      "date": "2025-12-12T13:45:00Z",
      "importance": "High",
      "forecast": 4.25,
      "previous": 4.0,
      "sentiment": "Bullish"
    }
  ]
}
```

#### 11.2 News Feed

**Endpoint**: `GET /api/macro/news`

**Purpose**: Real-time market news

**Features**:

- Fetch from economic calendar APIs
- Parse news sources (Reuters, Bloomberg)
- Timestamp each article
- Featured image extraction

#### 11.3 AI Sentiment Analysis

**Purpose**: Classify news sentiment

**Classification**:

- Bullish (positive for pair)
- Bearish (negative for pair)
- Neutral

**Data Scope**:

- Latest 30 days (free tier)
- Unlimited history (pro tier)

---

### 12. TECHNICAL INDICATORS

#### 12.1 Supported Indicators

```
Moving Averages:
- Simple Moving Average (SMA)
- Exponential Moving Average (EMA)
- Weighted Moving Average (WMA)

Momentum:
- Relative Strength Index (RSI)
- Stochastic Oscillator
- MACD (Moving Average Convergence Divergence)

Volatility:
- Bollinger Bands
- Average True Range (ATR)
- Keltner Channels

Volume:
- Volume (if available)
```

#### 12.2 Indicator Calculation

**Endpoint**: `POST /api/indicators/calculate`

**Input**:

- `pair` (required)
- `timeframe` (required): 1m/5m/15m/1h/4h/1d
- `indicators[]` (required): List of indicators
- `periods`: Custom periods (e.g., RSI period)

**Output**:

```json
{
  "pair": "EURUSD",
  "timeframe": "1h",
  "sma50": 1.0875,
  "sma200": 1.082,
  "rsi14": 65.4,
  "macd": -0.0045,
  "signal": -0.005,
  "histogram": 0.0005
}
```

#### 12.3 Chart Integration

- TradingView Lightweight Charts
- Recharts for analytics
- Chart.js for historical data

---

### 13. MEDIA & FILE UPLOAD

#### 13.1 Upload Types

1. **Trade Screenshots** - Trade evidence
2. **Chart Images** - Technical setup
3. **Profile Avatar** - User picture
4. **Community Post Images** - Setup sharing

#### 13.2 File Upload Endpoint

**Endpoint**: `POST /api/upload`

**File Constraints**:

- Supported formats: PNG, JPG, JPEG, GIF, WEBP
- Max file size: 5MB per file
- Max uploads per request: 5 files

**Processing**:

- Scan for malware (optional)
- Generate thumbnail
- Optimize image

**Output**:

```json
{
  "uploads": [
    {
      "fileId": "uuid",
      "url": "/uploads/2025/11/27/trade_001.jpg",
      "thumbnail": "/uploads/2025/11/27/trade_001_thumb.jpg",
      "size": 245000,
      "uploadedAt": "2025-11-27T14:30:00Z"
    }
  ]
}
```

#### 13.3 Storage

- Local: `/uploads` directory
- CDN: Support for S3/CDN integration
- Cleanup: Auto-delete orphaned files after 30 days

---

### 14. AUTHENTICATION & AUTHORIZATION

#### 14.1 Auth Methods

- Email/Password registration and login
- Next-Auth integration for session management
- JWT tokens for API calls
- Optional: OAuth (Google/GitHub) in future

#### 14.2 Session Management

- JWT expiration: 24 hours
- Refresh tokens: 30 days
- CSRF protection
- Secure httpOnly cookies

#### 14.3 Access Control

- Public endpoints: No auth required
- Private endpoints: JWT required
- Admin endpoints: Admin role required
- Subscription gating: Tier verification

---

## NON-FUNCTIONAL REQUIREMENTS

### 1. PERFORMANCE REQUIREMENTS

| Metric            | Target              | Measurement            |
| ----------------- | ------------------- | ---------------------- |
| API Response Time | <200ms              | p95 latency            |
| Page Load Time    | <2s                 | First Contentful Paint |
| Database Query    | <100ms              | p95 query time         |
| CSV Import        | <5s per 1000 trades | Bulk processing        |
| Live Data Update  | <1s                 | WebSocket latency      |
| Search/Filter     | <500ms              | With 10k records       |
| Concurrent Users  | 1000+               | Dashboard load         |
| Uptime            | 99.5%               | Monthly availability   |

### 2. SCALABILITY

**Horizontal Scaling**:

- Stateless Express backend (scale via load balancer)
- PostgreSQL connection pooling (PgBouncer)
- Frontend static generation (Next.js)

**Vertical Scaling**:

- Database indexing on frequently queried fields
- Caching layer (Redis) for hot data
- Query optimization via Prisma

**Future Optimizations**:

- Database sharding by user ID
- Read replicas for analytics queries
- Cache warming for common queries

### 3. RELIABILITY & AVAILABILITY

**Backup Strategy**:

- Daily database backups to S3
- 30-day retention policy
- Point-in-time recovery capability

**Disaster Recovery**:

- RTO (Recovery Time Objective): 1 hour
- RPO (Recovery Point Objective): 5 minutes
- Failover to replica database

**Monitoring**:

- Application health checks every 30s
- Database connectivity monitoring
- Memory/CPU alerts at 80%
- Error rate alerts at >1%

### 4. SECURITY REQUIREMENTS

**Data Protection**:

- All credentials encrypted at rest (AES-256)
- TLS 1.3 for data in transit
- Separate encryption key per credential

**Access Security**:

- Rate limiting: 100 req/min per IP
- SQL injection prevention: Prisma ORM
- XSS protection: Content Security Policy
- CSRF protection: CSRF tokens

**Compliance**:

- GDPR data handling
- User data anonymization on deletion
- Privacy policy enforcement
- Cookie consent

**Secrets Management**:

- Environment variables via .env
- No hardcoded credentials
- Vault for production secrets (future)

### 5. USABILITY REQUIREMENTS

**User Interface**:

- Responsive design (mobile/tablet/desktop)
- Accessibility score WCAG AA
- Loading state indicators
- Error message clarity
- Dark/light theme support

**User Guidance**:

- Onboarding tutorial (first-time users)
- Help tooltips on complex features
- Video tutorials (future)
- Knowledge base articles

### 6. MAINTAINABILITY

**Code Quality**:

- TypeScript for type safety
- ESLint for code standards
- Unit test coverage >80%
- Integration tests for critical paths

**Documentation**:

- API documentation (OpenAPI/Swagger)
- Architecture decision records (ADRs)
- Database schema documentation
- Deployment runbooks

**Monitoring & Logging**:

- Structured JSON logging
- Log aggregation (future)
- Performance tracing
- Error tracking (Sentry integration)

---

## TECHNICAL ARCHITECTURE

### 1. SYSTEM ARCHITECTURE DIAGRAM

```
┌────────────────────────────────────────────────────────────┐
│ External Data Sources                                      │
│ • MetaTrader 5 Terminal  • Economic Calendar  • News APIs  │
└──────────────────┬───────────────────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │  Python MT5 Bridge  │
        │  (FastAPI, port 5003)
        │  • MT5 connection   │
        │  • News aggregation │
        │  • WebSocket server │
        └─────────┬──────────┘
                  │
        ┌─────────▼────────────┐
        │ Express.js Backend   │
        │ • REST API endpoints │
        │ • CSV processing     │
        │ • File handling      │
        │ • Data validation    │
        └─────────┬────────────┘
                  │
      ┌───────────┼───────────┐
      │           │           │
      ▼           ▼           ▼
   Frontend    Database    Storage
   (Next.js)   (PostSQL)    (S3/Local)
```

### 2. REQUEST/RESPONSE FLOW

**Example: CSV Import Flow**

```
1. User selects CSV file in CsvUploadComponent
   ↓
2. POST /api/csv/upload (multipart form)
   ↓
3. Multer middleware saves temp file
   ↓
4. CSV Controller receives file path
   ↓
5. CSV Parser detects broker format
   ↓
6. Validate each row (date, price, outcome)
   ↓
7. Calculate metrics (profit, win rate, etc.)
   ↓
8. Batch insert trades into database
   ↓
9. Create CsvImport record with summary
   ↓
10. Return import results (success/failure)
   ↓
11. Frontend updates UI with import summary
```

### 3. REAL-TIME DATA FLOW (MT5 Bridge)

```
1. Frontend WebSocket connects to Python service
   ↓
2. Python establishes MT5 terminal connection
   ↓
3. Python polls account data every 2 seconds
   ↓
4. Fetch: balance, equity, open positions
   ↓
5. Compare with previous data
   ↓
6. Broadcast changes via WebSocket
   ↓
7. Frontend updates real-time display
```

### 4. ERROR HANDLING STRATEGY

**Backend Error Responses**:

```json
{
  "error": {
    "code": "INVALID_CSV_FORMAT",
    "message": "CSV header columns not recognized",
    "details": "Expected columns: date, pair, entry",
    "timestamp": "2025-11-27T14:30:00Z"
  }
}
```

**Frontend Error Handling**:

- Display user-friendly error messages
- Log technical details to console
- Retry logic for network errors
- Fallback UI for missing data

---

## DATABASE SCHEMA

### Core Tables

```sql
-- Trading Journal
CREATE TABLE trades (
  id INT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL,
  pair VARCHAR(20) NOT NULL,
  strategy VARCHAR(50),
  setup_type VARCHAR(50),
  entry DECIMAL(12,5) NOT NULL,
  sl DECIMAL(12,5),
  tp DECIMAL(12,5),
  rr VARCHAR(10),
  outcome VARCHAR(20) NOT NULL, -- Win/Loss/Breakeven
  notes TEXT,
  image_url TEXT,
  ticket VARCHAR(50),
  broker_symbol VARCHAR(20),
  direction VARCHAR(10) NOT NULL,
  lot_size DECIMAL(12,5),
  profit DECIMAL(12,5) NOT NULL,
  close_price DECIMAL(12,5),
  open_time DATETIME,
  close_time DATETIME,
  commission DECIMAL(12,5),
  csv_import_id INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Broker Accounts
CREATE TABLE accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  broker_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  api_key TEXT,
  api_secret TEXT,
  mt5_password TEXT,
  mt5_server VARCHAR(100),
  balance DECIMAL(15,2),
  equity DECIMAL(15,2),
  last_updated DATETIME,
  is_master BOOLEAN DEFAULT FALSE,
  copier_enabled BOOLEAN DEFAULT FALSE,
  copier_multiplier DECIMAL(5,2) DEFAULT 1.0
);

-- CSV Import Sessions
CREATE TABLE csv_imports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  file_name VARCHAR(255) NOT NULL,
  broker_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50),
  total_trades INT NOT NULL,
  success_count INT NOT NULL,
  failure_count INT NOT NULL,
  total_profit DECIMAL(15,2),
  win_rate DECIMAL(5,2),
  profit_factor DECIMAL(8,2),
  status VARCHAR(20), -- pending/processing/completed/failed
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Profit/Loss Tracking
CREATE TABLE profit_loss (
  id INT PRIMARY KEY AUTO_INCREMENT,
  trade_id INT UNIQUE NOT NULL,
  profit DECIMAL(12,2),
  loss DECIMAL(12,2),
  FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
);

-- Community: User Profiles
CREATE TABLE user_profiles (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  bio TEXT,
  avatar TEXT,
  trade_style VARCHAR(50), -- Day/Swing/Position/Scalp
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Community: Posts
CREATE TABLE posts (
  id VARCHAR(36) PRIMARY KEY,
  content TEXT NOT NULL,
  image TEXT,
  pair VARCHAR(20),
  direction VARCHAR(10),
  entry VARCHAR(50),
  tp VARCHAR(50),
  sl VARCHAR(50),
  result VARCHAR(50), -- Win/Loss/Pending
  author_id VARCHAR(36) NOT NULL,
  community_id VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE
);

-- Community: Comments
CREATE TABLE comments (
  id VARCHAR(36) PRIMARY KEY,
  content TEXT NOT NULL,
  post_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- Community: Likes
CREATE TABLE post_likes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  post_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_like (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- Community: Groups
CREATE TABLE communities (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  style VARCHAR(50),
  is_private BOOLEAN DEFAULT FALSE,
  creator_id VARCHAR(36) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES user_profiles(id)
);

-- Community: Membership
CREATE TABLE community_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  community_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_member (community_id, user_id),
  FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);
```

### Indexes for Performance

```sql
CREATE INDEX idx_trades_date ON trades(date);
CREATE INDEX idx_trades_pair ON trades(pair);
CREATE INDEX idx_trades_strategy ON trades(strategy);
CREATE INDEX idx_trades_outcome ON trades(outcome);
CREATE INDEX idx_trades_csv_import_id ON trades(csv_import_id);
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_community_id ON posts(community_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
```

---

## API ENDPOINTS

### Trade Management

```
POST   /api/trades                     Create trade
GET    /api/trades                     List trades (paginated, filterable)
GET    /api/trades/:id                 Get single trade
PUT    /api/trades/:id                 Update trade
DELETE /api/trades/:id                 Delete trade

GET    /api/trades/analytics/strategies    Strategy performance
GET    /api/trades/analytics/pairs         Pair performance
GET    /api/trades/analytics/daily         Daily metrics
GET    /api/trades/analytics/weekly        Weekly metrics
GET    /api/trades/analytics/monthly       Monthly metrics
```

### CSV Import

```
POST   /api/csv/upload                 Upload broker CSV
GET    /api/csv/imports                List import sessions
GET    /api/csv/imports/:id            Get import details
GET    /api/csv/imports/:id/trades     Trades from import
```

### Accounts

```
POST   /api/accounts                   Create account
GET    /api/accounts                   List accounts
GET    /api/accounts/:id               Get account
PUT    /api/accounts/:id               Update account
DELETE /api/accounts/:id               Delete account
```

### MT5 Bridge (Proxied)

```
GET    /bridge/accounts/:id/live       Live account data
GET    /bridge/accounts/:id/positions  Open positions
POST   /bridge/orders                  Place order (future)
```

### Calendar & Analytics

```
GET    /api/calendar/data              Calendar data for month
GET    /api/macro/calendar             Economic calendar events
GET    /api/macro/news                 Market news feed
GET    /api/risk/calculator            Lot calculation
GET    /api/risk/dashboard             Risk metrics
```

### Community

```
GET    /api/community/profile          Get user profile
POST   /api/community/profile          Update profile
POST   /api/community/posts            Create post
GET    /api/community/posts            Get feed
PUT    /api/community/posts/:id        Update post
DELETE /api/community/posts/:id        Delete post
POST   /api/community/posts/:id/likes  Like post
POST   /api/community/posts/:id/comments  Comment
GET    /api/community/groups           List communities
POST   /api/community/groups           Create community
POST   /api/community/groups/:id/join  Join community
GET    /api/community/groups/:id/members  Get members
```

### Media Upload

```
POST   /api/upload                     Upload media files
```

---

## FRONTEND FEATURES & PAGES

### Page Structure

```
/                               Home/Dashboard
  ├── /dashboard                Main dashboard
  ├── /journal                  Trading journal page
  │   ├── /create               Create new trade
  │   └── /[id]/edit            Edit trade
  ├── /accounts                 Account management
  ├── /analytics                Analytics & performance
  ├── /backtesting              Backtesting engine
  ├── /calendar                 Trading calendar
  ├── /community                Social features
  │   ├── /feed                 Community feed
  │   ├── /profile              User profile
  │   └── /groups               Trading communities
  ├── /macro                    Economic calendar
  ├── /news                     Market news
  ├── /sentiment                Market sentiment
  ├── /risk                     Risk management tools
  │   ├── /calculator           Lot calculator
  │   └── /dashboard            Risk dashboard
  ├── /indicators               Technical indicators
  ├── /alerts                   Notifications & alerts
  ├── /positions                Open positions (MT5 bridge)
  ├── /bot                      Trading bot settings
  ├── /settings                 User settings
  ├── /subscription             Subscription management
  └── /auth
      ├── /signin               Login page
      └── /signup               Registration page
```

### Key Components

**Dashboard**:

- Performance overview widget
- Recent trades list
- MT5 connection status
- Open positions snapshot
- Trading calendar mini
- Economic events upcoming
- Community feed
- Quick journal entry form

**Trading Journal**:

- Create trade form
- Trades table (sortable, filterable)
- Advanced search
- CSV import modal
- Trade details view
- Edit/delete actions
- Trade performance stats

**Analytics**:

- Performance metrics summary
- Strategy breakdown
- Pair performance
- Monthly/weekly/daily charts
- Win rate trend
- P&L curve
- Drawdown analysis

**Community Feed**:

- Post creation form
- Posts grid/list view
- Like/comment interactions
- User profiles
- Community groups
- Member list

**Risk Management**:

- Lot calculator form
- Risk per trade display
- Daily risk tracker
- Account heat gauge

---

## USER ROLES & PERMISSIONS

### Role Types

**Anonymous**:

- View public posts
- Browse economic calendar
- No trading features

**Free User**:

- Create trades (limited: 20/month)
- CSV import (1 per month)
- View analytics (basic)
- MT5 bridge (limited)
- Community features (read-only)

**Pro User**:

- Unlimited trades
- Unlimited CSV imports
- Advanced analytics
- Backtesting (5 runs/day)
- Community features (full)
- AI sentiment (30-day history)
- Priority support

**Institutional User**:

- Everything in Pro, plus:
- 50+ backtests/day
- Full API access
- Unlimited history
- White-label (future)
- Dedicated support
- Custom integrations

---

## SUBSCRIPTION TIERS

| Feature         | Free (7-day) | Pro       | Institutional |
| --------------- | ------------ | --------- | ------------- |
| Trading Journal | ✅           | ✅        | ✅            |
| CSV Import      | 1/mo         | Unlimited | Unlimited     |
| MT5 Live Bridge | ✅           | ✅        | ✅            |
| Analytics       | Basic        | Advanced  | Advanced+     |
| Backtesting     | 1/day        | 5/day     | 50/day        |
| Community       | Read-only    | Full      | Full          |
| Sentiment Data  | 7 days       | 30 days   | Unlimited     |
| API Access      | ❌           | ❌        | ✅            |
| Support         | Email        | Priority  | Dedicated     |
| Price           | Free trial   | $29/mo    | $99/mo        |

---

## SECURITY & COMPLIANCE

### Data Protection

**Encryption**:

- Credentials: AES-256 at rest
- Transit: TLS 1.3
- Separate key per environment

**Privacy**:

- No log passwords
- IP anonymization
- Data retention: 90 days for logs
- User deletion: Complete data removal

**Compliance**:

- GDPR aligned
- Privacy policy document
- Terms of service
- Cookie policy

### Authentication Security

- Password hashing: bcrypt (10+ rounds)
- JWT expiration: 24 hours
- Refresh token: 30 days
- Rate limiting: 100 req/min per IP
- Account lockout: 5 failed attempts → 15 min

### API Security

- CORS whitelisting
- CSRF protection tokens
- Input validation & sanitization
- SQL injection prevention (ORM)
- XSS protection (CSP headers)
- Rate limiting per endpoint

---

## PERFORMANCE REQUIREMENTS

### Frontend

| Metric                   | Target | Current |
| ------------------------ | ------ | ------- |
| First Contentful Paint   | <2s    | TBD     |
| Largest Contentful Paint | <2.5s  | TBD     |
| Time to Interactive      | <3.5s  | TBD     |
| Cumulative Layout Shift  | <0.1   | TBD     |

### Backend

| Metric                 | Target | Current |
| ---------------------- | ------ | ------- |
| API response (p95)     | <200ms | TBD     |
| Database query (p95)   | <100ms | TBD     |
| CSV import (1k trades) | <5s    | TBD     |
| Live data roundtrip    | <1s    | TBD     |

### Database

| Metric             | Target              | Current |
| ------------------ | ------------------- | ------- |
| Query optimization | Index coverage >90% | TBD     |
| Connection pool    | 20-50 concurrent    | TBD     |
| Backup time        | <5min               | TBD     |

---

## FEATURE ROADMAP

### Phase 1: MVP (Current)

✅ Trading journal CRUD  
✅ Multi-broker CSV import  
✅ Account management  
✅ Live MT5 bridge  
✅ Basic analytics  
✅ Community features  
✅ Risk calculator  
✅ Economic calendar

### Phase 2: Enhanced Analytics

- [ ] Backtesting engine (FXReplay)
- [ ] Advanced performance metrics
- [ ] Drawdown analysis
- [ ] Equity curve projection
- [ ] Trade replay visualization

### Phase 3: AI & Automation

- [ ] AI sentiment analysis (advanced)
- [ ] Trade recommendations
- [ ] Pattern recognition
- [ ] Automated journal entries
- [ ] Trading bot integration

### Phase 4: Enterprise

- [ ] Trade copier enhancement
- [ ] White-label platform
- [ ] Custom API limits
- [ ] Webhook integrations
- [ ] SSO integration
- [ ] Compliance reporting

### Phase 5: Future Enhancements

- [ ] Mobile app (React Native)
- [ ] Financial advisor network
- [ ] Managed account platform
- [ ] VPS hosting integration
- [ ] Signal service marketplace

---

## DEPLOYMENT & INFRASTRUCTURE

### Current Setup

**Local Development**:

- Docker Compose for all services
- PostgreSQL container
- Express backend container
- Next.js frontend container
- Python MT5 bridge container

**Environment Variables** (`.env`):

```
# Backend
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/tradekiller
NODE_ENV=development

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000

# MT5 Bridge
TRADE_MODE=local
LOCAL_MT5_URL=http://localhost:5003

# File Upload
MAX_FILE_SIZE=5242880 (5MB)
```

### Production Deployment

**Recommended Stack**:

- Frontend: Vercel or CloudFlare Pages
- Backend: Railway, Heroku, or AWS EC2
- Database: AWS RDS or Managed PostgreSQL
- Storage: AWS S3
- CDN: CloudFlare

**Deployment Commands**:

```bash
# Backend
npm install
npm run build
npm run start

# Frontend
npm install
npm run build
npm run start

# Python Bridge
pip install -r requirements.txt
python mt5_bridge.py
```

---

## SUCCESS METRICS

### User Engagement

- Daily active users (DAU)
- Monthly active users (MAU)
- Trades logged per user
- Community posts per user
- Feature adoption rate

### Performance

- API response time
- Page load time
- Feature availability uptime
- Error rate

### Business

- Subscription conversion rate
- Monthly recurring revenue (MRR)
- Churn rate
- Customer acquisition cost (CAC)
- Lifetime value (LTV)

---

## GLOSSARY

| Term          | Definition                          |
| ------------- | ----------------------------------- |
| MT5           | MetaTrader 5 trading terminal       |
| CSV           | Comma-separated values file format  |
| Pip           | Percentage in point (forex unit)    |
| SL            | Stop loss (price limit)             |
| TP            | Take profit (price target)          |
| RR            | Risk/Reward ratio                   |
| P&L           | Profit and loss                     |
| Win Rate      | Percentage of profitable trades     |
| Profit Factor | Gross profit / Gross loss           |
| Drawdown      | Peak-to-trough decline              |
| Backtesting   | Testing strategy on historical data |
| JSON          | JavaScript Object Notation          |
| API           | Application Programming Interface   |
| JWT           | JSON Web Token                      |
| CORS          | Cross-Origin Resource Sharing       |

---

## APPENDIX: CONTACT & SUPPORT

**Development Team**: [Team info]  
**Documentation**: Built with Markdown  
**Last Updated**: April 7, 2026  
**Version**: 1.0

---

**END OF PRD**
