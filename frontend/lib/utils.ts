import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getSession } from "next-auth/react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

let cachedSessionPromise: Promise<any> | null = null;
let sessionFetchTime = 0;

export async function getCachedSession() {
  const now = Date.now();
  // Cache the session for 60 seconds to prevent /api/auth/session spam
  if (!cachedSessionPromise || now - sessionFetchTime > 60_000) {
    cachedSessionPromise = getSession();
    sessionFetchTime = now;
  }
  return cachedSessionPromise;
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("ngrok-skip-browser-warning", "true");
  try {
    const session = await getCachedSession();
    const token = (session?.user as any)?.apiToken;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  } catch (err) {
    console.warn("Failed to get session for fetchWithAuth", err);
  }
  
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    cachedSessionPromise = null; // Clear cache if token is invalid
  }
  return res;
}

export function resolveLocalUrl(url: string): string {
  if (!url) return "";
  if (typeof window !== "undefined") {
    const currentHost = window.location.hostname;
    const isLocalHost = currentHost === "localhost" || 
                        currentHost === "127.0.0.1" || 
                        currentHost === "0.0.0.0" ||
                        currentHost.startsWith("192.168.") || 
                        currentHost.startsWith("10.") || 
                        currentHost.startsWith("172.") || 
                        currentHost.endsWith(".local");
                        
    if (isLocalHost && currentHost !== "localhost" && currentHost !== "127.0.0.1") {
      return url
        .replace(/localhost/g, currentHost)
        .replace(/127\.0\.0\.1/g, currentHost);
    }
  }
  return url;
}

/**
 * Returns the absolute backend base URL for use in fetch() calls.
 * - On production (Vercel/Railway): uses NEXT_PUBLIC_BACKEND_URL/NEXT_PUBLIC_API_URL or falls back to production domain.
 * - Locally: falls back to http://localhost:5000.
 */
export function getBackendUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  return ""; // Default to relative paths so Next.js rewrites can proxy requests
}

/**
 * Returns a robustly formatted WebSocket URL pointing to the backend.
 *
 * Priority:
 *  1. NEXT_PUBLIC_WS_URL  (explicit WS override, e.g. wss://api.example.com)
 *  2. NEXT_PUBLIC_BACKEND_URL / NEXT_PUBLIC_API_URL converted to ws://
 *  3. Local fallback: ws://localhost:5000  (Next.js at :3000 cannot proxy WS upgrades)
 */
export function getWebSocketUrl(path: string): string {
  const cleanPath = path.replace(/^\//, "");

  // 1. Dedicated WS URL env var (highest priority)
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (wsUrl) {
    const base = wsUrl.replace(/\/$/, "");
    return `${base}/${cleanPath}`;
  }

  // 2. HTTP backend URL — convert protocol to ws/wss
  const backend = getBackendUrl();
  if (backend) {
    try {
      const base = (typeof window !== "undefined") ? window.location.origin : "http://localhost:5000";
      const url = new URL(backend, base);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      const basePath = url.pathname.replace(/\/$/, "");
      url.pathname = `${basePath}/${cleanPath}`;
      return url.toString().replace(/([^:]\/)\/+/g, "$1");
    } catch {
      const isLocalhost = backend.includes("localhost") || backend.includes("127.0.0.1");
      const proto = (backend.startsWith("http://") || backend.startsWith("ws://") || isLocalhost) ? "ws://" : "wss://";
      const domain = backend.replace(/^(https?|wss?):\/\//i, "").replace(/\/$/, "");
      return `${proto}${domain}/${cleanPath}`;
    }
  }

  // 3. Local fallback: MUST go directly to the Express server port.
  //    Next.js at :3000 cannot proxy WebSocket upgrade requests via rewrites.
  if (typeof window !== "undefined") {
    const isSecure = window.location.protocol === "https:";
    const proto = isSecure ? "wss:" : "ws:";
    const hostname = window.location.hostname; // e.g. "localhost" or "192.168.x.x"
    // Use port 5000 (Express backend) — NOT window.location.host which is :3000
    const port = isSecure ? "" : ":5000";
    return `${proto}//${hostname}${port}/${cleanPath}`;
  }

  return `ws://localhost:5000/${cleanPath}`;
}

