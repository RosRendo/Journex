"use client";

import React, { useState, useEffect } from "react";
import { getBackendUrl } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, ChevronDown, Save, BookOpen, AlertTriangle, Crosshair, Clock, RotateCcw, ShieldCheck, Printer, Cpu } from "lucide-react";
import { toast } from "sonner";

interface PlanData {
  market: string;
  pairs: string[];
  timeframe: string;
  strategyType: string;
  session: string;
  accountSize: string;
  riskPerTrade: string;
  dailyLossLimit: string;
  goal: string;
}

export default function TradingPlanGenerator() {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [planResult, setPlanResult] = useState<any>(null);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);

  const [formData, setFormData] = useState<PlanData>({
    market: "",
    pairs: [],
    timeframe: "",
    strategyType: "",
    session: "",
    accountSize: "",
    riskPerTrade: "1",
    dailyLossLimit: "3",
    goal: "",
  });

  // Load persistence
  useEffect(() => {
    const savedDraft = localStorage.getItem("TRADOKILLER_DRAFT");
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed && typeof parsed === 'object') {
          setFormData(prev => ({ ...prev, ...parsed }));
        }
      } catch (e) {}
    }
    const history = localStorage.getItem("TRADOKILLER_HISTORY");
    if (history) {
      try {
        setSavedPlans(JSON.parse(history));
      } catch (e) {}
    }
  }, []);

  // Save persistence on change
  useEffect(() => {
    if (step < 4) { // only save drafts when not finished
      localStorage.setItem("TRADOKILLER_DRAFT", JSON.stringify(formData));
    }
  }, [formData, step]);

  const updateForm = (key: keyof PlanData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleTogglePair = (pair: string) => {
    setFormData((prev) => {
      const exists = prev.pairs.includes(pair);
      return {
        ...prev,
        pairs: exists ? prev.pairs.filter((p) => p !== pair) : [...prev.pairs, pair],
      };
    });
  };

  const generatePlan = async () => {
    setIsGenerating(true);
    try {
      const apiBase = getBackendUrl();
      const res = await fetch(`${apiBase}/api/trading-plan/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          accountSize: parseFloat(formData.accountSize),
          riskPerTrade: parseFloat(formData.riskPerTrade),
          dailyLossLimit: parseFloat(formData.dailyLossLimit)
        }),
      });

      if (!res.ok) throw new Error("Failed to generate plan");
      
      const data = await res.json();
      setPlanResult(data);
      setStep(4);
      
      // Save to history
      const newHistory = [{ date: new Date().toISOString(), plan: data.plan, config: formData }, ...savedPlans].slice(0, 10);
      setSavedPlans(newHistory);
      localStorage.setItem("TRADOKILLER_HISTORY", JSON.stringify(newHistory));
      localStorage.removeItem("TRADOKILLER_DRAFT"); // clear draft
      
      toast.success("Trading plan successfully generated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate plan. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 px-4 md:px-0">
      
      {/* Decorative background element */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[180px] pointer-events-none opacity-20 bg-gradient-to-r from-[--accent] to-cyan-500 -z-10" />

      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-[--accent] backdrop-blur-md uppercase">
          <BookOpen size={12} className="animate-pulse" />
          Tradokiller Protocol Forge
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent" style={{ fontFamily: "var(--font-display, Syne, sans-serif)" }}>
          The Master <span className="text-[--accent] drop-shadow-[0_0_15px_rgba(0,212,161,0.2)]">Trading Plan</span>
        </h1>
        <p className="text-sm md:text-base text-[--text-secondary] max-w-2xl mx-auto leading-relaxed">
          Define your edge. Quantify your survival rules. Automate discipline. A professional plan is the ultimate barrier against psychological failure.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Main Content */}
        <div className="flex-1 w-full space-y-8">
          
          {/* Dynamic Container */}
          <div className="rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl border border-white/5 bg-black/40">
            
            {/* High Tech Progress Line */}
            {step < 4 && (
              <div className="h-1 w-full bg-white/5 relative">
                <div 
                  className="h-full transition-all duration-700 ease-out bg-gradient-to-r from-[--accent] to-cyan-500 shadow-[0_0_15px_#00d4a1]"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
            )}

            <div className="p-6 md:p-10 relative">
              <AnimatePresence mode="wait">
                
                {/* STEP 1: Foundation */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                  >
                    <div className="space-y-2 border-b border-white/5 pb-4">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-[--accent]" />
                        <span>Phase 1: Market Foundation</span>
                      </h2>
                      <p className="text-xs text-[--text-tertiary]">Select your market domain, watchlists, and protocol mission statement.</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] font-mono">Primary Asset Class</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {["Forex", "Crypto", "Gold/Indices", "Stocks"].map((m) => (
                            <button
                              key={m}
                              onClick={() => updateForm("market", m)}
                              className={`p-4 rounded-xl border text-center transition-all font-bold text-sm hover:scale-[1.02] flex items-center justify-center h-16 ${
                                formData.market === m 
                                  ? "bg-emerald-500/10 border-[--accent] text-[--accent] shadow-[0_0_20px_rgba(0,212,161,0.15)]" 
                                  : "bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/[0.04] hover:text-white"
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] font-mono">Target Instrument Watchlist</label>
                        <div className="flex flex-wrap gap-2">
                          {["XAUUSD", "EURUSD", "GBPUSD", "BTCUSD", "NAS100", "US30", "GBPJPY", "AUDUSD"].map((pair) => {
                            const isSelected = formData.pairs.includes(pair);
                            return (
                              <button
                                key={pair}
                                onClick={() => handleTogglePair(pair)}
                                className={`px-4 py-2 rounded-full border text-xs font-bold transition-all hover:scale-105 ${
                                  isSelected 
                                    ? "bg-emerald-500/10 border-[--accent] text-[--accent] shadow-[0_0_12px_rgba(0,212,161,0.1)]" 
                                    : "bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/[0.04] hover:text-white"
                                }`}
                              >
                                {pair}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] font-mono">Core Protocol Goal / Mission</label>
                        <textarea
                          value={formData.goal}
                          onChange={(e) => updateForm("goal", e.target.value)}
                          placeholder="e.g. Complete a funded account challenge by sticking 100% to systematic set ups, minimizing daily emotional drawdowns..."
                          className="w-full bg-black/35 border border-white/10 rounded-xl p-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[--accent] transition-all h-28 resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-white/5">
                      <button 
                        onClick={() => setStep(2)}
                        disabled={!formData.market || formData.pairs.length === 0 || !formData.goal}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed text-xs bg-[--accent] text-black shadow-[0_0_20px_rgba(0,212,161,0.25)] hover:brightness-110"
                      >
                        Next Phase <ChevronRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Execution */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                  >
                    <div className="space-y-2 border-b border-white/5 pb-4">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Crosshair className="w-5 h-5 text-[--accent]" />
                        <span>Phase 2: Execution Playbook</span>
                      </h2>
                      <p className="text-xs text-[--text-tertiary]">Select your strategy playbook, execution timeframe, and session killzones.</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] font-mono">Strategy Protocol</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {["Trend Following", "Breakout", "Mean Reversion", "Scalping"].map((s) => (
                            <button
                              key={s}
                              onClick={() => updateForm("strategyType", s)}
                              className={`p-4 rounded-xl border text-center transition-all font-bold text-sm hover:scale-[1.02] flex items-center justify-center h-16 ${
                                formData.strategyType === s 
                                  ? "bg-emerald-500/10 border-[--accent] text-[--accent] shadow-[0_0_20px_rgba(0,212,161,0.15)]" 
                                  : "bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/[0.04] hover:text-white"
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] font-mono">Execution Killzone</label>
                          <div className="relative">
                            <select 
                              value={formData.session}
                              onChange={(e) => updateForm("session", e.target.value)}
                              className="w-full bg-black/35 border border-white/10 rounded-xl p-4 text-xs text-white focus:outline-none focus:border-[--accent] appearance-none"
                            >
                              <option value="">Select execution session...</option>
                              <option value="London (Frankfurt Open)">London Session (02:00 - 05:00 NY time)</option>
                              <option value="New York Open">New York Open (07:00 - 10:00 NY time)</option>
                              <option value="Asian Range">Asian Range (20:00 - 24:00 NY time)</option>
                              <option value="London Close">London Close (10:00 - 12:00 NY time)</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-4 text-gray-400 w-4 h-4 pointer-events-none" />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] font-mono">Execution Timeframe</label>
                          <div className="relative">
                            <select 
                              value={formData.timeframe}
                              onChange={(e) => updateForm("timeframe", e.target.value)}
                              className="w-full bg-black/35 border border-white/10 rounded-xl p-4 text-xs text-white focus:outline-none focus:border-[--accent] appearance-none"
                            >
                              <option value="">Select timeframe setup...</option>
                              <option value="1m / 5m">1m / 5m (Scalping)</option>
                              <option value="15m / 1h">15m / 1h (Intraday)</option>
                              <option value="4h / Daily">4h / Daily (Swing)</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-4 text-gray-400 w-4 h-4 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-white/5">
                      <button 
                        onClick={() => setStep(1)}
                        className="flex items-center gap-2 px-4 py-2 font-bold transition-colors text-xs text-gray-400 hover:text-white"
                      >
                        <ChevronLeft size={16} /> Back
                      </button>
                      <button 
                        onClick={() => setStep(3)}
                        disabled={!formData.strategyType || !formData.session || !formData.timeframe}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed text-xs bg-[--accent] text-black shadow-[0_0_20px_rgba(0,212,161,0.25)] hover:brightness-110"
                      >
                        Next Phase <ChevronRight size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Survival Parameters */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                  >
                    <div className="space-y-2 border-b border-white/5 pb-4">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <span>Phase 3: Risk & Survival Parameters</span>
                      </h2>
                      <p className="text-xs text-[--text-tertiary]">Professional traders manage risk first. The edge comes second.</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] font-mono">Account Capital Size</label>
                        <div className="relative">
                          <span className="absolute left-4 top-4 font-mono font-bold text-sm text-gray-500">$</span>
                          <input
                            type="number"
                            value={formData.accountSize}
                            onChange={(e) => updateForm("accountSize", e.target.value)}
                            placeholder="e.g. 100000"
                            className="w-full bg-black/35 border border-white/10 rounded-xl p-4 pl-8 text-base font-mono focus:outline-none focus:border-[--accent] text-white transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] font-mono">Risk Per Trade (%)</label>
                          <div className="relative">
                            <select 
                              value={formData.riskPerTrade}
                              onChange={(e) => updateForm("riskPerTrade", e.target.value)}
                              className="w-full bg-black/35 border border-white/10 rounded-xl p-4 text-xs text-white focus:outline-none focus:border-[--accent] appearance-none"
                            >
                              <option value="0.25">0.25% (Conservative)</option>
                              <option value="0.5">0.50% (Standard)</option>
                              <option value="1">1.00% (Aggressive)</option>
                              <option value="2">2.00% (Gambler - High Risk)</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-4 text-gray-400 w-4 h-4 pointer-events-none" />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[--text-tertiary] font-mono">Daily Loss Limit (%)</label>
                          <div className="relative">
                            <select 
                              value={formData.dailyLossLimit}
                              onChange={(e) => updateForm("dailyLossLimit", e.target.value)}
                              className="w-full bg-black/35 border border-white/10 rounded-xl p-4 text-xs text-white focus:outline-none focus:border-[--accent] appearance-none"
                            >
                              <option value="1">1% Hard Stop (Safe)</option>
                              <option value="2">2% Circuit Breaker (Standard)</option>
                              <option value="3">3% Max Allowed (Aggressive)</option>
                              <option value="5">5% Danger Limit (Highly Risky)</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-4 text-gray-400 w-4 h-4 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-white/5">
                      <button 
                        onClick={() => setStep(2)}
                        className="flex items-center gap-2 px-4 py-2 font-bold transition-colors text-xs text-gray-400 hover:text-white"
                      >
                        <ChevronLeft size={16} /> Back
                      </button>
                      <button 
                        onClick={generatePlan}
                        disabled={isGenerating || !formData.accountSize}
                        className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-30 text-xs bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.25)]"
                      >
                        {isGenerating ? "Forging Protocol..." : "Generate Master Protocol"} <Save size={16} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: RESULT / DOCUMENT */}
                {step === 4 && planResult && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-8"
                  >
                    {/* Security Confirmation Bar */}
                    <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/10 flex items-start gap-4 shadow-inner">
                      <ShieldCheck className="w-5 h-5 mt-0.5 text-[--accent] shrink-0" />
                      <div>
                        <h3 className="font-bold text-sm text-[--accent]">Cybernetic Protocol Enforced</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Trading parameters have been registered and validated. This protocol is mathematically sound. The only variable remaining is your operational execution.
                        </p>
                      </div>
                    </div>

                    {/* Cybernetic Contract Dossier */}
                    <div className="p-8 md:p-12 rounded-xl relative overflow-hidden border border-white/10 bg-black/60 shadow-[0_0_50px_rgba(0,212,161,0.05)]">
                      
                      {/* Grid Background overlay */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                      
                      {/* Technical Borders */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[--accent]/30 pointer-events-none" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[--accent]/30 pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[--accent]/30 pointer-events-none" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[--accent]/30 pointer-events-none" />

                      {/* Giant Watermark */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.015] select-none">
                        <h1 className="text-8xl font-black rotate-[-35deg] tracking-wider text-white">TRADOKILLER</h1>
                      </div>
                      
                      <div className="relative z-10 space-y-8 font-mono">
                        
                        {/* Terminal Header */}
                        <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                          <div className="space-y-1">
                            <button onClick={() => setStep(1)} className="text-xs text-[--text-tertiary] hover:text-white transition-colors flex items-center gap-1 mb-2 font-bold">
                              <RotateCcw size={12}/> Start Over
                            </button>
                            <h2 className="text-xl md:text-2xl font-black text-white tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                              OPERATIONAL DOSSIER
                            </h2>
                            <div className="flex flex-wrap gap-4 text-[10px] text-[--accent] font-bold">
                              <span>CODE: TK-PROT-1.0</span>
                              <span>STATUS: ENFORCED</span>
                              <span>DATE: {new Date().toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Dossier sections */}
                        {planResult.plan?.planSections?.map((section: any, idx: number) => (
                          <div key={idx} className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-widest px-3 py-1 bg-white/5 border border-white/10 text-white rounded inline-block">
                              // {section.title}
                            </h3>
                            <div className="text-xs leading-relaxed text-gray-300 pl-4 border-l border-[--accent]/40 whitespace-pre-wrap font-sans">
                              {section.content}
                            </div>
                          </div>
                        ))}

                        {/* High-Tech Signature Line */}
                        <div className="mt-12 pt-8 border-t border-dashed border-white/10">
                          <p className="text-[10px] uppercase text-center text-gray-500 font-bold tracking-wider italic">
                            "I hereby declare to execute this protocol objectively and accept the numbers defined."
                          </p>
                          <div className="mt-10 flex justify-between px-4 sm:px-12">
                            <div className="border-b border-[--accent]/30 w-32 sm:w-48 pb-2 text-center text-[9px] text-gray-400 uppercase tracking-widest">
                              Operator Signature
                            </div>
                            <div className="border-b border-[--accent]/30 w-24 sm:w-32 pb-2 text-center text-[9px] text-gray-400 uppercase tracking-widest">
                              Date Verified
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-center pt-4">
                      <button 
                        onClick={() => window.print()}
                        className="px-6 py-3 rounded-xl font-bold transition-all text-xs bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Print Protocol / Export PDF
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Sidebar History */}
        <div className="w-full lg:w-80 space-y-4 shrink-0">
          <div className="rounded-2xl p-6 shadow-2xl backdrop-blur-xl border border-white/5 bg-black/40">
            <h3 className="font-bold mb-4 flex items-center gap-2 tracking-wider uppercase text-[10px] text-[--text-tertiary] font-mono">
              <Clock size={12} className="text-[--accent]" /> 
              <span>Saved Protocols</span>
            </h3>
            
            {savedPlans.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                {savedPlans.map((sp, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 rounded-xl cursor-pointer border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all"
                    onClick={() => {
                      setPlanResult({ plan: sp.plan });
                      setFormData(sp.config);
                      setStep(4);
                    }}
                  >
                    <div className="text-[9px] font-mono text-gray-500 mb-1.5">{new Date(sp.date).toLocaleString()}</div>
                    <div className="font-bold text-xs truncate text-white">
                      {sp.config.goal || "Trading Protocol"}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <span className="text-[8px] font-bold px-2 py-0.5 rounded uppercase bg-black/30 text-[--accent] border border-[--accent]/20">{sp.config.market}</span>
                      <span className="text-[8px] font-bold px-2 py-0.5 rounded uppercase bg-black/30 text-cyan-400 border border-cyan-400/20">{sp.config.strategyType}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 border border-dashed border-white/10 rounded-xl">
                 <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500">No protocol files synced.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
