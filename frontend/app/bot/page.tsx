"use client"
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Bot, Settings, MessageSquare, Copy, BarChart3, Play, Pause,
  Plus, Trash2, Edit, Zap, TrendingUp, TrendingDown, Activity,
  Shield, AlertTriangle, CheckCircle2, Clock, Wifi, WifiOff,
  Send, RefreshCw, Target, DollarSign, Percent, ArrowUpDown, Cpu, Circle, CheckCircle, Download
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

/* ── MQL5 Expert Advisor Management Tab ─────────────────── */
function Mql5EaTab() {
  const [eas, setEas] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [selectedMagic, setSelectedMagic] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Settings Edit Form State
  const [editRisk, setEditRisk] = useState(1.0);
  const [editMinScore, setEditMinScore] = useState(70);
  const [editMinRr, setEditMinRr] = useState(1.5);
  const [editSession, setEditSession] = useState("both");
  const [editSignalType, setEditSignalType] = useState("all");
  const [pushing, setPushing] = useState(false);

  const BRIDGE = typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "/api/bridge"
    : (process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge");

  const loadData = async () => {
    try {
      const statusRes = await fetch(`${BRIDGE}/api/ea/status`, { headers: { "ngrok-skip-browser-warning": "true" } });
      const statusData = await statusRes.json();
      if (statusData.success) {
        setEas(statusData.eas);
        if (statusData.eas.length > 0 && selectedMagic === null) {
          setSelectedMagic(statusData.eas[0].magic);
        }
      }

      const tradesRes = await fetch(`${BRIDGE}/api/ea/trades` + (selectedMagic ? `?magic=${selectedMagic}` : ''), { headers: { "ngrok-skip-browser-warning": "true" } });
      const tradesData = await tradesRes.json();
      if (tradesData.success) {
        setTrades(tradesData.events);
      }
    } catch (e) {
      console.error("Failed to load MQL5 EA data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [selectedMagic]);

  useEffect(() => {
    if (selectedMagic) {
      const activeEa = eas.find(e => e.magic === selectedMagic);
      if (activeEa && activeEa.last_report?.settings) {
        const s = activeEa.last_report.settings;
        setEditRisk(s.risk ?? 1.0);
        setEditMinScore(s.min_score ?? 70);
        setEditMinRr(s.min_rr ?? 1.5);
        setEditSession(s.session ?? "both");
        setEditSignalType(s.signal_type ?? "all");
      }
    }
  }, [selectedMagic, eas.length]);

  const handlePushSettings = async () => {
    if (!selectedMagic) return;
    try {
      setPushing(true);
      const res = await fetch(`${BRIDGE}/api/ea/settings/${selectedMagic}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          risk: editRisk,
          min_score: editMinScore,
          min_rr: editMinRr,
          session: editSession,
          signal_type: editSignalType
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Dynamic configuration queued for Magic #${selectedMagic}`);
      } else {
        toast.error("Failed to queue configuration update");
      }
    } catch (e) {
      console.error(e);
      toast.error("Bridge connection failure");
    } finally {
      setPushing(false);
    }
  };

  const selectedEa = eas.find(e => e.magic === selectedMagic);

  return (
    <div className="space-y-6 animate-fade-in text-[--text-primary]">
      
      {/* Overview stats & Active EAs Grid */}
      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Left Side: EA List */}
        <div className="xl:w-2/3 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-zinc-400">
              Active MQL5 Terminals ({eas.length})
            </h3>
            <button onClick={loadData} className="p-1 rounded hover:bg-zinc-800 text-zinc-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
            </button>
          </div>

          {eas.length === 0 ? (
            <div className="p-10 border border-dashed rounded-2xl border-[--border] bg-[--bg-card] flex flex-col items-center justify-center text-center">
              <WifiOff className="w-8 h-8 text-zinc-650 mb-3" />
              <h4 className="text-[13px] font-bold text-zinc-300">No MQL5 Terminals Registered</h4>
              <p className="text-[11px] text-zinc-500 max-w-sm mt-1">
                Download the <code className="text-purple-400">AdaptiveICT_EA.mq5</code> file, configure your URL, compile, and run it on MT5 to connect.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eas.map(ea => {
                const report = ea.last_report || {};
                const isOnline = ea.status === "running";
                const isSelected = ea.magic === selectedMagic;
                
                return (
                  <div
                    key={ea.magic}
                    onClick={() => setSelectedMagic(ea.magic)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
                      isSelected 
                        ? "bg-[#111118] border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.08)]"
                        : "bg-[--bg-card] border-[--border] hover:border-zinc-700/60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                          isOnline ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                        }`}>
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                            Magic #{ea.magic}
                          </h4>
                          <span className="text-[9px] text-zinc-500 font-mono">
                            {report.symbol || "unknown"} · {report.name || "EA"}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border font-mono ${
                        isOnline 
                          ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30"
                          : "bg-red-950/20 text-red-400 border-red-900/30"
                      }`}>
                        {isOnline ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-zinc-800/30 font-mono text-[10px]">
                      <div>
                        <span className="text-[7px] text-zinc-500 uppercase tracking-widest block mb-0.5">Balance</span>
                        <span className="text-zinc-200">${report.balance ? report.balance.toFixed(2) : "0.00"}</span>
                      </div>
                      <div>
                        <span className="text-[7px] text-zinc-500 uppercase tracking-widest block mb-0.5">Equity</span>
                        <span className="text-emerald-400 font-bold">${report.equity ? report.equity.toFixed(2) : "0.00"}</span>
                      </div>
                      <div>
                        <span className="text-[7px] text-zinc-500 uppercase tracking-widest block mb-0.5">Open trades</span>
                        <span className="text-zinc-350">{report.open_trades ?? 0}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3 text-[9px] text-zinc-550 font-mono">
                      <span>Seen: {new Date(ea.timestamp).toLocaleTimeString()}</span>
                      <span className="uppercase text-[8px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20 font-bold">
                        {report.settings?.signal_type || "ALL"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Trades table log */}
          <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-purple-400" /> EA Execution Logs
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-[9px] text-zinc-500 uppercase text-left">
                    <th className="pb-2">Time</th>
                    <th className="pb-2">Ticket</th>
                    <th className="pb-2">Symbol</th>
                    <th className="pb-2">Action</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2 text-right">Volume</th>
                    <th className="pb-2 text-right">Price</th>
                    <th className="pb-2 text-right">SL / TP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40">
                  {trades.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-550">
                        No executed trades recorded yet
                      </td>
                    </tr>
                  ) : (
                    trades.map((t, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/10">
                        <td className="py-2.5 text-zinc-500">{new Date(t.timestamp).toLocaleTimeString()}</td>
                        <td className="py-2.5 text-zinc-300">#{t.ticket}</td>
                        <td className="py-2.5 font-bold text-white">{t.symbol}</td>
                        <td className="py-2.5">
                          <span className={`text-[8px] px-1.5 py-0.5 rounded border ${
                            t.action === "open" ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30" : 
                            t.action === "close" ? "bg-red-950/20 text-red-400 border-red-900/30" : 
                            "bg-blue-950/20 text-blue-400 border-blue-900/30"
                          }`}>
                            {t.action.toUpperCase()}
                          </span>
                        </td>
                        <td className={`py-2.5 font-bold ${t.type === "BUY" ? "text-emerald-400" : "text-red-400"}`}>{t.type}</td>
                        <td className="py-2.5 text-right text-zinc-350">{t.volume.toFixed(2)}</td>
                        <td className="py-2.5 text-right text-zinc-300">{t.price.toFixed(5)}</td>
                        <td className="py-2.5 text-right text-zinc-500">
                          {t.sl.toFixed(5)} / {t.tp.toFixed(5)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Configuration & Dynamic parameter sync */}
        <div className="xl:w-1/3 space-y-6">
          
          {selectedEa ? (
            <div className="p-5 bg-[#111118]/80 border border-zinc-800/60 rounded-2xl shadow-xl space-y-5">
              <div className="border-b border-zinc-800/40 pb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-white flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-purple-400" /> EA Control Sync
                </h3>
                <span className="text-[9px] font-mono text-zinc-550">Magic: {selectedMagic}</span>
              </div>

              {/* Parameter Settings */}
              <div className="space-y-4 text-xs font-mono">
                {/* Risk */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold text-[10px]">
                    <span className="text-zinc-500 uppercase tracking-wider">Lot Risk per Trade</span>
                    <span className="text-purple-400">{editRisk.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="5.0"
                    step="0.1"
                    value={editRisk}
                    onChange={(e) => setEditRisk(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 h-1 bg-zinc-900 rounded-full appearance-none cursor-pointer mt-1"
                  />
                </div>

                {/* Min Score */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-bold text-[10px]">
                    <span className="text-zinc-500 uppercase tracking-wider">Confluence Trigger Score</span>
                    <span className="text-purple-400">{editMinScore}/100</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={editMinScore}
                    onChange={(e) => setEditMinScore(parseInt(e.target.value))}
                    className="w-full accent-purple-500 h-1 bg-zinc-900 rounded-full appearance-none cursor-pointer mt-1"
                  />
                </div>

                {/* Min RR */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Minimum Target RR</label>
                  <select
                    value={editMinRr}
                    onChange={(e) => setEditMinRr(parseFloat(e.target.value))}
                    className="w-full bg-black/45 border border-zinc-800/80 rounded-xl px-3.5 py-2 text-zinc-350 text-xs focus:outline-none focus:border-purple-500 font-mono cursor-pointer"
                  >
                    <option value="1.0" className="bg-zinc-950">1:1.0 Minimum</option>
                    <option value="1.5" className="bg-zinc-950">1:1.5 Minimum</option>
                    <option value="2.0" className="bg-zinc-950">1:2.0 Minimum</option>
                    <option value="2.5" className="bg-zinc-950">1:2.5 Minimum</option>
                    <option value="3.0" className="bg-zinc-950">1:3.0 Minimum</option>
                  </select>
                </div>

                {/* Session */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Allowed Active Session</label>
                  <select
                    value={editSession}
                    onChange={(e) => setEditSession(e.target.value)}
                    className="w-full bg-black/45 border border-zinc-800/80 rounded-xl px-3.5 py-2 text-zinc-350 text-xs focus:outline-none focus:border-purple-500 font-mono cursor-pointer"
                  >
                    <option value="both" className="bg-zinc-950">London & New York</option>
                    <option value="london" className="bg-zinc-950">London Only</option>
                    <option value="ny" className="bg-zinc-950">New York Only</option>
                    <option value="all" className="bg-zinc-950">All Times</option>
                  </select>
                </div>

                {/* Setup Type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Preferred Setup Type</label>
                  <select
                    value={editSignalType}
                    onChange={(e) => setEditSignalType(e.target.value)}
                    className="w-full bg-black/45 border border-zinc-800/80 rounded-xl px-3.5 py-2 text-zinc-350 text-xs focus:outline-none focus:border-purple-500 font-mono cursor-pointer"
                  >
                    <option value="all" className="bg-zinc-950">All Patterns</option>
                    <option value="ict_scalper" className="bg-zinc-950">ICT Scalper Preset</option>
                    <option value="ict_intraday" className="bg-zinc-950">ICT Intraday Preset</option>
                    <option value="supply_demand" className="bg-zinc-950">Supply & Demand</option>
                    <option value="momentum_breakout" className="bg-zinc-950">Momentum Breakout</option>
                  </select>
                </div>

                <button
                  onClick={handlePushSettings}
                  disabled={pushing}
                  className="w-full py-2.5 mt-2 bg-purple-500 hover:bg-purple-400 text-purple-950 font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_10px_rgba(168,85,247,0.15)] flex items-center justify-center gap-1.5"
                >
                  {pushing ? (
                    "Pushing..."
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Push Settings to EA
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 bg-zinc-950/20 border border-zinc-850/40 border-dashed rounded-2xl text-center py-10 text-zinc-550 text-xs font-mono">
              Select an active MQL5 EA from the list to synchronize settings.
            </div>
          )}

          {/* Download and Guide Panel */}
          <div className="p-5 bg-[--bg-card] border border-[--border] rounded-2xl space-y-4 text-xs font-mono">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 border-b border-zinc-850 pb-2">
              <Download className="w-4 h-4 text-purple-400" /> MQL5 Compilation Guide
            </h4>
            
            <div className="space-y-3 text-[11px] leading-relaxed text-zinc-400">
              <p>
                1. Open MetaTrader 5 and launch **MetaEditor** (F4).
              </p>
              <p>
                2. Create a new Expert Advisor named <code className="text-purple-400 font-bold">AdaptiveICT_EA</code>.
              </p>
              <p>
                3. Replace its contents with the generated code inside your project workspace root.
              </p>
              <p>
                4. Set <code className="text-purple-400">InpBridgeURL</code> to your local server url (e.g. <code className="text-zinc-300">http://127.0.0.1:5003</code>).
              </p>
              <p>
                5. Add the bridge URL to your MT5 Terminal options:
                <br />
                <code className="text-[10px] text-zinc-500 block bg-black/40 p-1.5 rounded mt-1 border border-zinc-800">
                  Tools → Options → Expert Advisors → Allow WebRequest for listed URL
                </code>
              </p>
            </div>
          </div>

        </div>

      </div>

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
           { id: 'mql5_ea', icon: Cpu, label: 'MQL5 EAs' },
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
        {botTab === 'mql5_ea' && <Mql5EaTab />}
        
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
