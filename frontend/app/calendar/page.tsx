"use client";
import { useCsvTrades } from "@/hooks/useCsvTrades";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, CalendarDays, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TradeData } from "@/hooks/useCsvTrades";
import { EconomicCalendar } from "@/components/ui/EconomicCalendar";
import { useRouter } from "next/navigation";

export default function CalendarPage() {
  const router = useRouter();
  const { trades, loading } = useCsvTrades();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"trading" | "economic">("trading");
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Group trades by date
  const pnlMap = useMemo(() => {
    const m = new Map<string, { pnl: number; trades: number }>();
    if (trades && trades.length > 0) {
      trades.forEach((t: TradeData) => {
        const date = new Date(t.date).toISOString().split("T")[0];
        if (!m.has(date)) m.set(date, { pnl: 0, trades: 0 });
        const data = m.get(date)!;
        data.pnl += t.profit;
        data.trades += 1;
      });
    }
    return m;
  }, [trades]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));

  // Monthly stats
  const monthTrades: TradeData[] = [];
  if (trades && trades.length > 0) {
    trades.forEach((t: TradeData) => {
      const d = new Date(t.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        monthTrades.push(t);
      }
    });
  }
  const monthPnl = monthTrades.reduce((s, t) => s + t.profit, 0);
  const winDays = Array.from(pnlMap.entries()).filter(([dateStr, data]) => {
    const dt = new Date(dateStr);
    return dt.getFullYear() === year && dt.getMonth() === month && data.pnl > 0;
  }).length;
  const lossDays = Array.from(pnlMap.entries()).filter(([dateStr, data]) => {
    const dt = new Date(dateStr);
    return dt.getFullYear() === year && dt.getMonth() === month && data.pnl <= 0;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Trading Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Daily performance overview & Economic Events
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 rounded-lg border bg-muted/50 w-fit">
          <button
            onClick={() => setActiveTab("trading")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "trading"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Performance
          </button>
          <button
            onClick={() => setActiveTab("economic")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "economic"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="w-4 h-4" />
            Economic Events
          </button>
        </div>
      </div>

      {activeTab === "economic" ? (
        <EconomicCalendar />
      ) : (
        <>
          {/* Month stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Month P&L</div>
              <div
                className={`text-lg font-bold font-mono-nums ${monthPnl >= 0 ? "text-profit" : "text-loss"}`}
              >
                {monthPnl >= 0 ? "+" : ""}${monthPnl.toFixed(0)}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Trades</div>
              <div className="text-lg font-bold font-mono-nums">
                {monthTrades.length}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Green Days</div>
              <div className="text-lg font-bold font-mono-nums text-profit">
                {winDays}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Red Days</div>
              <div className="text-lg font-bold font-mono-nums text-loss">
                {lossDays}
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={prev}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-semibold">{monthName}</h2>
              <Button variant="ghost" size="icon" onClick={next}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div
                  key={d}
                  className="text-center text-xs text-muted-foreground py-2 font-medium"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, i) => {
                if (day === null) return <div key={i} />;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const data = pnlMap.get(dateStr);
                const isToday =
                  new Date().toISOString().split("T")[0] === dateStr;

                return (
                  <div
                    key={i}
                    onClick={() => router.push(`/journal/day/${dateStr}`)}
                    className={`aspect-square rounded-md flex flex-col items-center justify-center text-sm cursor-pointer transition-colors ${data
                        ? data.pnl >= 0
                          ? "bg-profit-muted border border-profit/20 hover:bg-profit/20"
                          : "bg-loss-muted border border-loss/20 hover:bg-loss/20"
                        : isToday
                          ? "border border-primary/30 bg-primary/5 hover:bg-primary/10"
                          : "border border-transparent hover:bg-secondary/50"
                      }`}
                  >
                    <span
                      className={`text-xs ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}
                    >
                      {day}
                    </span>
                    {data && (
                      <>
                        <span
                          className={`text-xs font-mono-nums font-bold ${data.pnl >= 0 ? "text-profit" : "text-loss"}`}
                        >
                          {data.pnl >= 0 ? "+" : ""}
                          {data.pnl.toFixed(0)}$
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {data.trades} trades
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
