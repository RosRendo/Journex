import { Trade, PerformanceMetrics, DailyPnl } from '@/types/trade';

export function calculateMetrics(trades: Trade[]): PerformanceMetrics {
  if (trades.length === 0) {
    return {
      totalTrades: 0, winRate: 0, profitFactor: 0, averageWin: 0, averageLoss: 0,
      averageRR: 0, maxDrawdown: 0, expectancy: 0, totalPnl: 0, bestTrade: 0,
      worstTrade: 0, winningStreak: 0, losingStreak: 0,
    };
  }

  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));

  // Streaks
  let maxWin = 0, maxLoss = 0, curWin = 0, curLoss = 0;
  for (const t of trades) {
    if (t.pnl > 0) { curWin++; curLoss = 0; maxWin = Math.max(maxWin, curWin); }
    else { curLoss++; curWin = 0; maxLoss = Math.max(maxLoss, curLoss); }
  }

  // Max drawdown
  let peak = 0, dd = 0, maxDd = 0;
  let cumPnl = 0;
  for (const t of [...trades].reverse()) {
    cumPnl += t.pnl;
    peak = Math.max(peak, cumPnl);
    dd = peak - cumPnl;
    maxDd = Math.max(maxDd, dd);
  }

  return {
    totalTrades: trades.length,
    winRate: (wins.length / trades.length) * 100,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    averageWin: wins.length > 0 ? grossProfit / wins.length : 0,
    averageLoss: losses.length > 0 ? grossLoss / losses.length : 0,
    averageRR: trades.reduce((s, t) => s + t.riskRewardRatio, 0) / trades.length,
    maxDrawdown: maxDd,
    expectancy: totalPnl / trades.length,
    totalPnl,
    bestTrade: Math.max(...trades.map(t => t.pnl)),
    worstTrade: Math.min(...trades.map(t => t.pnl)),
    winningStreak: maxWin,
    losingStreak: maxLoss,
  };
}

export function getDailyPnl(trades: Trade[]): DailyPnl[] {
  const map = new Map<string, { pnl: number; trades: number }>();
  for (const t of trades) {
    const existing = map.get(t.date) || { pnl: 0, trades: 0 };
    existing.pnl += t.pnl;
    existing.trades += 1;
    map.set(t.date, existing);
  }
  return Array.from(map.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getEquityCurve(trades: Trade[], startBalance: number): { date: string; balance: number }[] {
  const daily = getDailyPnl(trades);
  let balance = startBalance;
  return daily.map(d => {
    balance += d.pnl;
    return { date: d.date, balance: Math.round(balance * 100) / 100 };
  });
}

export function getStrategyStats(trades: Trade[]) {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    const arr = map.get(t.strategyTag) || [];
    arr.push(t);
    map.set(t.strategyTag, arr);
  }
  return Array.from(map.entries()).map(([name, tr]) => ({
    name,
    trades: tr.length,
    winRate: (tr.filter(t => t.pnl > 0).length / tr.length) * 100,
    pnl: tr.reduce((s, t) => s + t.pnl, 0),
  }));
}

export function getSymbolStats(trades: Trade[]) {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    const arr = map.get(t.symbol) || [];
    arr.push(t);
    map.set(t.symbol, arr);
  }
  return Array.from(map.entries()).map(([symbol, tr]) => ({
    symbol,
    trades: tr.length,
    pnl: tr.reduce((s, t) => s + t.pnl, 0),
    winRate: (tr.filter(t => t.pnl > 0).length / tr.length) * 100,
  })).sort((a, b) => b.pnl - a.pnl);
}
