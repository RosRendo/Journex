"use client";

import { useState, useEffect } from "react";
import {
  Moon,
  Sun,
  Monitor,
  LogOut,
  User,
  Settings,
  Bell,
  Plug,
  X,
  Flame,
  Info,
  TrendingUp,
  TrendingDown,
  CreditCard
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";


export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const user = session?.user;
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Live news state – populated by real RSS poll
  const [newsUnread, setNewsUnread] = useState(0);
  const [newsItems, setNewsItems] = useState<{
    id: string; title: string; time: string;
    isHot: boolean; impact: 'bullish' | 'bearish' | 'neutral'; symbol: string;
  }[]>([]);

  useEffect(() => {
    setMounted(true);

    const seenIds = new Set<string>();
    let isFirstFetch = true;

    const pollNews = async () => {
      try {
        const res = await fetch("\/api/news");
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
            toast.custom((t) => (
              <div className="bg-[#121008] border border-orange-500/40 rounded-xl p-4 shadow-[0_0_40px_rgba(249,115,22,0.15)] relative overflow-hidden w-[380px]">
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,1)]" />
                <div className="flex justify-between items-start mb-2 ml-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-orange-500/20 text-orange-400 rounded-sm px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider">
                      <Flame className="w-3 h-3 fill-orange-400" /> HOT
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">Breaking News</span>
                  </div>
                  <button onClick={() => toast.dismiss(t)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="ml-2">
                  <h2 className="text-sm font-bold text-foreground mb-2 uppercase tracking-wide leading-tight line-clamp-3">
                    {item.title}
                  </h2>
                  <div className="flex gap-2">
                    <span className="border border-border bg-card text-card-foreground shadow-sm text-foreground/80 rounded-md text-[10px] px-2 py-0.5">
                      {item.symbol}
                    </span>
                  </div>
                </div>
              </div>
            ), { duration: 9000, position: 'top-right' });
          });
        }
        isFirstFetch = false;
      } catch (_) {
        // Bridge offline – fail silently
      }
    };

    pollNews();
    const interval = setInterval(pollNews, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Auth user avatar
  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };



  const handleLogout = () => {
    signOut({ callbackUrl: "/auth" });
    setShowProfileMenu(false);
  };

  const handleProfileClick = () => {
    setShowProfileMenu(false);
    router.push("/profile");
  };

  const handleSettingsClick = () => {
    setShowProfileMenu(false);
    router.push("/settings");
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 dark:border-border bg-white dark:bg-background hover:bg-muted text-foreground shadow-sm">
      <div className="flex items-center justify-between h-16 px-6 md:px-8">
        {/* Left: Notifications & Broker Status */}
        <div className="flex items-center gap-4">

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setNewsUnread(0); // Clear badge on click
              }}
              className="relative p-2 text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground transition-colors"
            >
              <Bell className="w-5 h-5" />
              {newsUnread > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse border-2 border-white dark:border-gray-900"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-[#0b0b0b] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-gray-200 dark:border-border py-2 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-border flex justify-between items-center">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-foreground flex items-center gap-2">Market Alerts</h3>
                  <button className="text-xs text-blue-500 hover:text-blue-400" onClick={() => router.push('/news')}>View Dashboard</button>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {newsItems.map(news => (
                    <div key={news.id} className="px-4 py-3 border-b border-gray-100 dark:border-border/50 hover:bg-gray-50 dark:hover:bg-card border border-border text-card-foreground shadow-sm/30 cursor-pointer text-left transition-colors">
                      <div className="flex items-center gap-2 mb-1.5 text-[10px] font-bold tracking-wider uppercase">
                        {news.isHot && <span className="text-orange-500 flex items-center gap-1"><Flame className="w-3 h-3" /> Hot</span>}
                        <span className="text-muted-foreground">{news.time}</span>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-foreground font-medium leading-snug line-clamp-2">{news.title}</p>
                      <div className="mt-2 flex">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1
                                    ${news.impact === 'bullish' ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-red-500/30 text-red-400 bg-red-500/10'}
                                 `}>
                          {news.impact === 'bullish' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {news.symbol}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="p-2 text-gray-600 dark:text-muted-foreground hover:text-gray-900 dark:hover:text-foreground hover:bg-gray-100 dark:hover:bg-card border border-border text-card-foreground shadow-sm rounded-lg transition-colors flex items-center justify-center min-w-[36px]"
              aria-label="Toggle theme"
            >
              {!mounted ? (
                <div className="w-5 h-5 opacity-0"></div>
              ) : theme === "light" ? (
                <Sun className="w-5 h-5" />
              ) : theme === "dark" ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Monitor className="w-5 h-5" />
              )}
            </button>

            {/* Theme Menu */}
            {showThemeMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-card border border-border text-card-foreground shadow-sm rounded-lg shadow-lg border border-gray-200 dark:border-border py-2">
                {[
                  { id: "light", label: "Light", icon: Sun },
                  { id: "dark", label: "Dark", icon: Moon },
                  { id: "system", label: "System", icon: Monitor },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setTheme(id);
                      setShowThemeMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${theme === id
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "text-gray-700 dark:text-foreground/80 hover:bg-gray-50 dark:hover:bg-muted border border-border/50 text-foreground"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-card border border-border text-card-foreground shadow-sm transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-foreground text-sm font-semibold">
                {getInitials(user?.name || null)}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-foreground">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                  {user?.email || "Not logged in"}
                </p>
              </div>
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-card border border-border text-card-foreground shadow-sm rounded-lg shadow-lg border border-gray-200 dark:border-border py-2 z-50">
                {/* Profile Header */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-border">
                  <p className="text-sm font-semibold text-gray-900 dark:text-foreground">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                    {user?.email || "Not logged in"}
                  </p>
                </div>

                {/* Menu Items */}
                <button
                  onClick={handleProfileClick}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-foreground/80 hover:bg-gray-50 dark:hover:bg-muted border border-border/50 text-foreground transition-colors"
                >
                  <User className="w-4 h-4" />
                  My Profile
                </button>
                <button
                  onClick={handleSettingsClick}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-foreground/80 hover:bg-gray-50 dark:hover:bg-muted border border-border/50 text-foreground transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    router.push("/subscription");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-foreground/80 hover:bg-gray-50 dark:hover:bg-muted border border-border/50 text-foreground transition-colors"
                >
                  <CreditCard className="w-4 h-4 text-primary" />
                  Subscription & Billing
                </button>

                {/* Divider */}
                <div className="my-2 border-t border-gray-200 dark:border-border"></div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </nav>
  );
}
