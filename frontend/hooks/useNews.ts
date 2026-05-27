import { useState, useEffect } from "react";
import { getBackendUrl } from "@/lib/utils";
import { getSession } from "next-auth/react";

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

  useEffect(() => {
    let mounted = true;

    const fetchNews = async () => {
      try {
        const backendUrl = getBackendUrl();
        const session = await getSession();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (session?.user?.email) {
          headers["Authorization"] = `Bearer ${session.user.email}`;
        }
        
        const res = await fetch(`${backendUrl}/api/bridge/api/news`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
  }, [autoRefreshMs]);

  return { news, loading, error };
}
