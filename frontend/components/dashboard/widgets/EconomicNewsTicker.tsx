"use client";

import { useNews } from "@/hooks/useNews";
import { Globe, AlertCircle, Activity } from "lucide-react";

export function EconomicNewsTicker({ borderless = false }: { borderless?: boolean }) {
  const { news, loading } = useNews();

  if (loading && news.length === 0) {
    return (
      <div className={`p-6 min-h-[200px] flex items-center justify-center animate-pulse ${borderless ? "" : "rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#101014]"}`}>
        <Activity className="w-5 h-5 text-white/20 animate-spin" />
      </div>
    );
  }

  const content = (
    <div className="w-full relative z-10 flex flex-col overflow-y-auto max-h-[240px] custom-scrollbar space-y-2 font-mono text-[10px]">
      {news.length === 0 ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-550 text-center py-6">
          <AlertCircle className="w-5 h-5 mb-2 opacity-30" />
          <p className="text-[8px] uppercase tracking-widest font-bold">No Recent Events</p>
        </div>
      ) : (
        news.slice(0, 10).map((n, i) => {
          const isHighImpact = n.title.toLowerCase().includes("cpi") || 
                               n.title.toLowerCase().includes("fed") || 
                               n.title.toLowerCase().includes("rate") || 
                               n.title.toLowerCase().includes("nfp");
                               
          const impactStyles = isHighImpact
            ? { bg: "bg-[#ff5c73]/5", border: "border-l-[#ff5c73]/80", text: "text-[#ff5c73]", label: "HIGH" }
            : { bg: "bg-blue-500/5", border: "border-l-blue-500/60", text: "text-blue-400", label: "MED" };

          const decayOpacity = Math.max(0.5, 1 - (i * 0.08));

          return (
            <a 
              key={i} 
              href={n.link} 
              target="_blank" 
              rel="noreferrer"
              className={`group/item flex flex-col p-2.5 rounded-r-lg border-y border-r border-[rgba(255,255,255,0.04)]/30 border-l-2 transition-all duration-250 hover:bg-white/[0.01] ${impactStyles.border} ${impactStyles.bg}`}
              style={{ opacity: decayOpacity }}
            >
              <div className="flex justify-between items-start mb-1.5 font-bold text-[8px]">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[7.5px] font-black uppercase tracking-widest px-1 py-0.5 rounded bg-black/40 ${impactStyles.text}`}>
                    {impactStyles.label}
                  </span>
                  <span className="text-[8px] text-zinc-550 uppercase tracking-wider">
                    {n.source || "Global"}
                  </span>
                </div>
                <span className="text-zinc-650 group-hover/item:text-zinc-400 transition-colors">
                  {new Date(n.published).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[11px] text-zinc-350 font-medium leading-relaxed group-hover/item:text-white transition-colors font-sans">
                {n.title}
              </p>
            </a>
          );
        })
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );

  if (borderless) {
    return content;
  }

  return (
    <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] min-h-[200px] flex flex-col animate-fade-in relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-blue-500/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-blue-500/10 transition-colors" />

      <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.07)] flex items-center justify-between bg-black/20 relative z-10">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono">Live News Ticker</h2>
        </div>
        <div className="flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
      </div>

      <div className="p-4 flex-1">
        {content}
      </div>
    </div>
  );
}

