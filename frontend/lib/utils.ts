import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function resolveLocalUrl(url: string): string {
  if (!url) return "";
  if (typeof window !== "undefined") {
    const currentHost = window.location.hostname;
    if (currentHost && currentHost !== "localhost" && currentHost !== "127.0.0.1") {
      return url
        .replace(/localhost/g, currentHost)
        .replace(/127\.0\.0\.1/g, currentHost);
    }
  }
  return url;
}

/**
 * Returns the absolute backend base URL for use in fetch() calls.
 * - On production (Vercel/Railway): uses NEXT_PUBLIC_BACKEND_URL as-is.
 * - Locally: falls back to http://localhost:5000.
 * Never replaces localhost with the current window host — that caused CSP errors
 * when the Vercel domain was substituted into bridge port URLs.
 */
export function getBackendUrl(): string {
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
}
