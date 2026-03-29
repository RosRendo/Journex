"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Zap,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Sparkles,
  Gem,
  AlertCircle,
} from "lucide-react";

type Plan = "Starter" | "Pro" | "Lifetime";

const PLANS: {
  id: Plan;
  name: string;
  price: string;
  period: string;
  tagline: string;
  featured: boolean;
  trial: boolean;
  features: string[];
  icon?: any;
  buttonLabel: string;
  buttonClass: string;
}[] = [
  {
    id: "Starter",
    name: "Starter",
    price: "$29",
    period: "/mo",
    tagline: "For beginners building their first trading strategy.",
    featured: false,
    trial: false,
    features: [
      "Live Economic Calendar",
      "Basic CSV Journaling",
      "Standard Dark/Light Theme",
      "Limited Macro News Feed",
    ],
    buttonLabel: "Get Starter",
    buttonClass: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  },
  {
    id: "Pro",
    name: "Pro",
    price: "$49",
    period: "/mo",
    tagline: "Our complete suite with real‑time MT5 bridge and AI execution.",
    featured: true,
    trial: true,
    features: [
      "Real-time MT5 Terminal Integration",
      "Unlimited Backtesting Replay Engine",
      "Webhook Trade Copier (Master/Slave)",
      "Live Economic Calendar + Sentiment AI",
      "Real-time Breaking News Toasts",
      "Priority 24/7 Customer Support",
    ],
    buttonLabel: "Start 7-Day Free Trial",
    buttonClass:
      "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20",
  },
  {
    id: "Lifetime",
    name: "Lifetime",
    price: "$499",
    period: "/once",
    tagline: "Pay once, own the platform forever. No recurring fees.",
    featured: false,
    trial: false,
    features: [
      "Everything in Pro Plan",
      "Zero Monthly Subscription Fees",
      "Lifetime Access to New Strategies",
      "Direct Developer Line",
    ],
    buttonLabel: "Get Lifetime Access",
    buttonClass:
      "bg-[#1e1e24] text-white hover:bg-black border border-white/10",
  },
];

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (plan: Plan) => {
    setError(null);

    // Must be logged in
    if (!session?.user) {
      router.push("/auth?callbackUrl=/subscription");
      return;
    }

    setLoading(plan);
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const res = await fetch(`${backendUrl}/api/polar/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email: session.user.email }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        // If backend isn't configured yet, show a friendly message
        setError(
          data.error ??
            "Payment gateway not configured. Please ensure your backend is running.",
        );
        setLoading(null);
        return;
      }

      // Redirect to Polar's hosted checkout page
      window.location.href = data.url;
    } catch (err) {
      setError("Network error — could not connect to payment gateway.");
      setLoading(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 bg-background min-h-[80vh] flex flex-col justify-center">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
          Upgrade to{" "}
          <span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">
            TradeKiller Pro
          </span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Unlock institutional‑grade tools — live MT5 bridge, AI sentiment,
          unlimited backtesting, and deep journaling. Cancel any time.
        </p>

        {/* Not‑configured warning */}
        {error && (
          <div className="mt-6 inline-flex items-start gap-3 max-w-lg mx-auto px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm text-left">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto w-full">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-3xl overflow-hidden transition-all duration-300 ${
              plan.featured
                ? "border-2 border-primary bg-card shadow-2xl shadow-primary/20 scale-105 z-10"
                : "border border-border bg-card hover:border-border/80"
            }`}
          >
            {/* Top gradient bar on featured */}
            {plan.featured && (
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />
            )}

            <div className="p-8 flex flex-col flex-1">
              {/* Plan name + badge */}
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  {plan.name}
                  {plan.id === "Lifetime" && (
                    <Gem className="w-5 h-5 text-amber-500" />
                  )}
                </h2>
                {plan.featured && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                    <Zap className="w-3.5 h-3.5" fill="currentColor" /> Popular
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="flex items-baseline mb-4">
                <span className="text-5xl font-extrabold tracking-tight text-foreground">
                  {plan.price}
                </span>
                <span className="text-base text-muted-foreground ml-1 font-medium">
                  {plan.period}
                </span>
              </div>

              {/* Tagline */}
              <p className="text-muted-foreground text-sm mb-4 min-h-[40px]">
                {plan.tagline}
              </p>

              {/* Trial badge */}
              {plan.trial && (
                <p className="text-sm font-bold text-primary mb-4 animate-pulse">
                  ✦ Includes 7-Day Free Trial — no charge until it ends
                </p>
              )}

              {/* Feature list */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm font-medium text-foreground"
                  >
                    {plan.id === "Lifetime" ? (
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    ) : plan.featured ? (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                    )}
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA button */}
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading !== null}
                className={`w-full relative group py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 overflow-hidden ${plan.buttonClass} disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {/* Shimmer on featured */}
                {plan.featured && (
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                )}

                {loading === plan.id ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
                    Redirecting to Polar…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {plan.buttonLabel}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </button>

              {/* Trust badges on featured */}
              {plan.featured && (
                <div className="mt-4 flex flex-col items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                    Secure Checkout via Polar
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                    Card required. Not billed until trial ends.
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
