/**
 * useBridgeUrl — fetches the live MT5 bridge URL from the server at runtime.
 *
 * WHY:  NEXT_PUBLIC_ env vars are baked into the JS bundle at build time.
 *       If your ngrok/Cloudflare tunnel URL changes, you'd need a full
 *       Vercel redeploy. This hook fetches from /api/bridge-status instead,
 *       which reads the SERVER-SIDE BRIDGE_URL env var on Railway — so you
 *       only update Railway's env var and restart Railway. No Vercel redeploy.
 */
"use client";
import { useState, useEffect } from "react";

let _cachedBridgeUrl: string | null = null; // module-level cache so we only fetch once

export function useBridgeUrl() {
  const [bridgeUrl, setBridgeUrl] = useState<string>(
    _cachedBridgeUrl || process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5003"
  );
  const [loading, setLoading] = useState(!_cachedBridgeUrl);

  useEffect(() => {
    if (_cachedBridgeUrl) {
      setBridgeUrl(_cachedBridgeUrl);
      setLoading(false);
      return;
    }

    fetch("/api/bridge-status")
      .then((r) => r.json())
      .then((data) => {
        if (data.url) {
          _cachedBridgeUrl = data.url;
          setBridgeUrl(data.url);
        }
      })
      .catch(() => {
        // Fallback to baked-in env var if API fails (works locally)
      })
      .finally(() => setLoading(false));
  }, []);

  return { bridgeUrl, loading };
}
