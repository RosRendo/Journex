"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, TrendingUp, TrendingDown, Clock, Image as ImageIcon } from "lucide-react";
import Link from 'next/link';

export function TradeJournalCard({ journal }: { journal: any }) {
  const isWin = journal.results?.result === "W";
  const isLoss = journal.results?.result === "L";
  
  return (
    <Link href={`/journals/${journal.trade_id}`} className="block">
      <Card className="hover:border-blue-500/50 transition-colors cursor-pointer bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {journal.symbol}
                <Badge variant="outline" className={journal.position_type === 'BUY' ? 'text-green-400 border-green-400/20' : 'text-red-400 border-red-400/20'}>
                  {journal.position_type}
                </Badge>
              </CardTitle>
              <div suppressHydrationWarning className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                {new Date(journal.entry?.time || journal.metadata?.created_at).toLocaleString()}
              </div>
            </div>
            <Badge className={
              isWin ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
              isLoss ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
              'bg-slate-500/10 text-slate-400 border-slate-500/20'
            }>
              {journal.results?.result || 'OPEN'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm mt-2">
            <div>
              <div className="text-slate-500 text-xs">P&L</div>
              <div className={`font-medium ${isWin ? 'text-green-400' : isLoss ? 'text-red-400' : 'text-slate-200'}`}>
                {journal.results?.profit_loss ? `$${journal.results.profit_loss.toFixed(2)}` : '---'}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">Pips</div>
              <div className="text-slate-200">
                {journal.results?.pips ? `${journal.results.pips.toFixed(1)} pips` : '---'}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">R:R</div>
              <div className="text-slate-200">
                {journal.position?.rr_ratio ? `1:${journal.position.rr_ratio.toFixed(2)}` : '---'}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">Duration</div>
              <div className="text-slate-200 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {journal.close?.duration_minutes ? `${journal.close.duration_minutes}m` : 'Open'}
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> Chart
            </div>
            {journal.tags?.session && (
              <Badge variant="outline" className="text-[10px] py-0 h-4 border-slate-700">
                {journal.tags.session}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
