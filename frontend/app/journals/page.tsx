"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TradeJournalCard } from "@/components/ui/TradeJournalCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";


export default function JournalsPage() {
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const MT5_URL = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5003";

  useEffect(() => {
    fetchJournals();
    const interval = setInterval(fetchJournals, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchJournals = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${MT5_URL}/api/journals`, { headers: { "ngrok-skip-browser-warning": "true" } });
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setJournals(data.journals);
      } else {
        setError(data.error || 'Failed to load journals');
      }
    } catch (err) {
      setError('Connection error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredJournals = journals.filter(j => {
    const matchesFilter = filter === "ALL" || j.results?.result === filter || (filter === "OPEN" && j.results?.trade_status === "OPEN");
    const matchesSearch = j.symbol?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Trade Journals</h1>
          <p className="text-slate-400">Automatically generated reports and AI analysis for your trades.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input 
              type="text" 
              placeholder="Search symbol..." 
              className="pl-9 bg-slate-900 border-slate-800"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px] bg-slate-900 border-slate-800">
              <SelectValue placeholder="Filter by Result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Trades</SelectItem>
              <SelectItem value="OPEN">Open Trades</SelectItem>
              <SelectItem value="W">Winning Trades</SelectItem>
              <SelectItem value="L">Losing Trades</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading journals...</div>
      ) : error ? (
        <div className="text-center py-20 text-red-400">{error}</div>
      ) : journals.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-800 rounded-lg bg-slate-900/50">
          <h3 className="text-lg font-medium text-slate-300 mb-2">No Journals Found</h3>
          <p className="text-slate-500">Journals will be automatically generated here when you open and close trades in MT5.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredJournals.map(journal => (
            <TradeJournalCard key={journal.trade_id} journal={journal} />
          ))}
          {filteredJournals.length === 0 && (
            <div className="col-span-full text-center py-10 text-slate-500">
              No journals match your filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
