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

interface BotSettingsTabProps {
  activeTab?: string;
}

function BotSettingsTab({ activeTab }: BotSettingsTabProps) {
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [slaves, setSlaves] = useState<any[]>([]);
  const [internalTab, setInternalTab] = useState<'strategy' | 'copier'>(activeTab === 'copier' ? 'copier' : 'strategy');
  const [wizardStep, setWizardStep] = useState<'none' | 'select-type' | 'create-strategy' | 'create-copier'>('none');
  const [loading, setLoading] = useState(false);

  const [botName, setBotName] = useState('');
  const [broker, setBroker] = useState('');
  const [strategy, setStrategy] = useState('');
  const [symbols, setSymbols] = useState('XAUUSD');
  const [risk, setRisk] = useState(1.0);
  const [maxLoss, setMaxLoss] = useState(3.0);

  useEffect(() => { fetchBots(); fetchSlaves(); }, []);

  const BRIDGE = typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "/api/bridge"
    : (process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge");

  const fetchBots = async () => {
    try {
      const res = await fetch(`${BRIDGE}/api/bots`, { headers: { "ngrok-skip-browser-warning": "true" } });
      const data = await res.json();
      if (data.success) setBots(data.bots);
    } catch (e) { console.error("Could not fetch bots"); }
  };

  const fetchSlaves = async () => {
    try {
      const res = await fetch(`${BRIDGE}/api/slaves`, { headers: { "ngrok-skip-browser-warning": "true" } });
      const data = await res.json();
      if (data.success) setSlaves(data.slaves);
    } catch (e) { console.error("Could not fetch slaves"); }
  };

  const toggleSlave = async (id: string) => {
    try {
      await fetch(`${BRIDGE}/api/slaves/${id}/toggle`, { headers: { "ngrok-skip-browser-warning": "true" }, method: "POST" });
      fetchSlaves();
    } catch (e) { console.error(e); }
  };

  const deleteSlave = async (id: string) => {
    if (!confirm("Remove this slave?")) return;
    try {
      await fetch(`${BRIDGE}/api/slaves/${id}`, { headers: { "ngrok-skip-browser-warning": "true" }, method: "DELETE" });
      fetchSlaves();
    } catch (e) { console.error(e); }
  };

  const saveBot = async (type: string) => {
    console.log('Saving bot type:', type, 'to BRIDGE:', BRIDGE);
    try {
      setLoading(true);
      
      if (type === 'copier') {
        const multiplier = parseFloat(strategy) || 1.0;
        console.log('Posting to:', `${BRIDGE}/api/slaves`);
        const res = await fetch(`${BRIDGE}/api/slaves`, {
          method: "POST", headers: { 
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true"
          },
          body: JSON.stringify({
            name: botName || 'Trade Copier Slave',
            webhook_url: `${BRIDGE}/api/copy-trade/execute`,
            multiplier: multiplier
          })
        });
        console.log('Response status:', res.status);
        const data = await res.json();
        console.log('Slave created:', data);
        if (!data.success) {
          alert('Failed: ' + (data.error || 'Unknown error'));
        }
      } else {
        const sList = symbols.split(',').map(s => s.trim());
        await fetch(`${BRIDGE}/api/bots`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: botName || 'New Strategy Bot',
            broker: broker || 'Local MT5',
            strategy: strategy || type,
            symbols: sList,
            riskPerTrade: risk,
            maxDailyLoss: maxLoss
          })
        });
      }
      
      fetchBots();
      fetchSlaves();
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
      {/* Internal sub-tab switcher */}
      <div className="flex gap-3 border-b border-[--border] pb-4">
        <button onClick={() => setInternalTab('strategy')} className={`text-[13px] font-bold px-4 py-2 rounded-lg transition-all ${internalTab === 'strategy' ? 'bg-[--accent] text-white' : 'text-[--text-secondary] hover:text-[--text-primary]'}`}>
          <Cpu className="w-4 h-4 inline mr-2" />Strategy Bots
        </button>
        <button onClick={() => setInternalTab('copier')} className={`text-[13px] font-bold px-4 py-2 rounded-lg transition-all ${internalTab === 'copier' ? 'bg-[--accent] text-white' : 'text-[--text-secondary] hover:text-[--text-primary]'}`}>
          <Copy className="w-4 h-4 inline mr-2" />Copy Trading
        </button>
      </div>

      {/* Strategy Tab Content */}
      {internalTab === 'strategy' && (
      <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
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
                { value: "Instant Scalping", label: "⚡ Instant Scalping" },
                { value: "EMA Scalping", label: "EMA Scalping" },
                { value: "London Breakout", label: "London Breakout" },
                { value: "MACD Crossover", label: "MACD Crossover" },
                { value: "Dynamic Grid Matrix", label: "Dynamic Grid" }
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
      </>
      )}

      {/* Copy Trading Tab Content */}
      {internalTab === 'copier' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <CustomButton onClick={() => setWizardStep('create-copier')}>
              <Plus className="w-4 h-4 mr-2" /> Add Slave
            </CustomButton>
          </div>
          
          {wizardStep === 'create-copier' && (
            <div className="rounded-2xl border p-6 animate-in fade-in bg-[--bg-card]" style={{ borderColor: "var(--border-strong)" }}>
              <div className="flex items-center justify-between border-b border-[--border] pb-4 mb-6">
                <h3 className="text-[15px] font-bold text-[--text-primary] flex items-center gap-2"><Copy className="w-4 h-4 text-[#3b82f6]"/> Copy Trading Setup</h3>
                <CustomButton variant="ghost" size="sm" onClick={() => setWizardStep('none')}>Cancel</CustomButton>
              </div>
              
              {/* Your endpoint to share */}
              <div className="mb-6 p-4 bg-[--bg-elevated] rounded-xl border border-[--border]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-[--text-tertiary] uppercase">Your Copy Endpoint</label>
                  <button 
                    onClick={() => {
                      const url = BRIDGE + '/api/copy-trade/execute';
                      navigator.clipboard.writeText(url);
                      alert('Copied!');
                    }}
                    className="text-[10px] text-[--accent] hover:underline"
                  >
                    📋 Copy
                  </button>
                </div>
                <div className="font-mono text-[10px] text-[--text-secondary] break-all">
                  {BRIDGE}/api/copy-trade/execute
                </div>
                <p className="text-[10px] text-[--text-tertiary] mt-2">Share this URL with master account to receive trades</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold text-[--text-tertiary] uppercase tracking-wider mb-2">Slave Name</label>
                  <CustomInput placeholder="e.g. My Master" value={botName} onChange={(e:any) => setBotName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[--text-tertiary] uppercase tracking-wider mb-2">Lot Multiplier</label>
                  <CustomSelect placeholder="Select multiplier" value={strategy} onChange={(e:any) => setStrategy(e.target.value)} options={[
                    { value: "0.5", label: "0.5x (Half)" },
                    { value: "1.0", label: "1.0x (Same)" },
                    { value: "2.0", label: "2.0x (Double)" },
                    { value: "5.0", label: "5.0x (Quintuple)" }
                  ]} />
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <CustomButton onClick={() => saveBot('copier')} disabled={loading}>Add Slave Account</CustomButton>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {slaves.length === 0 && wizardStep === 'none' && (
              <div className="col-span-full py-16 flex flex-col items-center justify-center border border-[--border] border-dashed rounded-2xl bg-[--bg-card]">
                <Copy className="w-12 h-12 text-[--text-tertiary] mb-4 opacity-50" />
                <p className="text-[13px] text-[--text-secondary]">No slave accounts configured.</p>
                <p className="text-[11px] text-[--text-tertiary] mt-1">Add a slave to receive trades from a master account.</p>
              </div>
            )}
            
            {slaves.map(slave => (
              <div key={slave.id} className="relative rounded-2xl border p-5 overflow-hidden transition-all" 
                   style={{ background: "var(--bg-card)", borderColor: slave.enabled ? "rgba(0,212,161,0.3)" : "var(--border)" }}>
                {slave.enabled && <div className="absolute top-0 right-0 w-32 h-32 bg-[--accent] opacity-10 blur-3xl rounded-full" />}
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ 
                          background: slave.enabled ? "rgba(0,212,161,0.1)" : "var(--bg-elevated)", 
                          borderColor: slave.enabled ? "rgba(0,212,161,0.2)" : "var(--border)",
                          color: slave.enabled ? "var(--accent)" : "var(--text-secondary)"
                        }}>
                        <Copy className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-[15px] font-bold text-[--text-primary] leading-none mb-1.5">{slave.name}</h3>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary]">
                          <span className="flex items-center gap-1">
                            {slave.enabled ? <CheckCircle2 className="w-3.5 h-3.5 text-[--profit]" /> : <Pause className="w-3.5 h-3.5 text-[--warning]" />} 
                            {slave.enabled ? 'active' : 'paused'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <CustomButton variant="ghost" size="icon" onClick={() => toggleSlave(slave.id)} className={slave.enabled ? 'text-[--warning]' : 'text-[--accent]'}>
                        {slave.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </CustomButton>
                      <CustomButton variant="ghost" size="icon" onClick={() => deleteSlave(slave.id)} className="text-[--loss] hover:text-[--loss]">
                        <Trash2 className="w-4 h-4" />
                      </CustomButton>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-[11px] text-[--text-secondary]">
                    <div className="flex justify-between">
                      <span className="text-[--text-tertiary]">Multiplier</span>
                      <span className="font-bold">{slave.multiplier}x</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[--text-tertiary]">Endpoint</span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(slave.webhook_url || '')}
                        className="text-[10px] text-[--accent] hover:underline"
                        title="Click to copy"
                      >
                        📋 Copy
                      </button>
                    </div>
                    <div className="font-mono text-[9px] text-[--text-tertiary] break-all bg-[--bg-elevated] p-1 rounded">
                      {slave.webhook_url}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Tab Navigation & Page ────────────────────────────── */
export default function BotsPage() {
  const [botTab, setActiveTab] = useState('settings');

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
           const isActive = botTab === tab.id;
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
        {(botTab === 'settings' || botTab === 'copier') && <BotSettingsTab activeTab={botTab} />}
        
        {/* Simplified Stub Placeholders for the other tabs, since the focus was Bot Status Grid and Creation form */}
        {botTab === 'performance' && (
          <div className="py-20 text-center border border-dashed rounded-2xl bg-[--bg-card] border-[--border]">
             <BarChart3 className="w-10 h-10 mx-auto text-[--text-tertiary] mb-4 opacity-50" />
             <p className="text-[13px] text-[--text-secondary]">Analytics Matrix Initializing...</p>
          </div>
        )}
        
        {botTab === 'ai' && (
          <div className="py-20 text-center border border-dashed rounded-2xl bg-[--bg-card] border-[--border]">
             <MessageSquare className="w-10 h-10 mx-auto text-[--text-tertiary] mb-4 opacity-50" />
             <p className="text-[13px] text-[--text-secondary]">LLM Integration Online. Standing by.</p>
          </div>
        )}
      </div>

    </div>
  );
}
