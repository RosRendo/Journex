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
