"use client";

import React, { useState, useEffect } from "react";
import { Award, ShieldCheck, Target, AlertTriangle, Briefcase, Activity, CheckCircle, Flame } from "lucide-react";

// Default fallback account details
const DEFAULT_ACCOUNT = {
  id: "WAITING-ACCOUNT",
  size: 100000,
  balance: 100000,
  equity: 100000,
  daily_start_balance: 100000,
  max_daily_loss_pct: 5,
  max_overall_loss_pct: 10,
  profit_target_pct: 10,
  days_traded: 0,
  min_days: 0,
};

function fmt(num: number) { return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }
function fmt2(num: number) { return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export default function PropComplianceDashboard() {
  const [accountSizesInput, setAccountSizesInput] = useState<string>("10000, 25000, 50000, 100000, 200000");
  const [risk, setRisk] = useState<string>("0.5");
  const [phase1Target, setPhase1Target] = useState<string>("8");
  const [phase2Target, setPhase2Target] = useState<string>("5");
  const [rows, setRows] = useState<any[] | null>(null);
  
  // Live Account State
  const [acc, setAcc] = useState(DEFAULT_ACCOUNT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5003";
        const res = await fetch(`${bridgeUrl}/api/account`, { headers: { "ngrok-skip-browser-warning": "true" } });
        if (!res.ok) throw new Error("Offline");
        const data = await res.json();
        
        if (data.login) {
          setAcc({
            id: `MT5-${data.login}`,
            size: data.balance > 0 ? (Math.ceil(data.balance / 10000) * 10000) : 100000, // Guessing starting size
            balance: data.balance,
            equity: data.equity,
            daily_start_balance: data.balance, // Simplified without historical midnight snapshot
            max_daily_loss_pct: 5,
            max_overall_loss_pct: 10,
            profit_target_pct: 10,
            days_traded: 0,
            min_days: 0
          });
        }
      } catch (e) {
        // keep default
      } finally {
        setLoading(false);
      }
    };
    
    fetchAccount();
    const t = setInterval(fetchAccount, 5000);
    return () => clearInterval(t);
  }, []);

  // Live Calculations
  const targetProfitAmount = acc.size * (acc.profit_target_pct / 100);
  const currentProfit = acc.equity - acc.size;
  const profitProgress = Math.max(0, Math.min(100, (currentProfit / targetProfitAmount) * 100));

  const maxDailyLossAmount = acc.daily_start_balance * (acc.max_daily_loss_pct / 100);
  const currentDailyLoss = Math.max(0, acc.daily_start_balance - acc.equity);
  const dailyLossProgress = Math.max(0, Math.min(100, (currentDailyLoss / maxDailyLossAmount) * 100));

  const maxOverallLossAmount = acc.size * (acc.max_overall_loss_pct / 100);
  const currentOverallLoss = Math.max(0, acc.size - acc.equity);
  const overallLossProgress = Math.max(0, Math.min(100, (currentOverallLoss / maxOverallLossAmount) * 100));

  const calculateTable = () => {
    const accounts = accountSizesInput.split(",").map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n) && n > 0);
    const r = parseFloat(risk) / 100;
    const p1 = parseFloat(phase1Target) / 100;
    const p2 = parseFloat(phase2Target) / 100;
    if (accounts.length === 0 || isNaN(r) || isNaN(p1) || isNaN(p2)) return;

    setRows(accounts.map((account) => ({
      accountSize: account, riskAmount: account * r, tradesPhase1: Math.floor(p1 / r), gainPhase1: account * p1, tradesPhase2: Math.floor(p2 / r), gainPhase2: account * p2,
    })));
  };

  useEffect(() => { calculateTable(); }, []);

  const getProgressColor = (pct: number, isLoss: boolean) => {
    if (isLoss) {
      if (pct > 80) return "var(--loss)";
      if (pct > 50) return "var(--warning)";
      return "var(--profit)";
    } else {
      return "var(--profit)";
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight mb-1 flex items-center gap-3" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>
            <ShieldCheck className="w-8 h-8 text-[--accent]" /> Compliance & Prop Firm
          </h1>
          <p className="text-[13px] font-medium flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <Activity className="w-3.5 h-3.5" /> Enforcing risk parameters and challenge targets
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-full border text-[11px] font-bold uppercase tracking-wider flex items-center gap-2" 
            style={{ background: "rgba(0,212,161,0.1)", borderColor: "rgba(0,212,161,0.3)", color: "var(--profit)" }}>
            <Award className="w-4 h-4" /> MOCK INSTANCE LINKED
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── LIVE ACCOUNT MONITOR ── */}
        <div className="border rounded-2xl flex flex-col overflow-hidden shadow-2xl" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="p-6 border-b" style={{ borderColor: "var(--border)", background: "var(--bg-base)" }}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-[14px] font-bold uppercase tracking-widest text-[--text-tertiary] mb-1">Active Evaluation</h2>
                <div className="text-[24px] font-bold text-[--text-primary] flex items-center gap-2 font-mono">
                  {acc.id} <span className="text-[11px] px-2 py-0.5 rounded border bg-[--bg-elevated]" style={{ borderColor: "var(--border-strong)", color: "var(--text-secondary)" }}>PHASE 1</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-[--text-tertiary] tracking-widest mb-1">Live Equity</p>
                <p className="text-[28px] font-mono font-bold text-[--profit]">{fmt2(acc.equity)}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8 flex-1">
            
            {/* Target Profit */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h3 className="text-[13px] font-bold flex items-center gap-2 text-[--text-primary]">
                    <Target className="w-4 h-4 text-[--accent]" /> Profit Target ({acc.profit_target_pct}%)
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[15px] font-mono font-bold text-[--profit]">{fmt(currentProfit)}</span>
                  <span className="text-[11px] font-mono text-[--text-tertiary]"> / {fmt(targetProfitAmount)}</span>
                </div>
              </div>
              <div className="h-2 w-full bg-[--bg-base] rounded-full overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                <div className="h-full bg-[--accent] rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,212,161,0.5)]" style={{ width: `${profitProgress}%` }} />
              </div>
            </div>

            {/* Daily Loss Limit */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h3 className="text-[13px] font-bold flex items-center gap-2 text-[--text-primary]">
                    <Flame className="w-4 h-4 text-[--warning]" /> Daily Loss Limit ({acc.max_daily_loss_pct}%)
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[15px] font-mono font-bold text-[--text-primary]">{fmt(currentDailyLoss)}</span>
                  <span className="text-[11px] font-mono text-[--text-tertiary]"> / {fmt(maxDailyLossAmount)}</span>
                </div>
              </div>
              <div className="h-2 w-full bg-[--bg-base] rounded-full overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${dailyLossProgress}%`, background: getProgressColor(dailyLossProgress, true), boxShadow: `0 0 10px ${getProgressColor(dailyLossProgress, true)}` }} />
              </div>
              {dailyLossProgress > 80 && <p className="text-[10px] text-[--loss] font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Critical threshold reached</p>}
            </div>

            {/* Overall Loss Limit */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h3 className="text-[13px] font-bold flex items-center gap-2 text-[--text-primary]">
                    <AlertTriangle className="w-4 h-4 text-[--loss]" /> Max Drawdown ({acc.max_overall_loss_pct}%)
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[15px] font-mono font-bold text-[--text-primary]">{fmt(currentOverallLoss)}</span>
                  <span className="text-[11px] font-mono text-[--text-tertiary]"> / {fmt(maxOverallLossAmount)}</span>
                </div>
              </div>
              <div className="h-2 w-full bg-[--bg-base] rounded-full overflow-hidden border" style={{ borderColor: "var(--border)" }}>
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${overallLossProgress}%`, background: getProgressColor(overallLossProgress, true), boxShadow: `0 0 10px ${getProgressColor(overallLossProgress, true)}` }} />
              </div>
            </div>

          </div>
          
          <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: "var(--border)", background: "var(--bg-base)" }}>
             <div className="flex items-center gap-2 text-[12px] font-bold text-[--text-secondary]">
               <CheckCircle className="w-4 h-4 text-[--profit]" /> Min Trading Days: {acc.days_traded} / {acc.min_days} Completed
             </div>
             <span className="px-3 py-1 bg-[--profit] text-black text-[10px] font-black uppercase tracking-wider rounded border shadow-[0_0_10px_rgba(0,212,161,0.3)]">IN GOOD STANDING</span>
          </div>
        </div>

        {/* ── CHALLENGE REQUIREMENTS MATRIX ── */}
        <div className="border rounded-2xl flex flex-col overflow-hidden shadow-sm" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-[18px] font-bold flex items-center gap-2 text-[--text-primary]">
              <Briefcase className="w-5 h-5 text-[--accent]" /> Challenge Blueprint Matrix
            </h2>
            <p className="text-[12px] text-[--text-secondary] mt-1">Calculate strike rate and trade volume requirements for any firm phase.</p>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary] mb-1.5">Account Sizes (CSV)</label>
              <input type="text" value={accountSizesInput} onChange={e => setAccountSizesInput(e.target.value)} className="w-full bg-[--bg-base] border text-[13px] font-mono text-[--text-primary] rounded-xl px-4 py-3 outline-none focus:border-[--accent]" style={{ borderColor: "var(--border)" }} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary] mb-1.5">Risk per Trade (%)</label>
                <input type="number" step="0.1" value={risk} onChange={e => setRisk(e.target.value)} className="w-full bg-[--bg-base] border text-[14px] font-bold text-[--text-primary] rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--border)" }} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary] mb-1.5">Phase 1 Target (%)</label>
                <input type="number" step="1" value={phase1Target} onChange={e => setPhase1Target(e.target.value)} className="w-full bg-[--bg-base] border text-[14px] font-bold text-[--text-primary] rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--border)" }} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary] mb-1.5">Phase 2 Target (%)</label>
                <input type="number" step="1" value={phase2Target} onChange={e => setPhase2Target(e.target.value)} className="w-full bg-[--bg-base] border text-[14px] font-bold text-[--text-primary] rounded-xl px-4 py-3 outline-none" style={{ borderColor: "var(--border)" }} />
              </div>
            </div>

            <button onClick={calculateTable} className="w-full py-4 rounded-xl font-bold shadow-[0_0_20px_rgba(0,212,161,0.2)] hover:shadow-[0_0_30px_rgba(0,212,161,0.4)] transition-all flex items-center justify-center gap-2" style={{ background: "var(--accent)", color: "#000" }}>
              Compute Matrix Requirements
            </button>
          </div>

          {rows && (
            <div className="flex-1 border-t bg-[--bg-base] overflow-x-auto custom-scrollbar" style={{ borderColor: "var(--border)" }}>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border-strong)" }}>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary]">Account</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary]">1R Risk</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary] text-center">P1 Trades</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary] text-right">P1 Gain</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary] text-center">P2 Trades</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary] text-right">P2 Gain</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {rows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-[--bg-elevated] transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[13px] text-[--text-primary]">{fmt(r.accountSize)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-[13px] text-[--text-secondary]">{fmt2(r.riskAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded border border-[--warning]/30 bg-[--warning]/10 text-[--warning]">{r.tradesPhase1} Wins</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[13px] text-[--profit]">{fmt(r.gainPhase1)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded border border-[--accent]/30 bg-[--accent]/10 text-[--accent]">{r.tradesPhase2} Wins</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[13px] text-[--profit]">{fmt(r.gainPhase2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
