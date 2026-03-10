// types/trading.ts

export interface LiveDataItem {
  platform: string;
  server: string;
  profile: string;
  bid: number;
  ask: number;
  bidSpread: number;
  askSpread: number;
  totalSpread: number;
}

export interface CandlestickData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FormattedCandlestickData extends CandlestickData {
  time: string;
  isGreen: boolean;
  bodyHeight: number;
  rsi?: number;
  macd?: number;
  signal?: number;
  sma20?: number;
  sma50?: number;
  bb_upper?: number;
  bb_lower?: number;
  bb_middle?: number;
}

export interface IndicatorConfig {
  name: string;
  enabled: boolean;
  color: string;
  type: 'overlay' | 'oscillator';
}

export interface WebSocketMessage {
  type: 'initial' | 'liveUpdate' | 'candlestickUpdate';
  liveData?: LiveDataItem[];
  candlestickData?: CandlestickData[];
  data?: LiveDataItem[] | CandlestickData[];
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

// Component Props Types
export interface HeaderProps {
  currentPrice: number | null;
  priceChange: number;
  connectionStatus: ConnectionStatus;
  showSettings: boolean;
  onToggleSettings: () => void;
}

export interface LiveSpreadsProps {
  liveData: LiveDataItem[];
  lastUpdate: Date | null;
}

export interface SettingsPanelProps {
  indicators: IndicatorConfig[];
  onToggleIndicator: (index: number) => void;
  isVisible: boolean;
}

export interface PriceChartProps {
  data: FormattedCandlestickData[];
  indicators: IndicatorConfig[];
}

export interface VolumeChartProps {
  data: FormattedCandlestickData[];
}

export interface OscillatorChartsProps {
  data: FormattedCandlestickData[];
  indicators: IndicatorConfig[];
}

// Technical Analysis Types
export interface TechnicalIndicators {
  sma20: number[];
  sma50: number[];
  rsi: number[];
  macd: number[];
  signal: number[];
  bb_upper: number[];
  bb_middle: number[];
  bb_lower: number[];
}

export interface MarketStats {
  bestSpread: number;
  avgSpread: number;
  bestBid: number;
  bestAsk: number;
  totalVolume: number;
  bullishPeriods: number;
  bearishPeriods: number;
}

// Hook Types
export interface UseTradingDataReturn {
  liveData: LiveDataItem[];
  candlestickData: CandlestickData[];
  formattedData: FormattedCandlestickData[];
  connectionStatus: ConnectionStatus;
  lastUpdate: Date | null;
  error: string | null;
  currentPrice: number | null;
  priceChange: number;
}

export interface UseWebSocketReturn {
  connectionStatus: ConnectionStatus;
  lastUpdate: Date | null;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
}

// Chart Animation Types
export interface AnimationConfig {
  duration: number;
  easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  delay?: number;
}

export interface ChartTheme {
  background: string;
  gridColor: string;
  textColor: string;
  primaryColor: string;
  successColor: string;
  errorColor: string;
  warningColor: string;
}