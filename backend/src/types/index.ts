export interface TradeInput {
  date: string;
  pair: string;
  strategy: string;
  setupType: string;
  entry: number;
  sl: number;
  tp: number;
  rr: string;
  outcome: string;
  notes?: string;
  imageUrl?: string;
  direction?: string;
  profit?: number;
  lotSize?: number;
  emotion?: string;
  followedPlan?: boolean;
  planDeviationReason?: string;
  checklistPassed?: boolean;
}

export interface AccountInput {
  brokerName: string;
  accountNumber: string;
  apiKey?: string;
  apiSecret?: string;
  mt5Password?: string;
  mt5Server?: string;
  isMaster?: boolean;
  copierEnabled?: boolean;
  copierMultiplier?: number;
  balance?: number;
  equity?: number;
}

export interface CalendarDay {
  date: string;
  tradesCount: number;
  netProfitLoss: number;
  wins: number;
  losses: number;
}

