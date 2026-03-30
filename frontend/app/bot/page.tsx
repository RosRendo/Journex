"use client"
import React, { useState, useEffect } from 'react';
import {
  Bot, Settings, MessageSquare, Copy, BarChart3, Play, Pause,
  Plus, Trash2, Edit, Zap, TrendingUp, TrendingDown, Activity,
  Shield, AlertTriangle, CheckCircle2, Clock, Wifi, WifiOff,
  Send, RefreshCw, Target, DollarSign, Percent, ArrowUpDown, Cpu, Circle, CheckCircle
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

/* ── UI Stubs mapped to Master Tokens ───────────────────── */
function CustomButton({ onClick, disabled, variant = 'primary', size = 'default', className = '', children }: any) {
  let style = {};
  if (variant === 'primary') style = { background: "var(--accent)", color: "#000" };
  if (variant === 'secondary') style = { background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border-strong)" };
  if (variant === 'ghost') style = { background: "transparent", color: "var(--text-secondary)" };
  if (variant === 'danger') style = { background: "rgba(255,77,106,0.1)", color: "var(--loss)", border: "1px solid rgba(255,77,106,0.3)" };
  
  const pads = size === 'sm' ? "px-3 py-1.5 text-[11px]" : size === 'icon' ? "w-8 h-8 flex items-center justify-center" : "px-5 py-2.5 text-[13px]";
  
  return (
    <button onClick={onClick} disabled={disabled} style={style} className={`font-bold rounded-lg transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${pads} ${className}`}>
      {children}
    </button>
  )
}

function CustomInput({ value, onChange, placeholder, type = "text" }: any) {
  return (
    <input type={type} placeholder={placeholder} value={value} onChange={onChange}
      className="w-full bg-[--bg-card] border border-[--border] rounded-xl px-4 py-2.5 text-[13px] font-medium outline-none text-[--text-primary] placeholder-[--text-tertiary] focus:border-[--accent] transition-colors" />
  );
}

function CustomSelect({ value, onChange, options, placeholder }: any) {
  return (
    <select value={value} onChange={onChange} className="w-full bg-[--bg-card] border border-[--border] rounded-xl px-4 py-2.5 text-[13px] font-medium outline-none text-[--text-primary] focus:border-[--accent] transition-colors appearance-none">
      <option value="" disabled>{placeholder}</option>
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ── Trading Bot Settings ─────────────────────────────────── */
interface BotConfig {
  id: string;
  name: string;
  broker: string;
  apiKey: string;
  strategy: string;
  status: 'active' | 'paused' | 'error';
  riskPerTrade: number;
  maxDailyLoss: number;
  symbols: string[];
  createdAt: string;
}

function BotSettingsTab() {
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [wizardStep, setWizardStep] = useState<'none' | 'select-type' | 'create-strategy' | 'create-copier'>('none');
  const [loading, setLoading] = useState(false);

  const [botName, setBotName] = useState('');
  const [broker, setBroker] = useState('');
  const [strategy, setStrategy] = useState('');
  const [symbols, setSymbols] = useState('EURUSD');
  const [risk, setRisk] = useState(1.0);
  const [maxLoss, setMaxLoss] = useState(3.0);

  useEffect(() => { fetchBots(); }, []);

  const BRIDGE = typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:5003"
    : (process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5003");

  const fetchBots = async () => {
    try {
      const res = await fetch(`${BRIDGE}/api/bots`, { headers: { "ngrok-skip-browser-warning": "true" } });
      const data = await res.json();
      if (data.success) setBots(data.bots);
    } catch (e) { console.error("Could not fetch bots"); }
  };

  const saveBot = async (type: string) => {
    try {
      setLoading(true);
      const sList = symbols.split(',').map(s => s.trim());
      await fetch(`${BRIDGE}/api/bots`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: botName || (type === 'copier' ? 'Trade Copier' : 'New Strategy Bot'),
          broker: broker || 'Local MT5',
          strategy: strategy || type,
          symbols: sList,
          riskPerTrade: risk,
          maxDailyLoss: maxLoss
        })
      });
      fetchBots();
      setWizardStep('none');
    } catch (e) {
       console.error(e);
    }
    setLoading(false);
  };

  const toggleBot = async (id: string) => {
    try {
      await fetch(`${BRIDGE}/api/bots/${id}/toggle`, { headers: { "ngrok-skip-browser-warning": "true" },  method: "POST" });
      fetchBots();
    } catch (e) { console.error(e); }
  };

  const deleteBot = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bot?")) return;
    try {
       await fetch(`${BRIDGE}/api/bots/${id}`, { headers: { "ngrok-skip-browser-warning": "true" },  method: "DELETE" });
       fetchBots();
    } catch (e) { console.error(e); }
  };

  const statusIcon = (s: BotConfig['status']) =>
    s === 'active' ? <CheckCircle2 className="w-3.5 h-3.5 text-[--profit]" /> :
    s === 'paused' ? <Pause className="w-3.5 h-3.5 text-[--warning]" /> :
    <AlertTriangle className="w-3.5 h-3.5 text-[--loss]" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <h2 className="text-[22px] font-bold" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>Bot Fleet</h2>
           <p className="text-[13px] text-[--text-secondary]">Configure and manage your automated trading algorithms</p>
        </div>
        <CustomButton onClick={() => setWizardStep('select-type')}><Plus className="w-4 h-4" /> Deploy New Bot</CustomButton>
      </div>

      {wizardStep === 'select-type' && (
        <div className="rounded-2xl border p-6 animate-in fade-in bg-[--bg-card]" style={{ borderColor: "var(--accent)" }}>
          <div className="text-center mb-6">
            <h3 className="text-[18px] font-bold text-[--text-primary]">Bot Architecture</h3>
            <p className="text-[12px] text-[--text-tertiary] mt-1">Select the execution logic structure</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="cursor-pointer border rounded-2xl p-6 text-center hover:bg-[--bg-elevated] transition-all" style={{ borderColor: "var(--border-strong)" }} onClick={() => setWizardStep('create-strategy')}>
               <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center bg-[--accent]/10 text-[--accent]">
                 <Cpu className="w-6 h-6" />
               </div>
               <h4 className="text-[15px] font-bold text-[--text-primary]">Automated Strategy</h4>
               <p className="text-[12px] text-[--text-secondary] mt-2 leading-relaxed">Trade 24/7 fully autonomously using technical analysis indicators, breakouts, or grid systems.</p>
            </div>
            <div className="cursor-pointer border rounded-2xl p-6 text-center hover:bg-[--bg-elevated] transition-all" style={{ borderColor: "var(--border-strong)" }} onClick={() => setWizardStep('create-copier')}>
               <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center bg-[#3b82f6]/10 text-[#3b82f6]">
                 <Copy className="w-6 h-6" />
               </div>
               <h4 className="text-[15px] font-bold text-[--text-primary]">Signal Copier</h4>
               <p className="text-[12px] text-[--text-secondary] mt-2 leading-relaxed">Mirror trades sent via TradingView Webhooks, Telegram signals, or custom APIs.</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <CustomButton variant="ghost" onClick={() => setWizardStep('none')}>Cancel</CustomButton>
          </div>
        </div>
      )}

      {wizardStep === 'create-strategy' && (
        <div className="rounded-2xl border p-6 animate-in fade-in bg-[--bg-card]" style={{ borderColor: "var(--border-strong)" }}>
          <div className="flex items-center justify-between border-b border-[--border] pb-4 mb-6">
            <h3 className="text-[15px] font-bold text-[--text-primary] flex items-center gap-2"><Cpu className="w-4 h-4 text-[--accent]"/> Strategy Configuration</h3>
            <CustomButton variant="ghost" size="sm" onClick={() => setWizardStep('select-type')}>Cancel</CustomButton>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-bold text-[--text-tertiary] uppercase tracking-wider mb-2">Bot Name</label>
              <CustomInput placeholder="e.g. Phoenix Overdrive X" value={botName} onChange={(e:any) => setBotName(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[--text-tertiary] uppercase tracking-wider mb-2">Broker Env</label>
              <CustomSelect placeholder="Select Environment" value={broker} onChange={(e:any) => setBroker(e.target.value)} options={[
                { value: "Local MT5", label: "Local MT5 terminal" },
                { value: "FTMO", label: "FTMO Aggregator" }
              ]} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-[--text-tertiary] uppercase tracking-wider mb-2">Algorithm File</label>
              <CustomSelect placeholder="Select compiled strategy (.py/.ex5)" value={strategy} onChange={(e:any) => setStrategy(e.target.value)} options={[
                { value: "London Breakout", label: "London Breakout v2.1" },
                { value: "EMA Scalping", label: "1H EMA Trend Rider" },
                { value: "Grid", label: "Dynamic Grid Matrix" }
              ]} />
            </div>
            <div>
               <label className="block text-[11px] font-bold text-[--text-tertiary] uppercase tracking-wider mb-2">Target Pairs</label>
               <CustomInput placeholder="XAUUSD, EURUSD" value={symbols} onChange={(e:any) => setSymbols(e.target.value)} />
            </div>
            <div>
               <label className="block text-[11px] font-bold text-[--text-tertiary] uppercase tracking-wider mb-2">Risk per Trade (%)</label>
               <CustomInput placeholder="1.0" type="number" value={risk} onChange={(e:any) => setRisk(parseFloat(e.target.value))} />
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <CustomButton onClick={() => saveBot('strategy')} disabled={loading}>Compile & Deploy to Server</CustomButton>
          </div>
        </div>
      )}

      {wizardStep === 'create-copier' && (
        <div className="rounded-2xl border p-6 animate-in fade-in bg-[--bg-card]" style={{ borderColor: "var(--border-strong)" }}>
           <div className="flex items-center justify-between border-b border-[--border] pb-4 mb-6">
            <h3 className="text-[15px] font-bold text-[--text-primary] flex items-center gap-2"><Copy className="w-4 h-4 text-[#3b82f6]"/> Copier Webhook Setup</h3>
            <CustomButton variant="ghost" size="sm" onClick={() => setWizardStep('select-type')}>Cancel</CustomButton>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-bold text-[--text-tertiary] uppercase tracking-wider mb-2">Listener Name</label>
              <CustomInput placeholder="e.g. TradingView Alerts" value={botName} onChange={(e:any) => setBotName(e.target.value)} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[--text-tertiary] uppercase tracking-wider mb-2">Source Type</label>
              <CustomSelect placeholder="Select Provider" value={strategy} onChange={(e:any) => setStrategy(e.target.value)} options={[
                { value: "webhook", label: "REST Webhook (TV)" },
                { value: "telegram", label: "Telegram Channel Scraper" }
              ]} />
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <CustomButton onClick={() => saveBot('copier')} disabled={loading}>Generate Endpoint Keys</CustomButton>
          </div>
        </div>
      )}

      {/* Grid view of active bots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {bots.length === 0 && wizardStep === 'none' && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center border border-[--border] border-dashed rounded-2xl bg-[--bg-card]">
            <Bot className="w-12 h-12 text-[--text-tertiary] mb-4 opacity-50" />
            <p className="text-[13px] text-[--text-secondary]">No active nodes found in the cluster.</p>
          </div>
        )}
        
        {bots.map(bot => (
          <div key={bot.id} className="relative rounded-2xl border p-5 overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl group" 
               style={{ background: "var(--bg-card)", borderColor: bot.status === 'active' ? "rgba(0,212,161,0.3)" : "var(--border)" }}>
            
            {/* Glow if active */}
            {bot.status === 'active' && <div className="absolute top-0 right-0 w-32 h-32 bg-[--accent] opacity-10 blur-3xl rounded-full" />}
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ 
                      background: bot.status === 'active' ? "rgba(0,212,161,0.1)" : "var(--bg-elevated)", 
                      borderColor: bot.status === 'active' ? "rgba(0,212,161,0.2)" : "var(--border)",
                      color: bot.status === 'active' ? "var(--accent)" : "var(--text-secondary)"
                    }}>
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[--text-primary] leading-none mb-1.5">{bot.name}</h3>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary]">
                      <span className="flex items-center gap-1">{statusIcon(bot.status)} {bot.status}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <CustomButton variant="ghost" size="icon" onClick={() => toggleBot(bot.id)} className={bot.status === 'active' ? 'text-[--warning]' : 'text-[--accent]'}>
                    {bot.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </CustomButton>
                  <CustomButton variant="ghost" size="icon" onClick={() => deleteBot(bot.id)} className="text-[--loss] hover:text-[--loss]">
                    <Trash2 className="w-4 h-4" />
                  </CustomButton>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1.5 mb-4">
                {bot.symbols.map(s => (
                  <span key={s} className="px-2 py-1 bg-[--bg-elevated] text-[--text-secondary] border border-[--border] rounded text-[10px] font-mono font-bold tracking-wider">{s}</span>
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-3 p-3 bg-[--bg-base] rounded-xl border border-[--border]">
                <div>
                  <div className="text-[10px] text-[--text-tertiary] uppercase font-bold tracking-wider mb-0.5">Strategy</div>
                  <div className="text-[12px] font-medium text-[--text-primary] truncate">{bot.strategy}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[--text-tertiary] uppercase font-bold tracking-wider mb-0.5">Risk</div>
                  <div className="text-[12px] font-medium text-[--text-primary]">{bot.riskPerTrade}% / trade</div>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Tab Navigation & Page ────────────────────────────── */
export default function BotsPage() {
  const [activeTab, setActiveTab] = useState('settings');

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
           <h1 className="text-[32px] font-bold tracking-tight mb-1 flex items-center gap-3" style={{ fontFamily: "var(--font-display, Syne, sans-serif)", color: "var(--text-primary)" }}>
            <Zap className="w-7 h-7 text-[--accent]" /> Neural Engines
          </h1>
          <p className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
            Cluster management for autonomous scripts and incoming webhook hooks.
          </p>
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
        {[
           { id: 'settings', icon: Settings, label: 'Cluster Config' },
           { id: 'performance', icon: BarChart3, label: 'Analytics' },
           { id: 'ai', icon: MessageSquare, label: 'LLM Copilot' },
           { id: 'copier', icon: Copy, label: 'Trade Copier' }
        ].map(tab => {
           const isActive = activeTab === tab.id;
           return (
             <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-bold transition-all whitespace-nowrap border"
                style={{
                  background: isActive ? "var(--text-primary)" : "var(--bg-card)",
                  color: isActive ? "var(--bg-base)" : "var(--text-secondary)",
                  borderColor: isActive ? "transparent" : "var(--border)"
                }}>
                <tab.icon className="w-4 h-4" /> {tab.label}
             </button>
           )
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="mt-6">
        {activeTab === 'settings' && <BotSettingsTab />}
        
        {/* Simplified Stub Placeholders for the other tabs, since the focus was Bot Status Grid and Creation form */}
        {activeTab === 'performance' && (
          <div className="py-20 text-center border border-dashed rounded-2xl bg-[--bg-card] border-[--border]">
             <BarChart3 className="w-10 h-10 mx-auto text-[--text-tertiary] mb-4 opacity-50" />
             <p className="text-[13px] text-[--text-secondary]">Analytics Matrix Initializing...</p>
          </div>
        )}
        
        {activeTab === 'ai' && (
          <div className="py-20 text-center border border-dashed rounded-2xl bg-[--bg-card] border-[--border]">
             <MessageSquare className="w-10 h-10 mx-auto text-[--text-tertiary] mb-4 opacity-50" />
             <p className="text-[13px] text-[--text-secondary]">LLM Integration Online. Standing by.</p>
          </div>
        )}
        
        {activeTab === 'copier' && (
          <div className="py-20 text-center border border-dashed rounded-2xl bg-[--bg-card] border-[--border]">
             <Copy className="w-10 h-10 mx-auto text-[--text-tertiary] mb-4 opacity-50" />
             <p className="text-[13px] text-[--text-secondary]">Waiting for Webhook payload.</p>
          </div>
        )}
      </div>

    </div>
  );
}
