/**
 * Auto-MT5 Connect Hook
 *
 * Call this once on dashboard mount. It reads the logged-in user's email
 * and asks the bridge to reconnect their saved MT5 credentials silently.
 *
 * Uses /api/bridge-status to get the current tunnel URL at runtime,
 * so changing the ngrok/Cloudflare URL in Railway env vars doesn't
 * require a Vercel redeploy.
 */
"use client";
import { useEffect, useRef } from "react";
import { useSession } from "@/lib/useSession";

export function useAutoMT5Connect(enabled: boolean = true) {
  const { data: session } = useSession();
  const attempted = useRef(false);

  useEffect(() => {
    if (!enabled || attempted.current) return;
    const email = session?.user?.email;
    if (!email) return;

    const adminEmail = (
      process.env.NEXT_PUBLIC_ADMIN_EMAIL || "rousrendo@gmail.com"
    ).toLowerCase();
    const isAdmin =
      (session?.user as any)?.role === "admin" ||
      email.toLowerCase() === adminEmail;

    // Public users use paper/journal mode — never auto-trigger private MT5 bridge
    if (!isAdmin) return;

    attempted.current = true;

    // Fetch bridge URL dynamically from server (avoids baked-in build-time URL)
    fetch("/api/bridge-status")
      .then((r) => r.json())
      .then(({ url: bridgeUrl }) => {
        if (!bridgeUrl) return;
        return fetch(`${bridgeUrl}/api/connect/auto`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({ email }),
          signal: AbortSignal.timeout(5000),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.success) {
              console.log(`[MT5] Auto-connected: ${data.message}`);
            } else {
              console.log(`[MT5] Auto-connect skipped: ${data.error}`);
            }
          });
      })
      .catch(() => {
        // Bridge not running — fail silently, user connects manually
      });
  }, [session?.user?.email]);
}
