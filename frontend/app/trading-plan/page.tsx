"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Save, BookOpen, AlertTriangle, Crosshair, Clock, RotateCcw } from "lucide-react";
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
      // Assuming backend URL is exposed via env or proxy
      const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
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
    <div className="min-h-screen bg-neutral-950 text-neutral-200 antialiased pt-24 pb-12 px-4 md:px-6">
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Main Content */}
        <div className="flex-1 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-semibold tracking-wide">
            <BookOpen size={14} />
            TRADOKILLER PROTOCOL
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            The Master <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Trading Plan</span>
          </h1>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            Design your edge. Define your risk. Commit to the system.
            A trading plan is the only thing standing between you and emotional ruin.
          </p>
        </div>

        {/* Dynamic Container */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
          
          {/* Progress Bar */}
          {step < 4 && (
            <div className="h-1 w-full bg-neutral-800">
              <div 
                className="h-full bg-blue-500 transition-all duration-500 ease-out"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          )}

          <div className="p-6 md:p-12">
            <AnimatePresence mode="wait">
              
              {/* STEP 1: Foundation */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">Phase 1: Foundation</h2>
                    <p className="text-neutral-400">Define your arena and primary targets.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold uppercase text-neutral-400 tracking-wider">Primary Market</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {["Forex", "Crypto", "Gold/Indices", "Stocks"].map((m) => (
                          <button
                            key={m}
                            onClick={() => updateForm("market", m)}
                            className={`p-4 rounded-xl border text-center transition-all ${formData.market === m ? "bg-blue-500/20 border-blue-500 text-white" : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-600"}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-semibold uppercase text-neutral-400 tracking-wider">Target Watchlist</label>
                      <div className="flex flex-wrap gap-2">
                        {["XAUUSD", "EURUSD", "GBPUSD", "BTCUSD", "NAS100", "US30"].map((pair) => (
                          <button
                            key={pair}
                            onClick={() => handleTogglePair(pair)}
                            className={`px-4 py-2 rounded-full border text-sm transition-all ${formData.pairs.includes(pair) ? "bg-indigo-500 border-indigo-500 text-white" : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-600"}`}
                          >
                            {pair}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-semibold uppercase text-neutral-400 tracking-wider">Primary Goal</label>
                      <textarea
                        value={formData.goal}
                        onChange={(e) => updateForm("goal", e.target.value)}
                        placeholder="e.g. Pass a $100k funded challenge by executing my setup with zero deviations..."
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 h-24 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button 
                      onClick={() => setStep(2)}
                      disabled={!formData.market || formData.pairs.length === 0 || !formData.goal}
                      className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next Phase <ChevronRight size={18} />
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
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">Phase 2: Execution</h2>
                    <p className="text-neutral-400">How and when do you plan to extract money?</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold uppercase text-neutral-400 tracking-wider">Strategy Playbook</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {["Trend Following", "Breakout", "Mean Reversion", "Scalping"].map((s) => (
                          <button
                            key={s}
                            onClick={() => updateForm("strategyType", s)}
                            className={`p-4 rounded-xl border text-center transition-all ${formData.strategyType === s ? "bg-indigo-500/20 border-indigo-500 text-white" : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-600"}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-sm font-semibold uppercase text-neutral-400 tracking-wider">Killzone Session</label>
                        <select 
                          value={formData.session}
                          onChange={(e) => updateForm("session", e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">Select a session...</option>
                          <option value="London (Frankfurt Open)">London Open</option>
                          <option value="New York Open">New York Open</option>
                          <option value="Asian Range">Asian Session</option>
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-semibold uppercase text-neutral-400 tracking-wider">Execution Timeframe</label>
                        <select 
                          value={formData.timeframe}
                          onChange={(e) => updateForm("timeframe", e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">Select timeframe...</option>
                          <option value="1m / 5m">1m / 5m (Scalp)</option>
                          <option value="15m / 1h">15m / 1h (Intraday)</option>
                          <option value="4h / Daily">4h / Daily (Swing)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button 
                      onClick={() => setStep(1)}
                      className="flex items-center gap-2 text-neutral-400 px-4 py-2 hover:text-white transition-colors"
                    >
                      <ChevronLeft size={18} /> Back
                    </button>
                    <button 
                      onClick={() => setStep(3)}
                      disabled={!formData.strategyType || !formData.session || !formData.timeframe}
                      className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next Phase <ChevronRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Risk Parameters */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      Phase 3: Survival <AlertTriangle className="text-yellow-500" size={24}/>
                    </h2>
                    <p className="text-neutral-400">Professional traders manage risk first. Edge comes second.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-semibold uppercase text-neutral-400 tracking-wider">Account Capital</label>
                      <div className="relative">
                        <span className="absolute left-4 top-4 text-neutral-500">$</span>
                        <input
                          type="number"
                          value={formData.accountSize}
                          onChange={(e) => updateForm("accountSize", e.target.value)}
                          placeholder="e.g. 100000"
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 pl-8 text-white focus:outline-none focus:border-red-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-sm font-semibold uppercase text-neutral-400 tracking-wider">Risk Per Trade (%)</label>
                        <select 
                          value={formData.riskPerTrade}
                          onChange={(e) => updateForm("riskPerTrade", e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-red-400 font-mono focus:outline-none focus:border-red-500"
                        >
                          <option value="0.25">0.25% (Conservative)</option>
                          <option value="0.5">0.50% (Standard)</option>
                          <option value="1">1.00% (Aggressive)</option>
                          <option value="2">2.00% (Gambler)</option>
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-semibold uppercase text-neutral-400 tracking-wider">Daily Loss Limit (%)</label>
                        <select 
                          value={formData.dailyLossLimit}
                          onChange={(e) => updateForm("dailyLossLimit", e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-red-500 font-bold focus:outline-none focus:border-red-500"
                        >
                          <option value="1">1% Hard Stop</option>
                          <option value="2">2% Circuit Breaker</option>
                          <option value="3">3% Account Killer Prevention</option>
                          <option value="5">5% Danger Zone</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button 
                      onClick={() => setStep(2)}
                      className="flex items-center gap-2 text-neutral-400 px-4 py-2 hover:text-white transition-colors"
                    >
                      <ChevronLeft size={18} /> Back
                    </button>
                    <button 
                      onClick={generatePlan}
                      disabled={isGenerating || !formData.accountSize}
                      className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 text-white px-8 py-3 rounded-lg font-bold hover:from-red-500 hover:to-red-400 transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50"
                    >
                      {isGenerating ? "Forging Protocol..." : "Generate Master Plan"} <Save size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: RESULT / DOCUMENT */}
              {step === 4 && planResult && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-8"
                >
                  <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl flex items-start gap-4">
                    <Crosshair className="text-green-400 mt-1 flex-shrink-0" size={24} />
                    <div>
                      <h3 className="text-green-400 font-bold text-lg">Protocol Generated</h3>
                      <p className="text-neutral-300 mt-1">
                        Your rules are set. This plan is mathematically viable. The only variable left is your discipline. Do not deviate.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white text-black p-8 md:p-12 rounded-xl shadow-2xl relative overflow-hidden">
                    {/* Watermark */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03]">
                      <h1 className="text-9xl font-black rotate-[-45deg] tracking-tighter">TRADOKILLER</h1>
                    </div>
                    
                    <div className="relative z-10 space-y-8">
                      <div className="border-b-2 border-black pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                        <div>
                          <button onClick={() => setStep(1)} className="text-neutral-500 text-sm mb-2 hover:text-black flex items-center gap-1"><RotateCcw size={14}/> Start Over</button>
                          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter">Master Trading Protocol</h2>
                          <div className="flex gap-4 mt-2 text-xs sm:text-sm font-mono text-neutral-600">
                            <span>VERSION: 1.0</span>
                            <span>DATE: {new Date().toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {planResult.plan?.planSections?.map((section: any, idx: number) => (
                        <div key={idx} className="space-y-3">
                          <h3 className="text-xl font-bold uppercase tracking-wide px-3 py-1 bg-black text-white inline-block">
                            {section.title}
                          </h3>
                          <div className="text-neutral-800 text-lg leading-relaxed whitespace-pre-wrap pl-3 border-l-4 border-neutral-200">
                            {section.content}
                          </div>
                        </div>
                      ))}

                    <div className="mt-12 pt-8 border-t-2 border-dashed border-neutral-300">
                        <p className="text-neutral-500 text-sm font-mono uppercase text-center">
                          "I vow to execute this protocol globally without hesitation or deviation."
                        </p>
                        <div className="mt-8 flex justify-between px-12">
                          <div className="border-t border-black w-48 pt-2 text-center text-xs font-bold uppercase">Signature</div>
                          <div className="border-t border-black w-32 pt-2 text-center text-xs font-bold uppercase">Date</div>
                        </div>
                    </div>

                    </div>
                  </div>

                  <div className="flex justify-center pt-4">
                    <button 
                      onClick={() => window.print()}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold transition-colors shadow-lg"
                    >
                      Export to PDF / Print
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        </div>

        {/* Sidebar History */}
        <div className="w-full lg:w-80 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2 tracking-wide"><Clock size={16} className="text-blue-400"/> Saved Protocols</h3>
            {savedPlans.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {savedPlans.map((sp, idx) => (
                  <div key={idx} className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl hover:border-blue-500/50 cursor-pointer transition-colors group"
                    onClick={() => {
                      setPlanResult({ plan: sp.plan });
                      setFormData(sp.config);
                      setStep(4);
                    }}>
                    <div className="text-xs text-neutral-500 mb-1">{new Date(sp.date).toLocaleString()}</div>
                    <div className="font-bold text-sm text-neutral-300 group-hover:text-blue-400 transition-colors truncate">
                      {sp.config.goal || "Trading Protocol"}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">{sp.config.market}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">{sp.config.strategyType}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 bg-neutral-950 border border-neutral-800 border-dashed rounded-xl">
                 <p className="text-xs text-neutral-500">No saved plans yet. Generate your first master protocol.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
