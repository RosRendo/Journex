import { Trade, TradingAccount, Strategy } from '../../types/trade';

const strategies: Strategy[] = [
  { id: 's1', name: 'Breakout', description: 'Price breaks key level with volume' },
  { id: 's2', name: 'Pullback', description: 'Entry on retracement to support' },
  { id: 's3', name: 'Scalp', description: 'Quick in-and-out trades' },
  { id: 's4', name: 'Trend Follow', description: 'Follow the dominant trend' },
  { id: 's5', name: 'Reversal', description: 'Counter-trend at key levels' },
];

const symbols = ['EURUSD', 'GBPUSD', 'BTCUSD', 'XAUUSD', 'NAS100', 'SPX500', 'USDJPY', 'AAPL', 'TSLA'];
const tagOptions = ['A+ Setup', 'Revenge Trade', 'Mistake', 'News Event', 'Pre-market', 'Overtraded'];

function rand(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function generateTrades(): Trade[] {
  const trades: Trade[] = [];
  const now = new Date();

  for (let i = 0; i < 65; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    const direction = Math.random() > 0.45 ? 'long' : 'short';
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const isWin = Math.random() > 0.42;
    const entryPrice = rand(1, 50000);
    const pnlAmount = isWin ? rand(50, 800) : rand(-600, -30);
    const exitPrice = direction === 'long'
      ? entryPrice + (pnlAmount / rand(0.1, 2))
      : entryPrice - (pnlAmount / rand(0.1, 2));

    trades.push({
      id: `t${i + 1}`,
      symbol,
      direction,
      entryPrice,
      exitPrice: Math.abs(exitPrice),
      stopLoss: direction === 'long' ? entryPrice - rand(10, 100) : entryPrice + rand(10, 100),
      takeProfit: direction === 'long' ? entryPrice + rand(20, 200) : entryPrice - rand(20, 200),
      lotSize: rand(0.01, 2),
      pnl: pnlAmount,
      riskRewardRatio: isWin ? rand(1, 4) : rand(0.2, 0.9),
      strategyTag: strategies[Math.floor(Math.random() * strategies.length)].name,
      note: '',
      tags: Math.random() > 0.6 ? [tagOptions[Math.floor(Math.random() * tagOptions.length)]] : [],
      date: date.toISOString().split('T')[0],
      createdAt: date.toISOString(),
    });
  }

  return trades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export const mockTrades: Trade[] = generateTrades();

export const mockAccount: TradingAccount = {
  id: 'acc1',
  name: 'Main Account',
  broker: 'FTMO',
  balance: 52480.50,
  initialBalance: 50000,
  createdAt: '2024-01-01',
};

export const mockStrategies = strategies;
export const mockTags = tagOptions;
