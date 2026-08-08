"use client";
import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Pause, SkipForward, Loader2, AlertCircle, FastForward } from "lucide-react";
import { createChart, IChartApi, ISeriesApi, Time } from "lightweight-charts";
import { getBackendUrl, fetchWithAuth } from "@/lib/utils";

interface TradeReplayModalProps {
  tradeId: number | null;
  onClose: () => void;
}

export function TradeReplayModal({ tradeId, onClose }: TradeReplayModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tradeData, setTradeData] = useState<any>(null);
  const [allCandles, setAllCandles] = useState<any[]>([]);
  
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // ms per candle

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!tradeId) return;

    const fetchReplayData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth(`${getBackendUrl()}/api/replay/${tradeId}`);
        const data = await res.json();
        
        if (data.success) {
          setTradeData(data.trade);
          setAllCandles(data.candles);
          
          // Find the index of the candle closest to the entry time
          const entryTimeStr = new Date(data.trade.date).getTime() / 1000;
          let startIndex = 0;
          for (let i = 0; i < data.candles.length; i++) {
             if (data.candles[i].time >= entryTimeStr - (3600 * 2)) { // start showing a couple hours before entry
                 startIndex = i;
                 break;
             }
          }
          // Default to start of array if not found or close
          setCurrentIndex(Math.max(0, startIndex - 20));
        } else {
          setError(data.error || "Failed to load replay data");
        }
      } catch (err) {
        setError("Network error fetching replay data");
      } finally {
        setLoading(false);
      }
    };

    fetchReplayData();
  }, [tradeId]);

  useEffect(() => {
    if (!chartContainerRef.current || allCandles.length === 0) return;

    if (!chartRef.current) {
      chartRef.current = createChart(chartContainerRef.current, {
        layout: { background: { type: "solid" as any, color: "transparent" }, textColor: "#8e9196" },
        grid: { vertLines: { color: "rgba(255,255,255,0.03)" }, horzLines: { color: "rgba(255,255,255,0.03)" } },
        timeScale: { timeVisible: true, secondsVisible: false, borderColor: "rgba(255,255,255,0.1)", rightOffset: 5 },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.1)", scaleMargins: { top: 0.1, bottom: 0.1 } },
        crosshair: { mode: 0 },
      });
      seriesRef.current = chartRef.current.addCandlestickSeries({
        upColor: "#00d4a1", downColor: "#ff4d6a", borderVisible: false,
        wickUpColor: "#00d4a1", wickDownColor: "#ff4d6a",
      });
    }

    // Initialize with data up to currentIndex
    const visibleData = allCandles.slice(0, currentIndex + 1).map(c => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));
    
    seriesRef.current?.setData(visibleData);

    // Draw Entry, SL, TP lines if they exist and are within visible range
    if (tradeData && seriesRef.current) {
       // Clear old markers if we had a way, lightweight charts doesn't have a simple clear markers without overwriting
       const markers: any[] = [];
       const entryTime = new Date(tradeData.date).getTime() / 1000;
       const closeTime = new Date(tradeData.closeTime).getTime() / 1000;

       // Find candles for entry and exit
       const entryCandle = allCandles.find(c => c.time >= entryTime);
       const closeCandle = allCandles.find(c => c.time >= closeTime);

       if (entryCandle && entryCandle.time <= allCandles[currentIndex].time) {
          markers.push({
             time: entryCandle.time as Time,
             position: tradeData.direction === 'Long' ? 'belowBar' : 'aboveBar',
             color: tradeData.direction === 'Long' ? '#00dc82' : '#ff4d6a',
             shape: tradeData.direction === 'Long' ? 'arrowUp' : 'arrowDown',
             text: `Entry: ${tradeData.price}`,
          });
       }

       if (closeCandle && closeCandle.time <= allCandles[currentIndex].time) {
          markers.push({
             time: closeCandle.time as Time,
             position: 'aboveBar',
             color: '#eab308',
             shape: 'circle',
             text: `Exit: ${tradeData.closePrice}`,
          });
       }
       seriesRef.current.setMarkers(markers);
    }

    chartRef.current.timeScale().fitContent();

    return () => {
       if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
       }
    };
  }, [allCandles, chartContainerRef]);

  // Update chart when currentIndex changes (if playing)
  useEffect(() => {
     if (!seriesRef.current || allCandles.length === 0 || currentIndex === 0) return;
     
     const currentCandle = allCandles[currentIndex];
     seriesRef.current.update({
        time: currentCandle.time as Time,
        open: currentCandle.open,
        high: currentCandle.high,
        low: currentCandle.low,
        close: currentCandle.close
     });

     // Check if we hit the close time to show a notification or auto-pause
     if (tradeData && tradeData.closeTime) {
         const closeTime = new Date(tradeData.closeTime).getTime() / 1000;
         if (currentCandle.time >= closeTime && allCandles[currentIndex-1].time < closeTime) {
             setPlaying(false);
         }
     }
  }, [currentIndex, allCandles, tradeData]);

  useEffect(() => {
    if (playing) {
      playIntervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
           if (prev >= allCandles.length - 1) {
              setPlaying(false);
              return prev;
           }
           return prev + 1;
        });
      }, playbackSpeed);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [playing, playbackSpeed, allCandles.length]);

  const handleNext = () => {
     if (currentIndex < allCandles.length - 1) {
        setCurrentIndex(prev => prev + 1);
     }
  };

  return (
    <Dialog open={!!tradeId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] md:w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-[#0c0c0d] border border-white/10 text-white shadow-2xl p-0">
        <DialogHeader className="p-4 border-b border-white/5 bg-[#121214]">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center">
              <Play className="w-4 h-4 text-blue-400" />
            </div>
            <span>Trade Replay Mode</span>
            {tradeData && (
              <span className="text-sm font-normal text-gray-400 ml-2">
                {tradeData.pair} • {tradeData.direction} • {new Date(tradeData.date).toLocaleString()}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 bg-[#080808]">
          {loading ? (
            <div className="h-[400px] flex flex-col items-center justify-center gap-4">
               <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
               <p className="text-gray-400 animate-pulse font-mono text-sm">Fetching historical OHLC data...</p>
            </div>
          ) : error ? (
            <div className="h-[400px] flex flex-col items-center justify-center gap-3 text-red-400">
               <AlertCircle className="w-10 h-10" />
               <p>{error}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
               <div className="flex items-center justify-between p-3 rounded-lg bg-[#121214] border border-white/5">
                 <div className="flex items-center gap-2">
                    <button
                       onClick={() => setPlaying(!playing)}
                       className="p-2 rounded hover:bg-white/10 transition-colors"
                    >
                       {playing ? <Pause className="w-5 h-5 text-yellow-500" /> : <Play className="w-5 h-5 text-[#00dc82]" />}
                    </button>
                    <button
                       onClick={handleNext}
                       className="p-2 rounded hover:bg-white/10 transition-colors"
                       disabled={playing}
                    >
                       <SkipForward className="w-5 h-5 text-gray-300" />
                    </button>
                    <div className="h-6 w-px bg-white/10 mx-2" />
                    <button
                       onClick={() => setPlaybackSpeed(1000)}
                       className={`px-3 py-1 text-xs font-bold rounded ${playbackSpeed === 1000 ? 'bg-white/10 text-white' : 'text-gray-500'}`}
                    >
                       1x
                    </button>
                    <button
                       onClick={() => setPlaybackSpeed(250)}
                       className={`px-3 py-1 text-xs font-bold rounded ${playbackSpeed === 250 ? 'bg-white/10 text-white' : 'text-gray-500'}`}
                    >
                       <FastForward className="w-3 h-3 inline mr-1"/> 4x
                    </button>
                 </div>
                 
                 <div className="text-xs font-mono text-gray-400">
                   Candle {currentIndex + 1} of {allCandles.length}
                 </div>
               </div>

               <div className="relative border border-white/5 rounded-lg overflow-hidden bg-black/50 backdrop-blur">
                 {/* Replay Watermark */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-5 z-0 flex flex-col items-center">
                    <Play className="w-32 h-32" />
                    <span className="text-4xl font-black tracking-widest mt-4">REPLAY</span>
                 </div>
                 <div ref={chartContainerRef} className="w-full h-[500px] relative z-10" />
               </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
