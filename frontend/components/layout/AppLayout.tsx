"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { PrimarySidebar } from "@/components/layout/SidebarNav";
import { RightSidebar } from "@/components/layout/RightSidebar";
import SubscriptionGate from "@/components/SubscriptionGate";
import { useAutoMT5Connect } from "@/hooks/useAutoMT5Connect";
import { usePathname } from "next/navigation";

interface AppLayoutProps {
  children: React.ReactNode;
}

function StatusBar() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="flex-shrink-0 h-9 flex items-center justify-between px-5 text-[10px] tracking-wider font-mono border-t"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-tertiary)" }}
    >
      <div className="flex items-center gap-5">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[--bull] animate-pulse" />
          <span style={{ color: "var(--text-secondary)" }}>Connected</span>
        </span>
        <span>EURUSD 0.8</span>
        <span>XAUUSD 0.12</span>
        <span>GBPUSD 1.1</span>
      </div>
      <div className="flex items-center gap-5">
        <span>UTC {time.toUTCString().slice(17, 22)}</span>
        <span style={{ color: "var(--text-secondary)" }}>Trader Mode</span>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  useAutoMT5Connect();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isStandalonePage =
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/subscription");

  if (isStandalonePage) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
        {pathname.startsWith("/subscription") && <Navbar />}
        <main className="flex-1 w-full">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
      {/* Top Bar */}
      <Navbar onMenuToggle={() => setIsMobileMenuOpen(true)} />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex flex-shrink-0">
          <PrimarySidebar />
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <div className="relative w-[240px] h-full shadow-2xl animate-in slide-in-from-left duration-200">
              <PrimarySidebar />
            </div>
          </div>
        )}

        {/* Main Content */}
        <main
          className="flex-1 overflow-y-auto p-3 sm:p-5"
          style={{ background: "var(--bg-base)" }}
        >
          <SubscriptionGate>
            <div className="mx-auto w-full max-w-[1600px]">
              {children}
            </div>
          </SubscriptionGate>
        </main>

        {/* Right Sidebar - Hidden on mobile, visible on huge screens contextually */}
        <div className="hidden xl:flex flex-shrink-0">
          <RightSidebar />
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="overflow-x-auto scrollbar-none">
        <StatusBar />
      </div>
    </div>
  );
}
