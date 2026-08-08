"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Terminal, BookOpen, TrendingUp, Globe, 
  GraduationCap, User, Plus
} from "lucide-react";

export function BottomDock({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);

  const navItems = [
    { id: "dashboard", href: "/dashboard", icon: LayoutDashboard, tooltip: "Dashboard" },
    { id: "terminal", href: "/terminal", icon: Terminal, tooltip: "Terminal" },
    { id: "journal", href: "/journal", icon: BookOpen, tooltip: "Journal" },
  ];

  const secondaryItems: Array<{ id: string; href: string; icon: any; tooltip: string; action?: () => void }> = [
    { id: "macro", href: "/macro/XAUUSD", icon: TrendingUp, tooltip: "Macro" },
    { id: "markets", href: "/news", icon: Globe, tooltip: "Markets" },
    { id: "education", href: "/lessons", icon: GraduationCap, tooltip: "Lessons" },
    { id: "profile", href: "/profile", icon: User, tooltip: "Profile" },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] group">
      {/* Invisible hover zone to expand the dock if we wanted an auto-hide feature. For now it's always visible but fades in opacities. */}
      <div 
        className="flex items-center gap-2 px-4 py-3 rounded-full border border-white/10 backdrop-blur-2xl shadow-2xl transition-all duration-300 opacity-60 hover:opacity-100 hover:scale-105"
        style={{ background: "rgba(12, 12, 15, 0.75)" }}
      >
        {navItems.map((item) => (
          <div key={item.id} className="relative flex flex-col items-center">
            {hovered === item.id && (
              <span className="absolute -top-10 px-2 py-1 bg-black text-white text-[10px] rounded border border-white/10 font-bold tracking-widest uppercase">
                {item.tooltip}
              </span>
            )}
            <Link 
              href={item.href}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
              className={`p-2.5 rounded-full transition-all duration-300 ${pathname.startsWith(item.href) ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
            >
              <item.icon className="w-5 h-5" />
            </Link>
          </div>
        ))}

        {/* Central Action Button */}
        <div className="relative flex flex-col items-center mx-2">
           {hovered === "quick-action" && (
              <span className="absolute -top-10 px-2 py-1 bg-blue-500 text-white text-[10px] rounded border border-blue-400 font-bold tracking-widest uppercase whitespace-nowrap">
                Quick Action (⌘K)
              </span>
           )}
           <button 
             onClick={onOpenCommandPalette}
             onMouseEnter={() => setHovered("quick-action")}
             onMouseLeave={() => setHovered(null)}
             className="p-3 rounded-full bg-blue-500 hover:bg-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-300 hover:scale-110"
           >
             <Plus className="w-6 h-6" />
           </button>
        </div>

        {secondaryItems.map((item) => (
          <div key={item.id} className="relative flex flex-col items-center">
            {hovered === item.id && (
              <span className="absolute -top-10 px-2 py-1 bg-black text-white text-[10px] rounded border border-white/10 font-bold tracking-widest uppercase">
                {item.tooltip}
              </span>
            )}
            {item.action ? (
               <button 
                onClick={item.action}
                onMouseEnter={() => setHovered(item.id)}
                onMouseLeave={() => setHovered(null)}
                className={`p-2.5 rounded-full transition-all duration-300 text-gray-400 hover:text-white hover:bg-white/5`}
              >
                <item.icon className="w-5 h-5" />
              </button>
            ) : (
               <Link 
                href={item.href}
                onMouseEnter={() => setHovered(item.id)}
                onMouseLeave={() => setHovered(null)}
                className={`p-2.5 rounded-full transition-all duration-300 ${pathname.startsWith(item.href) ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              >
                <item.icon className="w-5 h-5" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
