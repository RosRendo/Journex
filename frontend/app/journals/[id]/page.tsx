"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Brain, TrendingUp, TrendingDown, Clock, Activity, Target } from "lucide-react";
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function JournalDetailPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const MT5_URL = process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge";

  useEffect(() => {
    fetchJournal();
  }, [id]);

  const fetchJournal = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${MT5_URL}/api/journals/${id}`, { headers: { "ngrok-skip-browser-warning": "true" } });
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || 'Failed to load journal');
      }
    } catch (err) {
      setError('Connection error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-400">Loading journal details...</div>;
  if (error || !data) return <div className="p-10 text-center text-red-400">{error || 'Journal not found'}</div>;

  const { trade, analysis } = data;
  const isWin = trade.results?.result === "W";
  const isLoss = trade.results?.result === "L";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/journals" className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            {trade.symbol} Trade Journal
            <Badge variant="outline" className={trade.position_type === 'BUY' ? 'text-green-400 border-green-400/20' : 'text-red-400 border-red-400/20'}>
              {trade.position_type}
            </Badge>
          </h1>
          <p className="text-slate-400">
            {new Date(trade.entry?.time || trade.metadata?.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Stats */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex justify-between">
                Performance
                <Badge className={
                  isWin ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                  isLoss ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                  'bg-slate-500/10 text-slate-400 border-slate-500/20'
                }>
                  {trade.results?.result || 'OPEN'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-slate-500 text-sm">Profit / Loss</div>
                <div className={`text-2xl font-bold ${isWin ? 'text-green-400' : isLoss ? 'text-red-400' : 'text-slate-200'}`}>
                  {trade.results?.profit_loss ? `$${trade.results.profit_loss.toFixed(2)}` : '---'}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div>
                  <div className="text-slate-500 text-xs">Pips Captured</div>
                  <div className="text-slate-200 font-medium">{trade.results?.pips ? `${trade.results.pips.toFixed(1)}` : '---'}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs">Return %</div>
                  <div className="text-slate-200 font-medium">{trade.results?.return_percent ? `${trade.results.return_percent.toFixed(2)}%` : '---'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Execution Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Lot Size</span>
                  <span className="text-slate-200">{trade.position?.lot_size}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Entry Price</span>
                  <span className="text-slate-200">{trade.entry?.price}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Close Price</span>
                  <span className="text-slate-200">{trade.close?.price || '---'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Stop Loss</span>
                  <span className="text-slate-200">{trade.position?.stop_loss || 'None'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Take Profit</span>
                  <span className="text-slate-200">{trade.position?.take_profit || 'None'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">R:R Ratio</span>
                  <span className="text-slate-200">{trade.position?.rr_ratio ? `1:${trade.position.rr_ratio.toFixed(2)}` : '---'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Duration</span>
                  <span className="text-slate-200">{trade.close?.duration_minutes ? `${trade.close.duration_minutes}m` : 'Open'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Session</span>
                  <span className="text-slate-200">{trade.tags?.session}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Analysis & Chart */}
        <div className="space-y-6 lg:col-span-2">
          
          {analysis && (
            <Card className="bg-slate-900 border-slate-800 border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-400" />
                  Claude AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert max-w-none text-slate-300 text-sm whitespace-pre-wrap">
                  {analysis}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                Trade Chart at Execution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg overflow-hidden border border-slate-800 bg-black aspect-video flex items-center justify-center">
                {trade.media?.chart_image ? (
                  <img 
                    src={`${MT5_URL}/journals/${trade.trade_id}/${trade.media.chart_image}`} 
                    alt="Trade Chart" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`text-slate-500 ${trade.media?.chart_image ? 'hidden' : ''}`}>
                  Chart image not available
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  );
}
