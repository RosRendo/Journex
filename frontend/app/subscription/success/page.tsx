"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";

export default function SubscriptionSuccessPage() {
  const params = useSearchParams();
  const plan = params.get("plan") ?? "Pro";
  const [dots, setDots] = useState(".");

  // Animate loading dots while session refreshes
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-3xl p-10 flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-500">

        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-8">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>

        <h1 className="text-3xl font-extrabold text-foreground mb-3 tracking-tight">
          You&apos;re In! 🎉
        </h1>

        <p className="text-muted-foreground mb-2">
          Welcome to <strong className="text-foreground">TradeKiller {plan}</strong>.
          Your payment was processed successfully.
        </p>

        {plan === "Pro" && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 w-full text-sm text-primary font-medium">
            <Sparkles className="inline w-4 h-4 mr-1.5 -mt-0.5" />
            Your <strong>7-day free trial</strong> starts today. You won&apos;t be charged until it ends.
          </div>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          Your account is being activated{dots}
        </p>

        <Link
          href="/dashboard"
          className="mt-8 w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all group shadow-lg shadow-primary/20"
        >
          Open Dashboard
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          href="/subscription"
          className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View subscription details
        </Link>
      </div>
    </div>
  );
}
