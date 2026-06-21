"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Chart from 'chart.js';

// Register Chart.js components
Chart.Chart.register(
  Chart.CategoryScale,
  Chart.LinearScale,
  Chart.PointElement,
  Chart.LineElement,
  Chart.Title,
  Chart.Tooltip,
  Chart.Legend,
  Chart.Filler
);

// Type definitions
interface MarketData {
  price: number;
  bid: number;
  ask: number;
  spread: number;
  timestamp: Date;
  platforms: number;
}

interface PriceHistoryItem {
  price: number;
  time: Date;
}

interface TechnicalIndicators {
  sma10: string;
  sma20: string;
  rsi: string;
  volatility: string;
}

interface Recommendation {
  signal: string;
  confidence: number | string;
  reasoning: string;
  riskLevel: string;
  technicals: TechnicalIndicators;
}

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: string;
}

interface APIResponse {
  success: boolean;
  data: {
    bid: number;
    ask: number;
    totalSpread: number;
    timestamp: string;
  }[];
}

const AITradingAssistant: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [currentData, setCurrentData] = useState<MarketData | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([]);
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation>({
    signal: 'ANALYZING...',
    confidence: '--',
    reasoning: 'Initializing AI analysis engine... Please wait while we gather market data and perform technical analysis.',
    riskLevel: '--',
    technicals: {
      sma10: '',
      sma20: '',
      rsi: '',
      volatility: ''
    }
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoTrade, setAutoTrade] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart.Chart | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize chart
  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        chartInstance.current = new Chart.Chart(ctx, {
          type: 'line',
          data: {
            labels: [],
            datasets: [{
              label: 'XAU/USD Price',
              data: [],
              borderColor: '#667eea',
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: '#667eea'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: false,
                grid: {
                  color: 'rgba(0,0,0,0.1)'
                }
              },
              x: {
                grid: {
                  color: 'rgba(0,0,0,0.1)'
                }
              }
            },
            animation: {
              duration: 500
            }
          }
        });
      }
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, []);

  // Update chart when price history changes
  useEffect(() => {
    if (chartInstance.current && priceHistory.length > 0) {
      const labels = priceHistory.map(item => 
        item.time.toLocaleTimeString('en-US', { 
          hour12: false, 
          minute: '2-digit', 
          second: '2-digit' 
        })
      );
      const prices = priceHistory.map(item => item.price);

      chartInstance.current.data.labels = labels;
      chartInstance.current.data.datasets[0].data = prices;
      chartInstance.current.update('none');
    }
  }, [priceHistory]);

  const addLog = useCallback((message: string, type: string = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog: LogEntry = {
      id: Date.now(),
      timestamp,
      message,
      type
    };
    
    setLogs(prevLogs => {
      const updatedLogs = [...prevLogs, newLog];
      return updatedLogs.slice(-100); // Keep only last 100 entries
    });
  }, []);

  const fetchMarketData = useCallback(async () => {
    try {
      const response = await fetch('https://api-free-xauusd.onrender.com/api/live-data');
      const data: APIResponse = await response.json();
      
      if (data.success && data.data.length > 0) {
        processMarketData(data.data);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog('Error fetching data: ' + errorMessage, 'error');
    }
  }, [addLog]);

  const processMarketData = useCallback((marketData: APIResponse['data']) => {
    const primaryData = marketData[0];
    const midPrice = (primaryData.bid + primaryData.ask) / 2;
    
    const newData: MarketData = {
      price: midPrice,
      bid: primaryData.bid,
      ask: primaryData.ask,
      spread: primaryData.totalSpread,
      timestamp: new Date(primaryData.timestamp),
      platforms: marketData.length
    };

    setCurrentData(newData);
    setPreviousPrice(prev => currentData?.price || prev);

    setPriceHistory(prev => {
      const updated = [...prev, {
        price: midPrice,
        time: newData.timestamp
      }];
      return updated.slice(-50); // Keep last 50 points
    });

    // Trigger AI analysis after updating data
    setTimeout(() => performAIAnalysis(newData, priceHistory), 100);
  }, [currentData, priceHistory]);

  const calculateSMA = (prices: number[], period: number): number => {
    if (prices.length < period) return prices[prices.length - 1];
    const slice = prices.slice(-period);
    return slice.reduce((sum: number, price: number) => sum + price, 0) / period;
  };

  const calculateRSI = (prices: number[], period: number = 14): number => {
    if (prices.length < period + 1) return 50;
    
    const changes: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    const gains = changes.slice(-period).filter(change => change > 0);
    const losses = changes.slice(-period).filter(change => change < 0).map(loss => Math.abs(loss));
    
    const avgGain = gains.length > 0 ? gains.reduce((sum, gain) => sum + gain, 0) / period : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((sum, loss) => sum + loss, 0) / period : 0;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  const calculateVolatility = (history: PriceHistoryItem[]): number => {
    if (history.length < 2) return 0;
    
    const returns: number[] = [];
    for (let i = 1; i < history.length; i++) {
      const return_ = (history[i].price - history[i-1].price) / history[i-1].price;
      returns.push(return_);
    }
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  };

  const performAIAnalysis = useCallback((data: MarketData, history: PriceHistoryItem[]) => {
    if (history.length < 10) return;

    setAiLoading(true);
    
    setTimeout(() => {
      const prices = history.map((item: PriceHistoryItem) => item.price);
      const currentPrice = prices[prices.length - 1];
      
      const sma10 = calculateSMA(prices, 10);
      const sma20 = calculateSMA(prices, 20);
      const rsi = calculateRSI(prices, 14);
      const volatility = calculateVolatility(history);
      
      let signal = 'HOLD';
      let confidence = 50;
      let reasoning = '';
      let riskLevel = 'MEDIUM';
      
      const trendUp = sma10 > sma20 && currentPrice > sma10;
      const trendDown = sma10 < sma20 && currentPrice < sma10;
      const oversold = rsi < 30;
      const overbought = rsi > 70;
              
      if (trendUp && !overbought && volatility < 15) {
        signal = 'BUY';
        confidence = Math.min(85, 60 + (sma10 - sma20) / currentPrice * 1000);
        reasoning = `Strong upward trend detected. Price above SMA(10): $${sma10.toFixed(3)}, RSI: ${rsi.toFixed(1)} indicates healthy momentum. Low volatility suggests stable trend.`;
        riskLevel = volatility > 10 ? 'MEDIUM' : 'LOW';
      } else if (trendDown && !oversold && volatility < 15) {
        signal = 'SELL';
        confidence = Math.min(85, 60 + (sma20 - sma10) / currentPrice * 1000);
        reasoning = `Bearish trend confirmed. Price below SMA(10): $${sma10.toFixed(3)}, RSI: ${rsi.toFixed(1)} shows downward momentum. Consider short position.`;
        riskLevel = volatility > 10 ? 'MEDIUM' : 'LOW';
      } else if (oversold && volatility < 20) {
        signal = 'BUY';
        confidence = 70;
        reasoning = `Oversold conditions detected (RSI: ${rsi.toFixed(1)}). Potential reversal opportunity with managed risk.`;
        riskLevel = 'MEDIUM';
      } else if (overbought && volatility < 20) {
        signal = 'SELL';
        confidence = 70;
        reasoning = `Overbought market conditions (RSI: ${rsi.toFixed(1)}). Consider taking profits or short entry.`;
        riskLevel = 'MEDIUM';
      } else {
        reasoning = `Mixed signals detected. SMA(10): $${sma10.toFixed(3)}, SMA(20): $${sma20.toFixed(3)}, RSI: ${rsi.toFixed(1)}. High volatility (${volatility.toFixed(1)}%) suggests waiting for clearer signals.`;
        riskLevel = volatility > 20 ? 'HIGH' : 'MEDIUM';
      }

      setRecommendation({
        signal,
        confidence,
        reasoning,
        riskLevel,
        technicals: {
          sma10: sma10.toFixed(3),
          sma20: sma20.toFixed(3),
          rsi: rsi.toFixed(1),
          volatility: volatility.toFixed(1)
        }
      });

      if (autoTrade) {
        addLog(`AI Recommendation: ${signal} - Confidence: ${confidence.toFixed(0)}%`, 'success');
      }

      setAiLoading(false);
    }, 1500);
  }, [autoTrade, addLog]);

  // Connection management
  useEffect(() => {
    if (isConnected) {
      intervalRef.current = setInterval(() => {
        fetchMarketData();
      }, 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isConnected, fetchMarketData]);

  const toggleConnection = () => {
    if (isConnected) {
      setIsConnected(false);
      addLog('Trading analysis stopped.', 'error');
    } else {
      setIsConnected(true);
      addLog('AI Trading Assistant activated. Beginning market analysis...', 'success');
      fetchMarketData();
    }
  };

  const clearLog = () => {
    setLogs([]);
  };

  // Auto-start connection
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsConnected(true);
      addLog('AI Trading Assistant activated. Beginning market analysis...', 'success');
      fetchMarketData();
    }, 1000);

    return () => clearTimeout(timer);
  }, [addLog, fetchMarketData]);

  // Calculate price change
  const priceChange = currentData && previousPrice ? {
    value: currentData.price - previousPrice,
    percent: ((currentData.price - previousPrice) / previousPrice * 100)
  } : null;

  const volatility = priceHistory.length > 10 ? calculateVolatility(priceHistory) : 0;
  const target = currentData ? currentData.price * (recommendation.signal === 'BUY' ? 1.002 : 0.998) : 0;

  return (
    <div style={{
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: '#333',
      margin: 0,
      padding: 0
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '20px'
      }}>
        {/* Header */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '20px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h1 style={{
            color: 'white',
            fontSize: '2.5rem',
            marginBottom: '10px',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            🤖 AI Trading Assistant
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.9)' }}>
            Real-time XAU/USD Analysis & Trading Recommendations
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '10px 20px',
            borderRadius: '25px',
            marginTop: '10px'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: isConnected ? '#2ed573' : '#ff4757',
              boxShadow: isConnected ? '0 0 10px rgba(46, 213, 115, 0.5)' : 'none',
              transition: 'all 0.3s ease'
            }} />
            <span style={{ color: 'white' }}>
              {isConnected ? 'Connected - Live Data' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Main Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth > 768 ? '1fr 1fr' : '1fr',
          gap: '20px',
          marginBottom: '20px'
        }}>
          {/* Market Data Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '20px',
            padding: '25px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ marginBottom: '20px' }}>📊 Live Market Data</h2>
            
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                fontSize: '3rem',
                fontWeight: 'bold',
                color: '#2c3e50',
                marginBottom: '10px'
              }}>
                {currentData ? `$${currentData.price.toFixed(3)}` : 'Loading...'}
              </div>
              {priceChange && (
                <div style={{
                  fontSize: '1.2rem',
                  padding: '8px 16px',
                  borderRadius: '25px',
                  display: 'inline-block',
                  background: priceChange.value >= 0 ? '#d4edda' : '#f8d7da',
                  color: priceChange.value >= 0 ? '#155724' : '#721c24'
                }}>
                  {priceChange.value >= 0 ? '+' : ''}{priceChange.value.toFixed(3)} ({priceChange.percent.toFixed(2)}%)
                </div>
              )}
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px',
              margin: '20px 0'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '15px',
                borderRadius: '10px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '5px' }}>
                  {currentData ? `$${currentData.bid.toFixed(3)}` : '--'}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Bid Price</div>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '15px',
                borderRadius: '10px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '5px' }}>
                  {currentData ? `$${currentData.ask.toFixed(3)}` : '--'}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Ask Price</div>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '15px',
                borderRadius: '10px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '5px' }}>
                  {currentData ? `${currentData.spread.toFixed(1)} pips` : '--'}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Spread</div>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '15px',
                borderRadius: '10px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '5px' }}>
                  {volatility > 0 ? `${volatility.toFixed(2)}%` : '--'}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Volatility</div>
              </div>
            </div>

            <div style={{ position: 'relative', height: '300px', margin: '20px 0' }}>
              <canvas ref={chartRef} />
            </div>
          </div>

          {/* AI Recommendation Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '20px',
            padding: '25px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)'
          }}>
            <h2 style={{ marginBottom: '20px' }}>🧠 AI Recommendation</h2>
            
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '15px',
              padding: '20px',
              margin: '20px 0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '15px',
                fontSize: '1.3rem',
                fontWeight: 'bold'
              }}>
                <span>🎯</span>
                <span>Smart Trading Signal</span>
                {aiLoading && (
                  <div style={{
                    display: 'inline-block',
                    width: '20px',
                    height: '20px',
                    border: '3px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '50%',
                    borderTopColor: '#fff',
                    animation: 'spin 1s ease-in-out infinite'
                  }} />
                )}
              </div>
              <div style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                marginBottom: '10px',
                textTransform: 'uppercase',
                color: recommendation.signal === 'BUY' ? '#2ed573' : 
                       recommendation.signal === 'SELL' ? '#ff4757' : '#ffa502'
              }}>
                {recommendation.signal}
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '15px',
                borderRadius: '10px',
                marginTop: '15px',
                lineHeight: '1.6'
              }}>
                <strong>Analysis:</strong> {recommendation.reasoning}<br /><br />
                {recommendation.technicals.sma10 && (
                  <>
                    <strong>Technical Indicators:</strong><br />
                    • SMA(10): ${recommendation.technicals.sma10}<br />
                    • SMA(20): ${recommendation.technicals.sma20}<br />
                    • RSI(14): {recommendation.technicals.rsi}<br />
                    • Volatility: {recommendation.technicals.volatility}%
                  </>
                )}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px',
              margin: '20px 0'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '15px',
                borderRadius: '10px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '5px' }}>
                  {typeof recommendation.confidence === 'number' ? `${recommendation.confidence.toFixed(0)}%` : recommendation.confidence}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Confidence</div>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '15px',
                borderRadius: '10px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '5px' }}>
                  {recommendation.riskLevel}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Risk Level</div>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '15px',
                borderRadius: '10px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '5px' }}>
                  Short-term
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Time Frame</div>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '15px',
                borderRadius: '10px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '5px' }}>
                  {target > 0 ? `$${target.toFixed(3)}` : '--'}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Target</div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls and Log */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          padding: '25px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            display: 'flex',
            gap: '15px',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={toggleConnection}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '25px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '1rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}
            >
              {isConnected ? 'Stop Analysis' : 'Start Analysis'}
            </button>
            <button
              onClick={clearLog}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '25px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '1rem',
                background: 'linear-gradient(135deg, #ff4757 0%, #c44569 100%)',
                color: 'white'
              }}
            >
              Clear Log
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={autoTrade}
                onChange={(e) => setAutoTrade(e.target.checked)}
              />
              Auto-recommendations
            </label>
          </div>
          
          <h3 style={{ marginBottom: '15px' }}>📋 Trading Log</h3>
          <div style={{
            height: '200px',
            overflowY: 'auto',
            background: '#2c3e50',
            color: '#ecf0f1',
            padding: '15px',
            borderRadius: '10px',
            fontFamily: "'Consolas', monospace",
            fontSize: '0.9rem',
            lineHeight: '1.4'
          }}>
            {logs.map((log: LogEntry) => (
              <div
                key={log.id}
                style={{
                  marginBottom: '8px',
                  padding: '5px',
                  borderLeft: `3px solid ${
                    log.type === 'error' ? '#e74c3c' : 
                    log.type === 'success' ? '#2ecc71' : '#3498db'
                  }`,
                  paddingLeft: '10px'
                }}
              >
                <span style={{ opacity: 0.7 }}>[{log.timestamp}]</span> {log.message}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AITradingAssistant;
