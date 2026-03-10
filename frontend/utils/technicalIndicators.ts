// utils/technicalIndicators.ts

/**
 * Calculate Simple Moving Average (SMA)
 */
export const calculateSMA = (data: number[], period: number): (number | null)[] => {
  const sma: (number | null)[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  
  return sma;
};

/**
 * Calculate Exponential Moving Average (EMA)
 */
export const calculateEMA = (data: (number | null)[], period: number): (number | null)[] => {
  const ema: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  
  // Filter out null values for calculation
  const validData = data.filter(val => val !== null) as number[];
  
  for (let i = 0; i < validData.length; i++) {
    if (i === 0) {
      ema.push(validData[i]);
    } else {
      const prevEma = ema[i - 1];
      if (prevEma !== null) {
        ema.push((validData[i] * multiplier) + (prevEma * (1 - multiplier)));
      } else {
        ema.push(validData[i]);
      }
    }
  }
  
  // Pad with nulls to match original data length
  while (ema.length < data.length) {
    ema.unshift(null);
  }
  
  return ema;
};

/**
 * Calculate Relative Strength Index (RSI)
 */
export const calculateRSI = (prices: number[], period: number = 14): (number | null)[] => {
  const rsi: (number | null)[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // Calculate RSI
  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) {
      rsi.push(null);
    } else {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
  }

  return [null, ...rsi]; // Add null for first price (no change to calculate)
};

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export const calculateMACD = (
  prices: number[], 
  fastPeriod: number = 12, 
  slowPeriod: number = 26, 
  signalPeriod: number = 9
): { macd: (number | null)[], signal: (number | null)[], histogram: (number | null)[] } => {
  const emaFast = calculateEMA(prices, fastPeriod);
  const emaSlow = calculateEMA(prices, slowPeriod);
  
  // Calculate MACD line
  const macd = emaFast.map((fast, i) => {
    const slow = emaSlow[i];
    return (fast !== null && slow !== null) ? fast - slow : null;
  });
  
  // Calculate Signal line (EMA of MACD)
  const validMacd = macd.filter(val => val !== null) as number[];
  const signalEma = calculateEMA(validMacd, signalPeriod);
  
  // Align signal line with MACD line
  const signal: (number | null)[] = [];
  let signalIndex = 0;
  
  for (let i = 0; i < macd.length; i++) {
    if (macd[i] !== null) {
      signal.push(signalEma[signalIndex] || null);
      signalIndex++;
    } else {
      signal.push(null);
    }
  }
  
  // Calculate Histogram
  const histogram = macd.map((macdVal, i) => {
    const signalVal = signal[i];
    return (macdVal !== null && signalVal !== null) ? macdVal - signalVal : null;
  });
  
  return { macd, signal, histogram };
};

/**
 * Calculate Bollinger Bands
 */
export const calculateBollingerBands = (
  prices: number[], 
  period: number = 20, 
  standardDeviations: number = 2
): { upper: (number | null)[], middle: (number | null)[], lower: (number | null)[] } => {
  const middle = calculateSMA(prices, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1 || middle[i] === null) {
      upper.push(null);
      lower.push(null);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = middle[i] as number;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      
      upper.push(mean + (standardDeviations * stdDev));
      lower.push(mean - (standardDeviations * stdDev));
    }
  }
  
  return { upper, middle, lower };
};

/**
 * Calculate Stochastic Oscillator
 */
export const calculateStochastic = (
  highs: number[], 
  lows: number[], 
  closes: number[], 
  kPeriod: number = 14, 
  dPeriod: number = 3
): { k: (number | null)[], d: (number | null)[] } => {
  const k: (number | null)[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) {
      k.push(null);
    } else {
      const highestHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
      const lowestLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
      const currentClose = closes[i];
      
      if (highestHigh === lowestLow) {
        k.push(50); // Avoid division by zero
      } else {
        k.push(((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100);
      }
    }
  }
  
  // Calculate %D (SMA of %K)
  const validK = k.filter(val => val !== null) as number[];
  const dSMA = calculateSMA(validK, dPeriod);
  
  // Align %D with %K
  const d: (number | null)[] = [];
  let dIndex = 0;
  
  for (let i = 0; i < k.length; i++) {
    if (k[i] !== null) {
      d.push(dSMA[dIndex] || null);
      dIndex++;
    } else {
      d.push(null);
    }
  }
  
  return { k, d };
};

/**
 * Calculate Average True Range (ATR)
 */
export const calculateATR = (
  highs: number[], 
  lows: number[], 
  closes: number[], 
  period: number = 14
): (number | null)[] => {
  const trueRanges: number[] = [];
  
  for (let i = 1; i < highs.length; i++) {
    const high = highs[i];
    const low = lows[i];
    const prevClose = closes[i - 1];
    
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  const atr = calculateSMA(trueRanges, period);
  return [null, ...atr]; // Add null for first candle
};

/**
 * Calculate Williams %R
 */
export const calculateWilliamsR = (
  highs: number[], 
  lows: number[], 
  closes: number[], 
  period: number = 14
): (number | null)[] => {
  const williamsR: (number | null)[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      williamsR.push(null);
    } else {
      const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1));
      const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1));
      const currentClose = closes[i];
      
      if (highestHigh === lowestLow) {
        williamsR.push(-50); // Avoid division by zero
      } else {
        williamsR.push(((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100);
      }
    }
  }
  
  return williamsR;
};

/**
 * Detect support and resistance levels
 */
export const detectSupportResistance = (
  highs: number[], 
  lows: number[], 
  lookback: number = 20
): { support: number[], resistance: number[] } => {
  const support: number[] = [];
  const resistance: number[] = [];
  
  for (let i = lookback; i < highs.length - lookback; i++) {
    const currentHigh = highs[i];
    const currentLow = lows[i];
    
    // Check for resistance (local high)
    const leftHighs = highs.slice(i - lookback, i);
    const rightHighs = highs.slice(i + 1, i + lookback + 1);
    
    if (leftHighs.every(h => h <= currentHigh) && rightHighs.every(h => h <= currentHigh)) {
      resistance.push(currentHigh);
    }
    
    // Check for support (local low)
    const leftLows = lows.slice(i - lookback, i);
    const rightLows = lows.slice(i + 1, i + lookback + 1);
    
    if (leftLows.every(l => l >= currentLow) && rightLows.every(l => l >= currentLow)) {
      support.push(currentLow);
    }
  }
  
  return { support, resistance };
};

/**
 * Calculate Rate of Change (ROC)
 */
export const calculateROC = (prices: number[], period: number = 12): (number | null)[] => {
  const roc: (number | null)[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      roc.push(null);
    } else {
      const currentPrice = prices[i];
      const pastPrice = prices[i - period];
      
      if (pastPrice === 0) {
        roc.push(null);
      } else {
        roc.push(((currentPrice - pastPrice) / pastPrice) * 100);
      }
    }
  }
  
  return roc;
};