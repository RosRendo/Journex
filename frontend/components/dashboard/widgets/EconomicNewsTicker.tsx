import { useNews } from "@/hooks/useNews";
import { Globe, AlertCircle, ExternalLink, Activity } from "lucide-react";

export function EconomicNewsTicker() {
  const { news, loading } = useNews();

  if (loading && news.length === 0) {
    return (
      <div className="rounded-xl border border-[--border] bg-[--bg-card] p-6 h-full flex items-center justify-center animate-pulse">
        <Activity className="w-6 h-6 text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[--border] bg-[--bg-card] h-full flex flex-col shadow-lg animate-fade-in relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-blue-500/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-blue-500/10 transition-colors" />

      <div className="p-5 border-b border-[--border] flex items-center justify-between relative z-10" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-white">Live News Ticker</h2>
        </div>
        <div className="flex h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
      </div>

      <div className="flex-1 w-full relative z-10 flex flex-col overflow-y-auto p-4 custom-scrollbar space-y-4">
        {news.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 text-center">
            <AlertCircle className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-xs uppercase tracking-widest font-bold">No Recent Events</p>
          </div>
        ) : (
          news.slice(0, 10).map((n, i) => {
            const isHighImpact = n.title.toLowerCase().includes("cpi") || 
                                 n.title.toLowerCase().includes("fed") || 
                                 n.title.toLowerCase().includes("rate") || 
                                 n.title.toLowerCase().includes("nfp");

            return (
              <a 
                key={i} 
                href={n.link} 
                target="_blank" 
                rel="noreferrer"
                className="group/item flex flex-col p-3 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isHighImpact ? "text-yellow-400" : "text-blue-400"}`}>
                    {n.source || "Global"} {isHighImpact && "• HIGH IMPACT"}
                  </span>
                  <span className="text-[10px] text-gray-500 group-hover/item:text-gray-300 font-mono transition-colors">
                    {new Date(n.published).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-gray-300 font-medium leading-relaxed group-hover/item:text-white transition-colors">
                  {n.title}
                </p>
                <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                  Read full story <ExternalLink className="w-3 h-3" />
                </div>
              </a>
            );
          })
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
