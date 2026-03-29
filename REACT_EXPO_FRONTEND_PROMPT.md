# React Expo Trading Dashboard - Frontend Prompt (CONDENSED)

## PROJECT OVERVIEW

Build a React Expo mobile app for TradeKiller Pro. Features: trade journal, live MT5 monitoring, analytics, CSV import, community feed, real-time alerts, position sizing calculator.

## TECH STACK

- React Native 0.73+, Expo 50+, TypeScript, React Navigation 6
- Redux Toolkit, React Hook Form, Axios, Socket.io-client
- AsyncStorage, React Native Paper, react-native-chart-kit

## SCREENS (Bottom Tab Navigation)

1. **HOME** - Dashboard with MT5 balance, today's P&L, recent trades
2. **JOURNAL** - Trade list, create/edit form, CSV import, filters
3. **STATS** - Win rate, equity curve, strategy breakdown tables
4. **BOT** - Live MT5 account, open positions, alerts history
5. **COMMUNITY** - Feed, create post, profile, communities
6. **SETTINGS** - Preferences, accounts, notifications, logout

## KEY COMPONENTS (20+)

Common: Header, Button, Input, Card, Spinner, Modal, BottomSheet
Journal: TradeCard, TradeForm, FilterBar, CsvUpload
Analytics: StatCard, PerformanceChart, CalendarHeatmap, StrategyTable
Community: PostCard, CommentList, UserAvatar
Bot: BalanceCard, PositionCard, AlertCard

## CUSTOM HOOKS (10+)

- `useApi()` - Generic API requests with caching
- `useTrades()` - Trade CRUD with pagination
- `useWebSocket()` - Real-time MT5 updates
- `useMT5Connection()` - Live account data
- `useAuthContext()` - Auth state
- `useLocalStorage()` - AsyncStorage wrapper
- `useInfiniteScroll()` - Pagination
- `useNotifications()` - Push notifications
- `useCamera()` - Photo capture

## REDUX STATE (5 Slices)

- **authSlice**: user, token, isAuthenticated
- **tradesSlice**: trades[], filters, pagination
- **analyticsSlice**: metrics, charts data
- **botSlice**: connected, balance, positions[], margin
- **communitySlice**: posts[], comments, likes

## API ENDPOINTS

```
Auth: POST /auth/login, /register, /logout
Trades: GET/POST/PUT/DELETE /trades
CSV: POST /csv/upload, GET /csv/imports
Community: POST/GET /community/posts, /likes, /comments
Account: POST /upload/image, GET /calendar/data
```

## WEBSOCKET EVENTS

```
MT5_BALANCE_UPDATE, MT5_POSITION_OPENED/CLOSED
ALERT_TRIGGERED, NEWS_UPDATE, COMMUNITY_UPDATE
```

## KEY SCREENS DETAILS

### CREATE TRADE FORM

Sections: Date & Time | Pair/Direction/Strategy | Entry/SL/TP (auto RR calc) | Lot size (auto risk $) | Outcome | Notes & Image

### ANALYTICS DASHBOARD

Main metrics (Win Rate, Profit Factor, Avg Win/Loss) | Equity curve chart | Pie chart (wins vs losses) | Strategy table | Pair performance table

### LIVE MT5

Connection status | Balance/Equity large display | Free Margin, Margin Level | Open positions list | Auto-refresh every 5s

### COMMUNITY FEED

Infinite scroll | Posts: avatar, content, pair, image, likes/comments | Like/comment buttons | Tap post → detail view

## BEST PRACTICES

1. TypeScript strict mode
2. Functional components + hooks only
3. Redux for global state
4. UTC validation on all inputs
5. Error handling + user-friendly messages
6. Offline caching with AsyncStorage
7. Images: lazy load, compress <500KB
8. Performance: FlatList with removeClippedSubviews
9. Security: JWT in SecureStore, HTTPS only
10. Testing: Unit, component, integration, E2E

## BUILD & DEPLOYMENT

```
Development: expo start, expo start --ios/android
Build: eas build --platform ios/android
Test: npm test
Submit: eas submit --platform ios/android
```

## DELIVERABLES

✅ 6 tab screens, 4 stack navigators, 20+ components, 10+ hooks
✅ Redux store with 5 slices, API layer, offline sync
✅ Form validation, image upload, camera integration
✅ Real-time WebSocket, push notifications
✅ Unit + E2E tests, production build

**Status**: Ready | **Time**: 8-12 weeks | **Complexity**: High
