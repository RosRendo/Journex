"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useCsvTrades } from "@/hooks/useCsvTrades";
import { useJournalData } from "@/hooks/useJournalData";
import { getPairDigits } from "@/lib/format";
import { fetchWithAuth, getBackendUrl } from "@/lib/utils";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, Save, Upload, Camera, X, CheckCircle2, Star, FileText, Brain, AlertTriangle, ChevronDown, ChevronUp, BookOpen, Target, Maximize2, Minimize2, Play, Plus, Link as LinkIcon } from "lucide-react";
import AutoScreenshotModal from "@/components/AutoScreenshotModal";
import TradeDetailChart from "@/components/journal/TradeDetailChart";

const TradingViewWidget = dynamic(() => import("@/components/ui/TradingViewWidget"), { ssr: false });

function gradeColor(g: string) {
  if (g === "A+" || g === "A") return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
  if (g === "B") return "text-blue-400 border-blue-500/30 bg-blue-500/10";
  if (g === "C") return "text-amber-400 border-amber-500/30 bg-amber-500/10";
  return "text-rose-400 border-rose-500/30 bg-rose-500/10";
}

function Section({ title, icon, action, children, collapsible = false }: { title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; collapsible?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0e0e13] overflow-hidden">
      <div className="w-full flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#0c0c11]">
        <div className="flex items-center gap-2 text-[9.5px] font-bold uppercase tracking-widest text-zinc-400">{icon} {title}</div>
        <div className="flex items-center gap-2">
          {action}
          {collapsible && (
            <button onClick={() => setOpen(o => !o)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
              {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function CheckItem({ label, checked, onChange }: { label: string; checked?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-left transition-all text-[11px] font-medium ${checked ? "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-300" : "border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:text-zinc-300 hover:bg-white/[0.03]"}`}>
      {checked ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-zinc-600 shrink-0" />}
      {label}
    </button>
  );
}

function PillSelect({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt === value ? "" : opt)} className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${value === opt ? "border-white/25 bg-white/15 text-white" : "border-white/[0.07] bg-white/[0.02] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"}`}>{opt}</button>
      ))}
    </div>
  );
}

export default function TradeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { trades, loading } = useCsvTrades();
  const trade = trades.find(t => String(t.ticket || t.id) === id || String(t.id) === id);
  const tradeKey = trade ? String(trade.ticket || trade.id) : undefined;
  const { entry, saveEntry } = useJournalData(tradeKey);
  const [chartExpanded, setChartExpanded] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState<string | null>(null);
  const [screenshotTab, setScreenshotTab] = useState<"chart" | "screenshots" | "liveTv">("chart");
  const [grade, setGrade] = useState("");
  const [mistake, setMistake] = useState("");
  const [replayTrigger, setReplayTrigger] = useState(0);
  const [availableLessons, setAvailableLessons] = useState<any[]>([]);
  const [showAutoScreenshotModal, setShowAutoScreenshotModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setGrade((entry as any).grade || ""); setMistake((entry as any).mistake || ""); }, [entry]);

  const [strategies, setStrategies] = useState(["Trend Following","Breakout","Reversal","Pullback","Supply / Demand","News Trading"]);
  const [emotions, setEmotions] = useState(["Calm","Confident","FOMO","Revenge","Anxious","Greedy","Frustrated"]);
  const mistakeOptions = ["Entered early","Moved SL","Over-leveraged","Ignored news","Revenge trade","No clear setup","Chased entry"];

  useEffect(() => {
    fetchWithAuth(`${getBackendUrl()}/api/settings`).then(r => r.json()).then(d => {
      if (d?.data?.strategies?.length) setStrategies(d.data.strategies);
      if (d?.data?.emotions?.length) setEmotions(d.data.emotions);
    }).catch(() => {});

    fetchWithAuth(`${getBackendUrl()}/api/lessons`).then(r => r.json()).then(d => {
      if (d?.success && d?.lessons) setAvailableLessons(d.lessons);
    }).catch(() => {});
  }, []);

  const handleAddStrategy = async () => {
    const newVal = prompt("Enter new Strategy name:");
    if (!newVal || !newVal.trim()) return;
    const updated = [...strategies, newVal.trim()];
    setStrategies(updated);
    await fetchWithAuth(`${getBackendUrl()}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategies: updated }),
    });
  };

  const handleDeleteStrategy = async (strat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to remove the strategy "${strat}"?`)) return;
    const updated = strategies.filter(s => s !== strat);
    setStrategies(updated);
    await fetchWithAuth(`${getBackendUrl()}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategies: updated }),
    });
  };

  const handleAddEmotion = async () => {
    const newVal = prompt("Enter new Emotional State:");
    if (!newVal || !newVal.trim()) return;
    const updated = [...emotions, newVal.trim()];
    setEmotions(updated);
    await fetchWithAuth(`${getBackendUrl()}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emotions: updated }),
    });
  };

  const handleDeleteEmotion = async (emotion: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to remove the emotion "${emotion}"?`)) return;
    const updated = emotions.filter(eItem => eItem !== emotion);
    setEmotions(updated);
    await fetchWithAuth(`${getBackendUrl()}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emotions: updated }),
    });
  };

  const syncUrlToLesson = async (url: string, showToast = true) => {
    if (!entry.linkedLessonId || !trade) return;
    const lesson = availableLessons.find(l => l.id === entry.linkedLessonId);
    if (!lesson) return;
    const newImages = [
      ...(lesson.images || []),
      {
        id: Date.now().toString() + Math.random().toString(),
        url,
        note: `Journal Trade: ${trade.pair} ${trade.direction}`,
        uploadedAt: new Date().toISOString(),
        profit: trade.profit,
        tradeDate: trade.date,
        pair: trade.pair,
        direction: trade.direction,
        strategy: entry.strategy,
        emotion: entry.emotion,
      },
    ];
    try {
      await fetchWithAuth(`${getBackendUrl()}/api/lessons/${entry.linkedLessonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: newImages }),
      });
      setAvailableLessons(prev => prev.map(l => l.id === entry.linkedLessonId ? { ...l, images: newImages } : l));
      if (showToast) toast.success("Image synced to Lesson!");
    } catch (e) {
      console.error(e);
    }
  };

  const uploadAndSyncImageFile = async (file: File) => {
    const toastId = toast.loading("Uploading image...");
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetchWithAuth(`${getBackendUrl()}/api/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const url = data.data.url;
      const nextImgs = [...(entry.images || []), url];
      saveEntry({ images: nextImgs });
      setActiveScreenshot(url);
      if (entry.linkedLessonId) {
        await syncUrlToLesson(url, false);
        toast.success("Uploaded & synced to Lesson!", { id: toastId });
      } else {
        toast.success("Uploaded!", { id: toastId });
      }
    } catch {
      toast.error("Upload failed", { id: toastId });
    }
  };

  const handlePasteUrl = async () => {
    const url = prompt("Paste TradingView or Image URL:");
    if (!url || !url.trim()) return;
    const nextImgs = [...(entry.images || []), url.trim()];
    saveEntry({ images: nextImgs });
    setActiveScreenshot(url.trim());
    if (entry.linkedLessonId) {
      await syncUrlToLesson(url.trim());
    } else {
      toast.success("Image link attached!");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5 MB"); return; }
    await uploadAndSyncImageFile(file);
  };

  const removeImage = (img: string) => {
    const next = (entry.images || []).filter(i => i !== img);
    saveEntry({ images: next });
    if (activeScreenshot === img) setActiveScreenshot(next[0] || null);
  };

  const save = () => { saveEntry({ ...(entry as any), grade, mistake } as any); toast.success("Journal saved"); };

  const sorted = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const idx = sorted.findIndex(t => String(t.ticket || t.id) === id || String(t.id) === id);
  const prevT = idx > 0 ? sorted[idx - 1] : undefined;
  const nextT = idx < sorted.length - 1 ? sorted[idx + 1] : undefined;
  const goTo = (t: typeof trade | null | undefined) => t && router.push(`/journal/trade/${t.ticket || t.id}`);

  if (loading) return <div className="flex items-center justify-center h-screen bg-[#09090b]"><div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" /></div>;
  if (!trade) return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#09090b] text-zinc-400 gap-4">
      <AlertTriangle className="w-10 h-10 text-amber-500" /><p className="text-sm font-bold">Trade not found</p>
      <button onClick={() => router.push("/journal")} className="px-4 py-2 rounded-lg border border-white/10 text-xs hover:bg-white/5">Back to Journal</button>
    </div>
  );

  const isWin = trade.profit > 0; const isBE = trade.profit === 0;
  const digits = getPairDigits(trade.pair);
  const imgs = entry.images || [];
  const displayImg = activeScreenshot || (imgs.length > 0 ? imgs[0] : null);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] font-sans flex flex-col">
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-5 h-12 border-b border-white/[0.07] bg-[#0b0b0f] sticky top-0 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/journal")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.07] text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white hover:border-white/15 transition-all font-mono"><ChevronLeft className="w-3 h-3" /> Journal</button>
          <div className="h-4 w-px bg-white/[0.07]" />
          <span className="text-sm font-black text-white font-mono">{trade.pair}</span>
          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${trade.direction === "Long" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20"}`}>{trade.direction}</span>
          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${isWin ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : isBE ? "bg-zinc-700 text-zinc-400 border-zinc-600" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>{isWin ? "WIN" : isBE ? "BE" : "LOSS"}</span>
          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">#{trade.ticket || trade.id} - {new Date(trade.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => goTo(nextT)} disabled={!nextT} className="p-1.5 rounded border border-white/[0.07] text-zinc-400 hover:text-white disabled:opacity-25 transition-all"><ChevronLeft className="w-3.5 h-3.5" /></button>
          <span className="text-[10px] text-zinc-500 font-mono w-14 text-center tabular-nums">{idx + 1} / {sorted.length}</span>
          <button onClick={() => goTo(prevT)} disabled={!prevT} className="p-1.5 rounded border border-white/[0.07] text-zinc-400 hover:text-white disabled:opacity-25 transition-all"><ChevronRight className="w-3.5 h-3.5" /></button>
          <div className="w-px h-4 bg-white/[0.07]" />
          <button
            onClick={() => {
              setScreenshotTab("chart");
              setReplayTrigger(p => p + 1);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-[10px] font-bold uppercase tracking-wider transition-all font-mono"
            title="Replay trade directly on screen"
          >
            <Play className="w-3 h-3 fill-blue-400" /> Replay
          </button>
          <button onClick={save} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-200 transition-all"><Save className="w-3 h-3" /> Save</button>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="flex border-b border-white/[0.06] bg-[#0c0c10] divide-x divide-white/[0.06] shrink-0 overflow-x-auto">
        {[
          { label:"Entry",   value: trade.entry.toFixed(digits) },
          { label:"Exit",    value: (trade as any).closePrice != null ? ((trade as any).closePrice as number).toFixed(digits) : "n/a" },
          { label:"SL",      value: (trade as any).sl != null ? ((trade as any).sl as number).toFixed(digits) : "n/a" },
          { label:"TP",      value: (trade as any).tp != null ? ((trade as any).tp as number).toFixed(digits) : "n/a" },
          { label:"Lots",    value: (trade.lotSize || 0).toFixed(2) },
          { label:"Pips",    value: (trade as any).pips != null ? `${(trade as any).pips > 0 ? "+" : ""}${((trade as any).pips as number).toFixed(1)}` : "n/a" },
          { label:"R:R",     value: (trade as any).rr != null ? `${((trade as any).rr as number).toFixed(2)}R` : "n/a" },
          { label:"Net P&L", value: `${isWin?"+":""}$${trade.profit.toFixed(2)}`, cls: isWin?"text-emerald-400":!isBE?"text-rose-400":"text-zinc-400" },
        ].map((s,i) => (
          <div key={i} className="px-4 py-2.5 flex flex-col gap-0.5 min-w-[80px]">
            <div className="text-[8px] uppercase tracking-widest text-zinc-600 font-bold font-mono">{s.label}</div>
            <div className={`text-[12px] font-black font-mono tabular-nums ${(s as any).cls||"text-white"}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* MAIN */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
          {/* LEFT */}
          <div className="flex flex-col gap-4 min-w-0">
            {/* Chart/Screenshots Panel */}
            <div className={`rounded-xl border border-white/[0.07] bg-[#0e0e13] flex flex-col overflow-hidden transition-all duration-300 ${chartExpanded?"h-[620px]":"h-[400px]"}`}>
              <div className="flex items-center justify-between px-4 h-10 border-b border-white/[0.06] bg-[#0c0c11] shrink-0">
                <div className="flex gap-1">
                  {[
                    { id: "chart", label: "Trade Chart" },
                    { id: "screenshots", label: `Screenshots (${imgs.length})` },
                    { id: "liveTv", label: "Live TradingView" },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setScreenshotTab(tab.id as any)}
                      className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                        screenshotTab === tab.id
                          ? "bg-white/10 text-white"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <button onClick={() => setShowAutoScreenshotModal(true)} className="flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-bold border border-white/[0.07] text-zinc-400 hover:text-white hover:border-white/15 transition-all uppercase tracking-wider font-mono"><Camera className="w-3 h-3" /> Auto</button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-bold border border-white/[0.07] text-zinc-400 hover:text-white hover:border-white/15 transition-all uppercase tracking-wider font-mono"><Upload className="w-3 h-3" /> File</button>
                  <button onClick={handlePasteUrl} className="flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-bold border border-white/[0.07] text-zinc-400 hover:text-white hover:border-white/15 transition-all uppercase tracking-wider font-mono"><LinkIcon className="w-3 h-3" /> Link</button>
                  <button onClick={() => setChartExpanded(e => !e)} className="p-1 rounded text-zinc-500 hover:text-white transition-colors">{chartExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}</button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                {screenshotTab === "chart" ? (
                  <TradeDetailChart
                    tradeId={trade.ticket || trade.id}
                    pair={trade.pair}
                    entry={trade.entry}
                    closePrice={(trade as any).closePrice}
                    sl={(trade as any).sl}
                    tp={(trade as any).tp}
                    direction={trade.direction}
                    profit={trade.profit}
                    date={trade.date}
                    openTime={(trade as any).openTime}
                    replayTrigger={replayTrigger}
                  />
                ) : screenshotTab === "liveTv" ? (
                  <TradingViewWidget symbol={trade.pair} height="100%" />
                ) : (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 relative bg-black/50 flex items-center justify-center overflow-hidden">
                      {displayImg ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={displayImg} alt="screenshot" className="max-h-full max-w-full object-contain" />
                          <button onClick={() => removeImage(displayImg)} className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-zinc-400 hover:text-rose-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-zinc-600">
                          <Camera className="w-8 h-8" />
                          <span className="text-xs font-mono">No screenshots yet</span>
                          <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 rounded-lg border border-white/[0.07] text-[10px] text-zinc-400 hover:text-white hover:border-white/15 transition-all uppercase tracking-wider font-bold">+ Upload Screenshot</button>
                        </div>
                      )}
                    </div>
                    {imgs.length > 0 && (
                      <div className="flex gap-1.5 p-2 border-t border-white/[0.06] overflow-x-auto bg-black/20 shrink-0">
                        {imgs.map((img,i) => (
                          <button key={i} onClick={() => setActiveScreenshot(img)} className={`w-14 h-10 shrink-0 rounded overflow-hidden border transition-all ${displayImg===img?"border-white/50":"border-white/[0.07] opacity-50 hover:opacity-90"}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                        <button onClick={() => fileInputRef.current?.click()} className="w-14 h-10 shrink-0 rounded border border-dashed border-white/[0.15] flex items-center justify-center text-zinc-600 hover:text-zinc-400 hover:border-white/25 transition-all"><Upload className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Reason */}
            <Section title="Setup Reason & Notes" icon={<FileText className="w-3 h-3" />} collapsible>
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-zinc-500 font-bold font-mono mb-1.5">Why did you take this trade?</label>
                  <textarea value={entry.reason || ""} onChange={e => saveEntry({ reason: e.target.value })} placeholder="Describe the setup: structure, confluences, killzone, bias..." rows={4} className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2.5 text-[11px] text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-white/20 transition-colors font-sans" />
                </div>
                {!(entry as any).followedPlan && (entry as any).followedPlan !== undefined && (
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-zinc-500 font-bold font-mono mb-1.5">Why did you deviate from plan?</label>
                    <textarea value={(entry as any).planDeviationReason || ""} onChange={e => saveEntry({ planDeviationReason: e.target.value } as any)} placeholder="What happened?" rows={2} className="w-full bg-rose-950/10 border border-rose-500/20 rounded-lg px-3 py-2.5 text-[11px] text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none transition-colors font-sans" />
                  </div>
                )}
              </div>
            </Section>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col gap-3">
            <Section title="Trade Grade" icon={<Star className="w-3 h-3" />}>
              <div className="space-y-2.5">
                <div className="flex gap-2 flex-wrap">
                  {["A+","A","B","C","D"].map(g => (<button key={g} onClick={() => setGrade(g===grade?"":g)} className={`px-3 py-1.5 rounded-lg border text-[11px] font-black font-mono transition-all ${grade===g?gradeColor(g):"border-white/[0.07] bg-white/[0.02] text-zinc-500 hover:text-zinc-300"}`}>{g}</button>))}
                </div>
                {grade && <div className={`text-[10px] font-mono px-2.5 py-1.5 rounded-lg border ${gradeColor(grade)}`}>{grade==="A+"?"Textbook execution":grade==="A"?"Followed all rules":grade==="B"?"Minor flaws":grade==="C"?"Partial rule breach":"Rules broken"}</div>}
              </div>
            </Section>

            <Section title="Mistake / Lesson" icon={<AlertTriangle className="w-3 h-3" />} collapsible>
              <div className="space-y-2">
                <PillSelect options={mistakeOptions} value={mistake} onChange={v => setMistake(v)} />
                <input value={mistake} onChange={e => setMistake(e.target.value)} placeholder="Custom mistake..." className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors font-mono" />
              </div>
            </Section>

            <Section
              title="Trade Emotion"
              icon={<Brain className="w-3 h-3" />}
              action={
                <button onClick={handleAddEmotion} className="flex items-center gap-0.5 text-[9px] font-bold font-mono text-zinc-400 hover:text-white transition-colors">
                  <Plus className="w-3 h-3" /> Add
                </button>
              }
              collapsible
            >
              <div className="flex flex-wrap gap-1.5">
                {emotions.map(e => {
                  const active = entry.emotion === e;
                  return (
                    <div key={e} className="relative group">
                      <button
                        onClick={() => saveEntry({ emotion: active ? "" : e })}
                        className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${
                          active
                            ? "border-white/25 bg-white/10 text-white"
                            : "border-white/[0.07] bg-white/[0.02] text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {e}
                      </button>
                      <button
                        onClick={(ev) => handleDeleteEmotion(e, ev)}
                        className="absolute -top-1.5 -right-1.5 bg-rose-500/80 hover:bg-rose-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <X className="w-2 h-2" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section
              title="Strategy / Setup Type"
              icon={<Target className="w-3 h-3" />}
              action={
                <button onClick={handleAddStrategy} className="flex items-center gap-0.5 text-[9px] font-bold font-mono text-zinc-400 hover:text-white transition-colors">
                  <Plus className="w-3 h-3" /> Add
                </button>
              }
              collapsible
            >
              <div className="flex flex-wrap gap-1.5">
                {strategies.map(s => {
                  const active = (entry.strategy || "").split(", ").filter(Boolean).includes(s);
                  return (
                    <div key={s} className="relative group">
                      <button
                        onClick={() => {
                          const curr = (entry.strategy || "").split(", ").filter(Boolean);
                          const next = active ? curr.filter(x => x !== s) : [...curr, s];
                          saveEntry({ strategy: next.join(", ") });
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${
                          active
                            ? "border-white/25 bg-white/10 text-white"
                            : "border-white/[0.07] bg-white/[0.02] text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {s}
                      </button>
                      <button
                        onClick={(ev) => handleDeleteStrategy(s, ev)}
                        className="absolute -top-1.5 -right-1.5 bg-rose-500/80 hover:bg-rose-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <X className="w-2 h-2" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </Section>

            <Section title="Pre-Trade Checklist" icon={<CheckCircle2 className="w-3 h-3" />} collapsible>
              <div className="space-y-1.5">
                {[
                  {key:"followedPlan",label:"Followed Trading Plan"},
                  {key:"checklistPassed",label:"Passed Pre-Trade Checklist"},
                  {key:"killzone",label:"Traded inside Killzone"},
                  {key:"structure",label:"Clear Market Structure"},
                  {key:"riskSet",label:"SL & TP defined before entry"},
                  {key:"noNews",label:"No high-impact news at entry"},
                  {key:"biasAligned",label:"Bias aligned with HTF"},
                ].map(item => <CheckItem key={item.key} label={item.label} checked={(entry as any)[item.key]} onChange={v => saveEntry({[item.key]:v} as any)} />)}
              </div>
            </Section>

            <Section title="Linked Playbook" icon={<BookOpen className="w-3 h-3" />} collapsible>
              {availableLessons.length > 0 && (
                <div className="space-y-1.5 mb-2.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 font-mono block">
                    Choose Lesson
                  </label>
                  <select
                    value={entry.linkedLessonId || ""}
                    onChange={(e) => saveEntry({ linkedLessonId: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full bg-black/30 border border-white/[0.08] rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-white/20 font-mono"
                  >
                    <option value="" className="bg-zinc-950">-- No Lesson Linked --</option>
                    {availableLessons.map(l => (
                      <option key={l.id} value={l.id} className="bg-zinc-950">
                        {l.concept ? `[${l.concept}] ` : ""}{l.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button onClick={() => router.push("/playbook")} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-white/[0.07] text-[10px] text-zinc-400 hover:text-white hover:border-white/15 transition-all font-bold uppercase tracking-wider"><BookOpen className="w-3 h-3" /> Open Playbook</button>
            </Section>
          </div>
        </div>
      </div>


      {showAutoScreenshotModal && (
        <AutoScreenshotModal
          trades={trade ? [trade as any] : []}
          onClose={() => setShowAutoScreenshotModal(false)}
          onCapture={(base64Str) => {
            fetch(base64Str)
              .then(res => res.blob())
              .then(blob => {
                const file = new File([blob], `auto-screenshot-${trade?.pair || "trade"}.png`, { type: "image/png" });
                uploadAndSyncImageFile(file);
              });
            setShowAutoScreenshotModal(false);
          }}
        />
      )}
    </div>
  );
}