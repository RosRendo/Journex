"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { Lock, ArrowRight } from "lucide-react";

export default function SubscriptionGate({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [isClient, setIsClient] = useState(false);
    const [isPro, setIsPro] = useState<boolean | null>(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        const fetchStatus = async () => {
            if (!session?.user) {
                setIsPro(null);
                return;
            }

            try {
                const res = await fetch("/api/subscription/status");
                if (!res.ok) {
                    setIsPro(null);
                    return;
                }
                const data = (await res.json()) as {
                    isPro: boolean;
                };
                setIsPro(data.isPro);
            } catch {
                setIsPro(null);
            }
        };

        fetchStatus();
    }, [session?.user]);

    if (!isClient || status === "loading" || isPro === null) {
        return <>{children}</>;
    }

    // If user is not logged in at all, middleware handles redirecting to /auth.
    if (!session?.user) {
        return <>{children}</>;
    }

    if (isPro) {
        return <>{children}</>;
    }

    // If they are not pro, block them from everything except the subscription page
    if (!isPro && !pathname.includes("/subscription")) {
        return (
            <div className="relative w-full h-full min-h-screen overflow-hidden bg-background">
                {/* Render children in background, heavily blurred so they can "see" what they are missing */}
                <div className="absolute inset-0 filter blur-xl opacity-40 pointer-events-none select-none z-0">
                    {children}
                </div>

                {/* The hard stop modal */}
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                    <div className="max-w-md w-full bg-card border border-border shadow-2xl rounded-2xl p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                            <Lock className="w-8 h-8 text-red-500" />
                        </div>

                        <h2 className="text-2xl font-bold text-foreground mb-2">
                            Trial Expired
                        </h2>

                        <p className="text-muted-foreground mb-8">
                            Your 7-day free trial of TradeKiller Pro has ended. You've lost access to the live MT5 bridge, sentiment analysis, and backtesting engine.
                        </p>

                        <button
                            onClick={() => window.location.href = "/subscription"}
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary/20"
                        >
                            Upgrade to Pro <ArrowRight className="w-5 h-5" />
                        </button>

                        <button
                            onClick={async () => {
                                await import("next-auth/react").then(m => m.signOut({ redirect: false }));
                                window.location.href = "/auth";
                            }}
                            className="mt-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // If they aren't expired (still within 7 days) and not Pro, just render the dashboard normally
    return <>{children}</>;
}
