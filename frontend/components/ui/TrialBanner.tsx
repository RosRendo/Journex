"use client";

import { useSession } from "@/lib/useSession";
import { useRouter } from "next/navigation";
import { Clock, Zap, X } from "lucide-react";
import { useState } from "react";

export function TrialBanner() {
  const { data: session } = useSession();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const user = session?.user as any;

  // Don't show if: no session, pro user, lifetime, dismissed, or no trial set
  if (
    !session ||
    user?.isPro ||
    user?.plan === "lifetime" ||
    user?.trialDaysLeft === null ||
    user?.trialDaysLeft === undefined ||
    dismissed
  ) {
    return null;
  }

  const days = user.trialDaysLeft as number;
  const isUrgent = days <= 2;
  const isWarning = days <= 5;

  const accentColor = isUrgent
    ? "rgba(255,77,106,0.15)"
    : isWarning
    ? "rgba(245,158,11,0.12)"
    : "rgba(0,212,161,0.1)";
  const borderColor = isUrgent
    ? "rgba(255,77,106,0.4)"
    : isWarning
    ? "rgba(245,158,11,0.35)"
    : "rgba(0,212,161,0.3)";
  const textColor = isUrgent
    ? "var(--loss)"
    : isWarning
    ? "var(--warning)"
    : "var(--profit)";

  return (
    <div
      className="fixed bottom-5 right-5 z-[200] flex items-center gap-4 px-4 py-3 rounded-2xl border shadow-2xl max-w-[380px] backdrop-blur-md transition-all duration-300"
      style={{
        background: accentColor,
        borderColor: borderColor,
        boxShadow: `0 8px 32px ${accentColor}`,
      }}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: accentColor, border: `1px solid ${borderColor}` }}
      >
        <Clock className="w-4 h-4" style={{ color: textColor }} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
          {days === 0
            ? "Your free trial ends today!"
            : `${days} day${days === 1 ? "" : "s"} left in your free trial`}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
          Unlock Pro to keep access after your trial.
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={() => router.push("/subscription")}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider shrink-0 transition-all hover:scale-105"
        style={{ background: textColor, color: "#000" }}
      >
        <Zap className="w-3 h-3" />
        Upgrade
      </button>

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
        style={{ color: "var(--text-tertiary)" }}
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
