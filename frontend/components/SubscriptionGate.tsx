"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "@/lib/useSession";
import { usePathname } from "next/navigation";
import { Lock, ArrowRight } from "lucide-react";

export default function SubscriptionGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // While hydrating, render children transparently
  if (!isClient || status === "loading") {
    return <>{children}</>;
  }

  // Not logged in — middleware handles redirect, just render
  if (!session?.user) {
    return <>{children}</>;
  }

  const user = session.user as any;

  // ✅ Admin / Pro users — always pass through
  // isPro is stamped into the JWT by auth.ts:
  //   credentials login → always isPro: true (lifetime)
  //   Google login with admin email → isPro: true (lifetime)
  //   any other Google user → isPro: false + trialEndsAt set
  if (user.isPro === true) {
    return <>{children}</>;
  }

  // Free-trial user still within 7 days — render normally
  if (!user.isTrialExpired) {
    return <>{children}</>;
  }

  // Trial expired, not pro — show the gate (but not on /subscription itself)
  if (pathname.includes("/subscription")) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden" style={{ background: "var(--bg-base, #050508)" }}>
      {/* Blurred background preview */}
      <div className="absolute inset-0 filter blur-xl opacity-30 pointer-events-none select-none z-0">
        {children}
      </div>

      {/* Hard stop modal */}
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(5,5,8,0.85)", backdropFilter: "blur(8px)" }}>
        <div className="max-w-md w-full rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl" style={{ background: "var(--bg-card, #0d0d12)", border: "1px solid var(--border, rgba(255,255,255,0.08))" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <Lock className="w-8 h-8 text-red-500" />
          </div>

          <h2 className="text-2xl font-black mb-2" style={{ color: "var(--text-primary, #fff)", fontFamily: "Syne, sans-serif" }}>
            Trial Expired
          </h2>

          <p className="mb-8 text-sm leading-relaxed" style={{ color: "var(--text-secondary, rgba(255,255,255,0.5))" }}>
            Your 7-day free trial of Journex Pro has ended. Upgrade to regain
            access to the live MT5 bridge, sentiment analysis, and backtesting engine.
          </p>

          <button
            onClick={() => (window.location.href = "/subscription")}
            className="w-full font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-lg"
            style={{ background: "var(--accent, #00d4a1)", color: "#000" }}
          >
            Upgrade to Pro <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={async () => {
              await import("next-auth/react").then((m) => m.signOut({ redirect: false }));
              window.location.href = "/auth";
            }}
            className="mt-4 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: "var(--text-tertiary, rgba(255,255,255,0.35))" }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
