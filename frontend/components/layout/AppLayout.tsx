"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import SubscriptionGate from "@/components/SubscriptionGate";
import { useAutoMT5Connect } from "@/hooks/useAutoMT5Connect";

import { usePathname } from "next/navigation";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  // Silently auto-reconnect MT5 with the user's saved credentials on every dashboard load
  useAutoMT5Connect();
  const isStandalonePage = pathname === "/" || pathname.startsWith("/auth") || pathname.startsWith("/subscription");

  if (isStandalonePage) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* We can still keep the navbar on subscription page if we want, but let's just show raw children for a true landing page, or include Navbar without Sidebar. Let's include Navbar if it's subscription, but no sidebar. */}
        {pathname.startsWith("/subscription") && <Navbar />}
        <main className="flex-1 w-full">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <Navbar />

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <SubscriptionGate>
            <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">{children}</div>
          </SubscriptionGate>
        </main>
      </div>
    </div>
  );
}
