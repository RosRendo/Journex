export interface Trade {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  pnl: number;
  riskRewardRatio: number;
  strategyTag: string;
  note: string;
  tags: string[];
  date: string; // ISO date
  createdAt: string;
}

export interface TradingAccount {
  id: string;
  name: string;
  broker: string;
  balance: number;
  initialBalance: number;
  createdAt: string;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
}

export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  averageRR: number;
  maxDrawdown: number;
  expectancy: number;
  totalPnl: number;
  bestTrade: number;
  worstTrade: number;
  winningStreak: number;
  losingStreak: number;
}

export interface DailyPnl {
  date: string;
  pnl: number;
  trades: number;
}
