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
