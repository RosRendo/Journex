import { useMemo, useState } from "react";
import { TradeData } from "@/hooks/useCsvTrades";
import { ChevronLeft, ChevronRight, FileText, TrendingDown, TrendingUp } from "lucide-react";

interface JournalCalendarProps {
    trades: TradeData[];
    onDayClick: (dateStr: string, dayTrades: TradeData[]) => void;
}

export default function JournalCalendar({ trades, onDayClick }: JournalCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };
    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };
    const todayMonth = () => {
        setCurrentDate(new Date());
    };

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 is Sunday

    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();

    // Group trades by "YYYY-MM-DD"
    const tradesByDate = useMemo(() => {
        const map: Record<string, TradeData[]> = {};
        trades.forEach(t => {
            const d = new Date(t.date);
            // Construct local date string to avoid timezone shifts
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!map[dateStr]) map[dateStr] = [];
            map[dateStr].push(t);
        });
        return map;
    }, [trades]);

    const calendarCells: React.ReactNode[] = [];
    // Empty cells before start of month
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarCells.push(<div key={`empty-${i}`} className="p-2 border border-transparent bg-secondary/10 opacity-50 rounded-xl" />);
    }

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === currentDate.getMonth();

    for (let i = 1; i <= daysInMonth; i++) {
        const isToday = isCurrentMonth && today.getDate() === i;
        const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayTrades = tradesByDate[dateStr] || [];

        const totalProfit = dayTrades.reduce((sum, t) => sum + t.profit, 0);
        const winCount = dayTrades.filter(t => t.outcome === "W").length;
        const lossCount = dayTrades.filter(t => t.outcome === "L").length;

        const dayJournalStr = typeof window !== 'undefined' ? localStorage.getItem(`journal_day_${dateStr}`) : null;
        let dayJournal: any = null;
        if (dayJournalStr) {
            try {
                dayJournal = JSON.parse(dayJournalStr);
            } catch (e) {
                console.error("Error parsing day journal", e);
            }
        }

        const tradesBySymbol: Record<string, { count: number, profit: number, win: number, loss: number, be: number }> = {};

        dayTrades.forEach(t => {
            if (!tradesBySymbol[t.pair]) {
                tradesBySymbol[t.pair] = { count: 0, profit: 0, win: 0, loss: 0, be: 0 };
            }
            tradesBySymbol[t.pair].count += 1;
            tradesBySymbol[t.pair].profit += t.profit;
            if (t.outcome === "W") tradesBySymbol[t.pair].win++;
            else if (t.outcome === "L") tradesBySymbol[t.pair].loss++;
            else tradesBySymbol[t.pair].be++;
        });

        const summaryEntries = Object.entries(tradesBySymbol).sort((a, b) => b[1].count - a[1].count);

        // Premium styling matching the dashboard's new aesthetic
        let tileClass = "border-[rgba(255,255,255,0.07)] bg-zinc-950/20 text-zinc-400 hover:border-[rgba(255,255,255,0.1)] hover:bg-zinc-900/10";
        if (dayTrades.length > 0) {
            if (totalProfit > 0) {
                tileClass = "bg-[rgba(32,224,178,0.10)] border-[rgba(32,224,178,0.15)] hover:bg-[rgba(32,224,178,0.18)] text-[#20e0b2]";
            } else if (totalProfit < 0) {
                tileClass = "bg-[rgba(255,92,115,0.10)] border-[rgba(255,92,115,0.15)] hover:bg-[rgba(255,92,115,0.18)] text-[#ff5c73]";
            } else {
                tileClass = "bg-zinc-900/60 border-zinc-850 text-zinc-300 hover:bg-zinc-900";
            }
        } else if (isToday) {
            tileClass = "bg-white/5 border-white/20 text-white";
        }

        calendarCells.push(
            <div
                key={`day-${i}`}
                onClick={() => onDayClick(dateStr, dayTrades)}
                className={`cursor-pointer min-h-[140px] p-3 border rounded-xl flex flex-col justify-between transition-all duration-300 group ${tileClass}`}
            >
                <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-white text-black' : 'text-zinc-400 group-hover:text-white'}`}>
                        {i}
                    </span>
                    <div className="flex items-center gap-1.5">
                        {dayJournal && (
                            <span title="Journal Attached">
                                <FileText className="w-3.5 h-3.5 text-[#20e0b2]" />
                            </span>
                        )}
                        <span className="text-[8px] font-bold text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider font-mono">
                            {dayJournal ? "Edit" : "+ Add"}
                        </span>
                    </div>
                </div>

                {/* Compact symbol trade details */}
                {dayTrades.length > 0 ? (
                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1 mt-2.5 max-h-[80px] custom-scrollbar">
                        {summaryEntries.map(([symbol, stats], idx) => {
                            const isSymWin = stats.profit >= 0;
                            return (
                                <div
                                    key={idx}
                                    className={`text-[9px] px-2 py-1 rounded-md border flex items-center justify-between font-mono font-bold ${
                                        isSymWin
                                            ? 'bg-[rgba(32,224,178,0.06)] border-[rgba(32,224,178,0.15)] text-[#20e0b2]'
                                            : 'bg-[rgba(255,92,115,0.06)] border-[rgba(255,92,115,0.12)] text-[#ff5c73]'
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                                        <span>{symbol}</span>
                                        <span className="text-[8px] opacity-65">x{stats.count}</span>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        {isSymWin ? '+' : ''}${Math.round(stats.profit)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-[9px] text-zinc-600/40 font-bold uppercase tracking-wider pb-2 font-mono">
                        No Trades
                    </div>
                )}

                {/* Day Journal Preview */}
                {dayJournal && (dayJournal.images?.length > 0 || dayJournal.strategy || dayJournal.reason) && (
                    <div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.07)] text-[9px] flex flex-col gap-1 opacity-90 group-hover:opacity-100 transition-all">
                        {dayJournal.images && dayJournal.images.length > 0 && (
                            <img src={dayJournal.images[0]} alt="Screenshot" className="w-full h-10 object-cover rounded border border-[rgba(255,255,255,0.07)] mt-0.5" />
                        )}
                        {dayJournal.strategy && (
                            <div className="font-bold text-[8px] text-[#20e0b2] break-words uppercase tracking-wider">
                                {dayJournal.strategy}
                            </div>
                        )}
                    </div>
                )}

                {/* Day total return */}
                {dayTrades.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-[rgba(255,255,255,0.07)] flex justify-between items-center">
                        <span className="text-[7px] text-zinc-500 font-mono uppercase tracking-widest font-bold">Day Net</span>
                        <span className={`text-xs font-black font-mono ${totalProfit >= 0 ? 'text-[#20e0b2]' : 'text-[#ff5c73]'}`}>
                            {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(1)}
                        </span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="border border-[rgba(255,255,255,0.07)] rounded-lg overflow-hidden bg-[#101014] p-5">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black text-white tracking-tight font-display uppercase">
                    {monthName} <span className="text-zinc-500 font-medium ml-1">{year}</span>
                </h2>

                <div className="flex items-center gap-2">
                    <button
                        onClick={todayMonth}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-lg border border-[rgba(255,255,255,0.07)] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors uppercase tracking-wider font-mono"
                    >
                        Today
                    </button>
                    <div className="flex items-center p-1 bg-zinc-900 rounded-lg border border-[rgba(255,255,255,0.07)]">
                        <button onClick={prevMonth} className="p-1 hover:bg-zinc-800 rounded-md transition-colors"><ChevronLeft className="w-4 h-4 text-zinc-400 hover:text-white" /></button>
                        <button onClick={nextMonth} className="p-1 hover:bg-zinc-800 rounded-md transition-colors"><ChevronRight className="w-4 h-4 text-zinc-400 hover:text-white" /></button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-3">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-[10px] uppercase font-bold text-zinc-500 tracking-wider pb-2 font-mono">
                        {day}
                    </div>
                ))}
                {calendarCells}
            </div>
        </div>
    );
}

