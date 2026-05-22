/**
 * useBridgeUrl — fetches the live MT5 bridge URL from the server at runtime.
 *
 * WHY:  NEXT_PUBLIC_ env vars are baked into the JS bundle at build time.
 *       If your ngrok/Cloudflare tunnel URL changes, you'd need a full
 *       Vercel redeploy. This hook fetches from /api/bridge-status instead,
 *       which reads the SERVER-SIDE BRIDGE_URL env var on Railway — so you
 *       only update Railway's env var and restart Railway. No Vercel redeploy.
 *
 * UPDATE: Support for per-user custom bridge URLs via localStorage!
 */
"use client";
import { useState, useEffect } from "react";
import { resolveLocalUrl } from "@/lib/utils";

let _cachedBridgeUrl: string | null = null; // module-level cache so we only fetch once

export function useBridgeUrl() {
  const [bridgeUrl, setBridgeUrl] = useState<string>(() =>
    resolveLocalUrl(_cachedBridgeUrl || process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5003")
  );
  const [loading, setLoading] = useState(!_cachedBridgeUrl);

  useEffect(() => {
    // 1. Check if the user has set a custom bridge URL in their browser
    if (typeof window !== "undefined") {
      const customUrl = localStorage.getItem("bridge_url");
      if (customUrl) {
        const resolved = resolveLocalUrl(customUrl);
        _cachedBridgeUrl = resolved;
        setBridgeUrl(resolved);
        setLoading(false);
        return;
      }
    }

    if (_cachedBridgeUrl) {
      setBridgeUrl(resolveLocalUrl(_cachedBridgeUrl));
      setLoading(false);
      return;
    }

    // 2. Otherwise fetch the global one from backend
    fetch("/api/bridge-status")
      .then((r) => r.json())
      .then((data) => {
        if (data.url) {
          const resolved = resolveLocalUrl(data.url);
          _cachedBridgeUrl = resolved;
          setBridgeUrl(resolved);
        }
      })
      .catch(() => {
        // Fallback to baked-in env var if API fails (works locally)
      })
      .finally(() => setLoading(false));
  }, []);

  return { bridgeUrl, loading };
}
