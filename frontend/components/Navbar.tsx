"use client";

import { useState, useEffect, useRef } from "react";
import {
  LogOut, User, Settings, Bell, X, Flame, TrendingUp, TrendingDown, CreditCard, ChevronDown, Palette, Menu, Clock
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession, signOut, getSession } from "@/lib/useSession";
import { toast } from "sonner";
import Link from "next/link";
import { HEADER_GROUPS } from "@/components/layout/navigation";
import { useTheme } from "next-themes";
import { getBackendUrl } from "@/lib/utils";
import { useWorkspace, WorkspaceType } from "@/src/context/WorkspaceContext";

function DualClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const localTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const utcTime = now.toUTCString().slice(17, 22);

  return (
    <div className="hidden md:flex items-center gap-3 text-[11px] font-mono">
      <div className="flex flex-col items-end leading-tight">
        <span className="text-[--accent] font-bold">{localTime}</span>
        <span className="text-[--text-tertiary]">LOCAL</span>
      </div>
      <div className="w-px h-6 bg-[--border]" />
      <div className="flex flex-col items-end leading-tight">
        <span className="text-[--text-secondary] font-bold">{utcTime}</span>
        <span className="text-[--text-tertiary]">UTC</span>
      </div>
    </div>
  );
}

function WorkspaceSelector() {
  const { activeWorkspace, setActiveWorkspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const workspaces: WorkspaceType[] = ["Global", "Forex", "Gold", "Crypto", "Scalping", "Swing", "Funded Challenge"];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-widest transition-colors"
        style={{ borderColor: "var(--border)", background: "var(--bg-elevated)", color: "var(--accent)" }}
      >
        <span className="text-[--text-secondary]">WS:</span> {activeWorkspace}
        <ChevronDown className="w-3 h-3 text-[--text-tertiary]" />
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-2 w-48 rounded-xl shadow-2xl border py-2 z-50 animate-in fade-in"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-strong)" }}
        >
          {workspaces.map(ws => (
            <button
              key={ws}
              onClick={() => { setActiveWorkspace(ws); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                activeWorkspace === ws ? "text-[--accent] bg-[--bg-elevated]" : "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated]"
              }`}
            >
              {ws}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HeaderNavDropdown({ group }: { group: typeof HEADER_GROUPS[0] }) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
  };

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated] transition-colors uppercase tracking-wider">
        {group.label}
        <ChevronDown className="w-3 h-3 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 rounded-xl shadow-2xl border py-2 z-50 animate-in fade-in slide-in-from-top-2" style={{ background: "var(--bg-card)", borderColor: "var(--border-strong)" }}>
          {group.items.map((item) => (
            <Link
              key={item.id}
              href={item.href || "#"}
              className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-[--text-secondary] hover:bg-[--bg-elevated] hover:text-[--text-primary] transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <item.icon className="w-4 h-4 text-[--text-tertiary]" />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Navbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const user = session?.user;
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newsUnread, setNewsUnread] = useState(0);
  const [newsItems, setNewsItems] = useState<{
    id: string; title: string; time: string;
    isHot: boolean; impact: "bullish" | "bearish" | "neutral"; symbol: string;
  }[]>([]);

  const THEMES = [
    { id: "dark",     label: "Dark",     swatch: "#0a0a0f",  border: "#00d4a1" },
    { id: "theme-white",    label: "White",    swatch: "#f4f5f7",  border: "#0070f3" },
    { id: "theme-midnight", label: "Midnight", swatch: "#0d1117",  border: "#58a6ff" },
    { id: "theme-rose",     label: "Rose",     swatch: "#16100f",  border: "#fb7185" },
  ];

  const applyTheme = (id: string) => {
    // Remove all theme classes first
    document.documentElement.classList.remove("dark", "theme-white", "theme-midnight", "theme-rose");
    document.documentElement.classList.add(id);
    localStorage.setItem("ui-theme", id);
    setTheme(id === "dark" ? "dark" : "light");
  };

  const [activeTheme, setActiveThemeState] = useState("dark");
  useEffect(() => {
    const saved = localStorage.getItem("ui-theme") || "dark";
    setActiveThemeState(saved);
    document.documentElement.classList.remove("dark", "theme-white", "theme-midnight", "theme-rose");
    document.documentElement.classList.add(saved);
  }, []);

  useEffect(() => {
    const seenIds = new Set<string>();
    let isFirstFetch = true;

    const pollNews = async () => {
      try {
        const backendUrl = getBackendUrl();
        const sess = await getSession();
        const authHeaders: HeadersInit = {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
          ...((sess?.user as any)?.apiToken ? { "Authorization": `Bearer ${(sess?.user as any).apiToken}` } : {}),
        };

        const res = await fetch(`${backendUrl}/api/bridge/api/news`, { headers: authHeaders });
        const data = await res.json();
        if (!data.success || !data.news) return;

        setNewsItems(data.news.slice(0, 8).map((n: any) => ({
          id: n.id, title: n.title, time: n.time,
          isHot: n.isHot, impact: n.impact, symbol: n.symbol,
        })));

        const newHot: any[] = data.news.filter((n: any) => n.isHot && !seenIds.has(n.id));
        newHot.forEach((n: any) => seenIds.add(n.id));

        if (newHot.length > 0 && !isFirstFetch) {
          setNewsUnread(prev => prev + newHot.length);
          newHot.forEach((item: any) => {
            fetch(`${backendUrl}/api/bridge/api/notify`, {
              method: "POST",
              headers: authHeaders,
              body: JSON.stringify({
                message: `🔴 **HOT NEWS:** ${item.title}\nSymbol: ${item.symbol} | Impact: ${item.impact}`,
                channel: "news"
              })
            }).catch(() => {});
            
            toast.custom((t) => (
              <div className="border border-orange-500/40 rounded-xl p-4 shadow-2xl relative overflow-hidden w-[380px]"
                style={{ background: "#0f0c07" }}>
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                <div className="flex justify-between items-start mb-2 ml-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-orange-500/20 text-orange-400 rounded px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider">
                      <Flame className="w-3 h-3 fill-orange-400" /> HOT
                    </div>
                    {item.time && (
                      <div className="flex items-center gap-1 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider">
                        <Clock className="w-3 h-3" /> {item.time}
                      </div>
                    )}
                  </div>
                  <button onClick={() => toast.dismiss(t)} className="text-[--text-tertiary] hover:text-[--text-primary]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h2 className="ml-2 text-sm font-bold text-[--text-primary] line-clamp-3 leading-snug">{item.title}</h2>
              </div>
            ), { duration: 9000, position: "top-right" });
          });
        }
        isFirstFetch = false;
      } catch (_) {}
    };

    pollNews();
    const interval = setInterval(pollNews, 60_000);
    return () => clearInterval(interval);
  }, []);

  const getInitials = (name: string | null) => {
    if (!name) return "T";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await signOut({ redirect: false });
    router.push("/auth");
  };

  return (
    <nav
      className="h-14 flex items-center justify-between px-4 flex-shrink-0 sticky top-0 z-50 border-b"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      {/* Left: Logo & Header Nav */}
      <div className="flex items-center gap-4 lg:gap-8">
        <div className="flex items-center gap-2">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-1.5 -ml-2 rounded-lg text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="w-7 h-7 rounded-lg bg-[--accent] flex items-center justify-center">
            <span className="text-black text-xs font-black">T</span>
          </div>
          <span className="font-display text-[15px] font-bold tracking-wide text-[--text-primary]">
            Journex
          </span>
        </div>

        {/* Dynamic Header Nav Groups */}
        <div className="hidden lg:flex items-center gap-1">
          {HEADER_GROUPS.map(group => (
            <HeaderNavDropdown key={group.id} group={group} />
          ))}
        </div>
      </div>

      {/* Center: Dual clock & Workspace */}
      <div className="flex items-center gap-6">
        <WorkspaceSelector />
        <DualClock />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setNewsUnread(0); }}
            className="relative p-2 rounded-lg text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-elevated] transition-colors"
          >
            <Bell className="w-[18px] h-[18px]" />
            {newsUnread > 0 && (
               <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-xl shadow-2xl border py-2 z-50 overflow-hidden"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-strong)" }}
            >
              <div className="px-4 py-2.5 border-b flex justify-between items-center" style={{ borderColor: "var(--border)" }}>
                <h3 className="text-[12px] font-bold text-[--text-primary]">Market Alerts</h3>
                <button className="text-[11px] text-[--accent] hover:opacity-80" onClick={() => router.push("/news")}>View All</button>
              </div>
              <div className="max-h-[280px] overflow-y-auto">
                {newsItems.length === 0 ? (
                  <div className="py-8 text-center text-[--text-tertiary] text-xs">No alerts</div>
                ) : newsItems.map(news => (
                  <div key={news.id} className="px-4 py-2.5 border-b hover:bg-[--bg-elevated] cursor-pointer transition-colors" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-2 mb-1 text-[10px] font-bold tracking-wider uppercase">
                      {news.isHot && <span className="text-orange-500 flex items-center gap-1"><Flame className="w-3 h-3" /> Hot</span>}
                      <span className="text-[--text-tertiary]">{news.time}</span>
                    </div>
                    <p className="text-[12px] text-[--text-primary] leading-snug line-clamp-2">{news.title}</p>
                    <div className="mt-1.5 flex">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${news.impact === "bullish" ? "border-[--bull]/30 text-[--bull] bg-[--bull]/10" : "border-[--bear]/30 text-[--bear] bg-[--bear]/10"}`}>
                        {news.impact === "bullish" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {news.symbol}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[--bg-elevated] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[--accent] to-[--info] flex items-center justify-center text-black text-[11px] font-black">
              {getInitials(user?.name || null)}
            </div>
            <span className="hidden sm:block text-[12px] font-medium text-[--text-secondary]">
              {user?.name?.split(" ")[0] || "Trader"}
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-2xl border py-2 z-50"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-strong)" }}
            >
              {/* Theme switcher */}
              <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Palette className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Theme</span>
                </div>
                <div className="flex gap-1.5">
                  {THEMES.map(t => (
                    <button key={t.id} onClick={() => { applyTheme(t.id); setActiveThemeState(t.id); }}
                      title={t.label}
                      className="w-7 h-7 rounded-lg transition-all hover:scale-110"
                      style={{
                        background: t.swatch,
                        border: activeTheme === t.id ? `2px solid ${t.border}` : "2px solid transparent",
                        boxShadow: activeTheme === t.id ? `0 0 8px ${t.border}60` : "none"
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="px-4 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
                <p className="text-[12px] font-bold text-[--text-primary]">{user?.name || "Trader"}</p>
                <p className="text-[11px] text-[--text-tertiary]">{user?.email || ""}</p>
              </div>
              {[
                { icon: User, label: "My Profile", fn: () => { setShowProfileMenu(false); router.push("/profile"); } },
                { icon: Settings, label: "Settings", fn: () => { setShowProfileMenu(false); router.push("/settings"); } },
                { icon: CreditCard, label: "Subscription", fn: () => { setShowProfileMenu(false); router.push("/subscription"); } },
              ].map(({ icon: Icon, label, fn }) => (
                <button key={label} onClick={fn}
                  className="w-full flex items-center gap-3 px-4 py-2 text-[12px] text-[--text-secondary] hover:bg-[--bg-elevated] hover:text-[--text-primary] transition-colors">
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
              <div className="my-1.5 border-t" style={{ borderColor: "var(--border)" }} />
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-[12px] text-[--bear] hover:bg-[--bear]/10 transition-colors">
                <LogOut className="w-4 h-4" />Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
