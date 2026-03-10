/**
 * Auto-MT5 Connect Hook
 * 
 * Call this once on dashboard mount. It reads the logged-in user's email
 * and asks the bridge to reconnect their saved MT5 credentials silently.
 */
"use client";
import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const BRIDGE = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5000/bridge";

export function useAutoMT5Connect() {
    const { data: session } = useSession();
    const attempted = useRef(false);

    useEffect(() => {
        if (attempted.current) return;
        const email = session?.user?.email;
        if (!email) return;

        attempted.current = true;

        fetch(`${BRIDGE}/api/connect/auto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
            signal: AbortSignal.timeout(5000),
        })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    console.log(`[MT5] Auto-connected: ${data.message}`);
                    // Optionally show a quiet toast
                    // toast.success(`MT5 reconnected: ${data.account?.login}`, { duration: 3000 });
                } else {
                    // No saved credentials or outdated — user needs to connect manually once
                    console.log(`[MT5] Auto-connect skipped: ${data.error}`);
                }
            })
            .catch(() => {
                // Bridge not running — fail silently
            });
    }, [session?.user?.email]);
}
