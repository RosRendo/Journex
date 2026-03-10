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

        calendarCells.push(
            <div
                key={`day-${i}`}
                onClick={() => onDayClick(dateStr, dayTrades)}
                className={`cursor-pointer min-h-[120px] p-3 border rounded-xl flex flex-col transition-all group ${isToday ? 'border-primary ring-2 ring-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.2)] bg-primary/5' : 'border-border/50 bg-card/40 hover:bg-secondary/40'
                    }`}
            >
                <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                        {i}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] text-primary font-bold uppercase tracking-wider bg-primary/10 px-1.5 py-0.5 rounded">
                            {dayJournal ? "Edit" : "+ Add"}
                        </span>
                    </div>
                    {dayJournal && (
                        <div title="Daily journal attached" className="group-hover:hidden">
                            <FileText className="w-4 h-4 text-primary" />
                        </div>
                    )}
                </div>

                {
                    dayTrades.length > 0 ? (
                        <div className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1 mt-2 custom-scrollbar">
                            {summaryEntries.map(([symbol, stats], idx) => {
                                return (
                                    <div
                                        key={idx}
                                        className={`text-[11px] p-1.5 rounded-lg border flex flex-col justify-between ${stats.profit >= 0
                                            ? 'bg-profit/5 border-profit/20'
                                            : 'bg-loss/5 border-loss/20'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between font-bold truncate">
                                            <span className="flex items-center gap-1">
                                                {symbol}
                                                <span className="text-[9px] text-muted-foreground bg-secondary/80 px-1 rounded-sm">x{stats.count}</span>
                                            </span>
                                            <div className={`${stats.profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                                                {stats.profit >= 0 ? '+' : ''}${stats.profit.toFixed(0)}
                                            </div>
                                        </div>
                                        <div className="flex gap-1.5 mt-0.5 text-[9px] font-semibold opacity-80">
                                            {stats.win > 0 && <span className="text-profit">{stats.win}W</span>}
                                            {stats.loss > 0 && <span className="text-loss">{stats.loss}L</span>}
                                            {stats.be > 0 && <span className="text-muted-foreground">{stats.be}BE</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground/40 font-medium pb-2">
                            No Trades
                        </div>
                    )
                }

                {/* Visual Daily Journal Content */}
                {dayJournal && (dayJournal.images?.length > 0 || dayJournal.strategy || dayJournal.reason) && (
                    <div className="mt-2 pt-2 border-t border-border/50 text-xs flex flex-col gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        {dayJournal.images && dayJournal.images.length > 0 && (
                            <img src={dayJournal.images[0]} alt="Day Screenshot" className="w-full h-16 object-cover rounded-md border border-border mt-1" />
                        )}
                        {dayJournal.strategy && (
                            <div className="font-bold text-[10px] text-primary break-words leading-tight uppercase tracking-wider">
                                {dayJournal.strategy}
                            </div>
                        )}
                        {dayJournal.reason && (
                            <div className="text-[10px] text-muted-foreground italic line-clamp-2 leading-tight">
                                {dayJournal.reason}
                            </div>
                        )}
                    </div>
                )}

                {
                    dayTrades.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50 text-right">
                            <span className={`text-sm font-bold ${totalProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                                {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
                            </span>
                        </div>
                    )
                }
            </div>
        );
    }

    return (
        <div className="border border-border/50 rounded-2xl overflow-hidden bg-card/50 backdrop-blur-md shadow-lg p-5">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                    {monthName} <span className="text-muted-foreground font-medium ml-1">{year}</span>
                </h2>

                <div className="flex items-center gap-2">
                    <button
                        onClick={todayMonth}
                        className="px-4 py-2 text-sm font-bold rounded-lg border border-border bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                        Today
                    </button>
                    <div className="flex items-center p-1 bg-secondary/50 rounded-lg border border-border">
                        <button onClick={prevMonth} className="p-1.5 hover:bg-background rounded-md transition-colors"><ChevronLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
                        <button onClick={nextMonth} className="p-1.5 hover:bg-background rounded-md transition-colors"><ChevronRight className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-3">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-bold uppercase tracking-wider text-muted-foreground pb-2">
                        {day}
                    </div>
                ))}
                {calendarCells}
            </div>
        </div>
    );
}
