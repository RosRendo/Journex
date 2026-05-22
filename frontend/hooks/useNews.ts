import { useState, useEffect } from "react";
import { resolveLocalUrl } from "@/lib/utils";

export interface NewsItem {
  title: string;
  link: string;
  published: string;
  source: string;
}

export function useNews(autoRefreshMs: number = 300000) { // Default 5 minutes
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const BRIDGE_URL = resolveLocalUrl(process.env.NEXT_PUBLIC_BRIDGE_URL ?? "http://localhost:5003");

  useEffect(() => {
    let mounted = true;

    const fetchNews = async () => {
      try {
        const res = await fetch(`${BRIDGE_URL}/api/news`, {
          headers: { "ngrok-skip-browser-warning": "true" }
        });
        if (!res.ok) throw new Error("Network response was not ok");
        const data = await res.json();
        
        if (!mounted) return;

        if (data.success && data.news) {
          setNews(data.news);
          setError(null);
        } else {
          setError(data.error || "Failed to fetch news");
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Failed to fetch");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchNews();
    
    if (autoRefreshMs > 0) {
      const interval = setInterval(fetchNews, autoRefreshMs);
      return () => {
        mounted = false;
        clearInterval(interval);
      };
    }

    return () => {
      mounted = false;
    };
  }, [BRIDGE_URL, autoRefreshMs]);

  return { news, loading, error };
}
