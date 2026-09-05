"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import SubscriptionGate from "@/components/SubscriptionGate";
import { useAutoMT5Connect } from "@/hooks/useAutoMT5Connect";
import { usePathname } from "next/navigation";
import { FocusModeProvider } from "@/components/providers/FocusModeProvider";
import { PanicModeProvider } from "@/components/providers/PanicModeProvider";
import CommandPalette from "@/components/CommandPalette";
import EcosystemMapModal from "@/components/ui/EcosystemMapModal";
import PanicModeOverlay from "@/components/PanicModeOverlay";
import { BottomDock } from "@/components/layout/BottomDock";

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
  const [commandOpen, setCommandOpen] = useState(false);
  const [ecosystemOpen, setEcosystemOpen] = useState(false);
  useAutoMT5Connect();

  // Global keyboard shortcuts: Ctrl+K (Command Palette), Ctrl+M (Ecosystem Map)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when user is actively typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "m" && !isInput) {
        e.preventDefault();
        setEcosystemOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isStandalonePage =
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/subscription") ||
    pathname.startsWith("/terminal");

  if (isStandalonePage) {
    return (
      <PanicModeProvider>
        <FocusModeProvider>
          <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
          <EcosystemMapModal open={ecosystemOpen} onClose={() => setEcosystemOpen(false)} />
          <PanicModeOverlay />
          <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
            {pathname.startsWith("/subscription") && <Navbar />}
            <main className="flex-1 w-full">{children}</main>
          </div>
        </FocusModeProvider>
      </PanicModeProvider>
    );
  }

  return (
    <PanicModeProvider>
      <FocusModeProvider>
        <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
        <EcosystemMapModal open={ecosystemOpen} onClose={() => setEcosystemOpen(false)} />
        <PanicModeOverlay />
        <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
          {/* Top Bar */}
          <Navbar onMenuToggle={() => setIsMobileMenuOpen(true)} />

          {/* Body */}
          <div className="flex flex-1 overflow-hidden relative">
            {/* Desktop Sidebar */}
            <div className="hidden lg:flex flex-shrink-0">
              <Sidebar
                onOpenCommandPalette={() => setCommandOpen(true)}
                onOpenEcosystemMap={() => setEcosystemOpen(true)}
              />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
              <div className="fixed inset-0 z-50 lg:hidden flex">
                <div
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <div className="relative w-[240px] h-full shadow-2xl animate-in slide-in-from-left duration-200">
                  <Sidebar
                    onOpenCommandPalette={() => {
                      setCommandOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    onOpenEcosystemMap={() => {
                      setEcosystemOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Main Content */}
            <main
              className="flex-1 overflow-y-auto p-3 sm:p-5 pb-24"
              style={{ background: "var(--bg-base)" }}
            >
              <SubscriptionGate>
                <div className="mx-auto w-full max-w-[1600px]">
                  {children}
                </div>
              </SubscriptionGate>
            </main>

            {/* Right Sidebar */}
            <div className="flex-shrink-0 z-40">
              <RightSidebar />
            </div>
          </div>

          {/* Bottom Status Bar */}
          <div className="overflow-x-auto scrollbar-none relative z-50">
            <StatusBar />
          </div>

          <BottomDock onOpenCommandPalette={() => setCommandOpen(true)} />
        </div>
      </FocusModeProvider>
    </PanicModeProvider>
  );
}
