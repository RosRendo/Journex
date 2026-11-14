"use client";

import { useState, useEffect } from "react";
import { resolveLocalUrl } from "@/lib/utils";

let _cachedBridgeUrl: string | null = null;

export function useBridgeUrl() {
  const [bridgeUrl, setBridgeUrl] = useState<string>("/api/bridge");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLocalHost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (isLocalHost) {
        // In local development, allow direct localhost:5003 or custom localStorage override
        const customUrl = localStorage.getItem("bridge_url");
        if (customUrl) {
          const resolved = resolveLocalUrl(customUrl);
          _cachedBridgeUrl = resolved;
          setBridgeUrl(resolved);
          return;
        }
        setBridgeUrl(process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge");
      } else {
        // In production (Vercel, custom domain), ALWAYS use same-origin relative proxy /api/bridge.
        // This guarantees zero CORS errors and zero Mixed Content blocks in the browser.
        try {
          localStorage.removeItem("bridge_url");
        } catch (_) {}
        _cachedBridgeUrl = "/api/bridge";
        setBridgeUrl("/api/bridge");
      }
    }
  }, []);

  return { bridgeUrl, loading };
}
