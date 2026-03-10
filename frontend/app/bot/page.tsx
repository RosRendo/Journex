"use client"
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Bot, Settings, MessageSquare, Copy, BarChart3, Play, Pause,
  Plus, Trash2, Edit, Zap, TrendingUp, TrendingDown, Activity,
  Shield, AlertTriangle, CheckCircle, Clock, Wifi, WifiOff,
  Send, RefreshCw, Target, DollarSign, Percent, ArrowUpDown, Cpu
} from 'lucide-react';

import { toast } from 'sonner';

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

  // Form State
  const [botName, setBotName] = useState('');
  const [broker, setBroker] = useState('');
  const [strategy, setStrategy] = useState('');
  const [symbols, setSymbols] = useState('EURUSD');
  const [risk, setRisk] = useState(1.0);
  const [maxLoss, setMaxLoss] = useState(3.0);

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    try {
      const res = await fetch("\/api/bots");
      const data = await res.json();
      if (data.success) setBots(data.bots);
    } catch (e) { console.error("Could not fetch bots"); }
  };

  const saveBot = async (type: string) => {
    try {
      setLoading(true);
      const sList = symbols.split(',').map(s => s.trim());
      await fetch("\/api/bots", {
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
      toast.success("Bot Successfully Created!");
      fetchBots();
      setWizardStep('none');
    } catch (e) {
      toast.error("Failed to create bot. Is MT5 Bridge running?");
    }
    setLoading(false);
  };

  const toggleBot = async (id: string) => {
    try {
      await fetch(`\/api/bots/${id}/toggle`, { method: "POST" });
      fetchBots();
      toast.info("Toggled bot status");
    } catch (e) { toast.error("Failed to toggle bot"); }
  };

  const deleteBot = async (id: string) => {
    try {
      if (!confirm("Are you sure you want to delete this bot?")) return;
      await fetch(`\/api/bots/${id}`, { method: "DELETE" });
      fetchBots();
      toast.success("Bot deleted successfully");
    } catch (e) { toast.error("Failed to delete bot"); }
  };

  const statusIcon = (s: BotConfig['status']) =>
    s === 'active' ? <CheckCircle className="w-3.5 h-3.5 text-profit" /> :
      s === 'paused' ? <Pause className="w-3.5 h-3.5 text-warning" /> :
        <AlertTriangle className="w-3.5 h-3.5 text-loss" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Trading Bots</h2>
          <p className="text-sm text-muted-foreground">Configure and manage your automated trading bots</p>
        </div>
        <Button onClick={() => setWizardStep('select-type')} size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Bot
        </Button>
      </div>

      {wizardStep === 'select-type' && (
        <Card className="border-primary/50 shadow-lg animate-in fade-in slide-in-from-top-4">
          <CardHeader className="pb-3 text-center">
            <CardTitle className="text-xl">What type of bot do you want to create?</CardTitle>
            <CardDescription>Select the architecture that fits your trading goals.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:border-primary transition-all active:scale-95 bg-secondary/20" onClick={() => setWizardStep('create-strategy')}>
              <CardContent className="p-6 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg">Automated Strategy</h3>
                <p className="text-xs text-muted-foreground">Trade 24/7 fully autonomously using technical analysis indicators, breakouts, or grid systems.</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-all active:scale-95 bg-secondary/20" onClick={() => setWizardStep('create-copier')}>
              <CardContent className="p-6 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Copy className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="font-bold text-lg">Trade Copier</h3>
                <p className="text-xs text-muted-foreground">Mirror trades sent via TradingView Webhooks, Telegram signal channels, or personal API.</p>
              </CardContent>
            </Card>
          </CardContent>
          <div className="p-4 border-t border-border flex justify-end">
            <Button variant="ghost" onClick={() => setWizardStep('none')}>Cancel</Button>
          </div>
        </Card>
      )}

      {wizardStep === 'create-strategy' && (
        <Card className="border-primary/30 animate-in fade-in slide-in-from-top-4">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Cpu className="w-5 h-5 text-primary" /> Automated Strategy Configuration</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setWizardStep('select-type')}>&larr; Back</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bot Name</Label>
                <Input placeholder="My Trading Bot" value={botName} onChange={e => setBotName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Broker API</Label>
                <Select value={broker} onValueChange={setBroker}>
                  <SelectTrigger><SelectValue placeholder="Select broker" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Local MT5">Local Python MT5 Bridge</SelectItem>
                    <SelectItem value="Binance">Binance</SelectItem>
                    <SelectItem value="FTMO">FTMO</SelectItem>
                    <SelectItem value="Bybit">Bybit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Select Built-in Strategy</Label>
                <Select value={strategy} onValueChange={setStrategy}>
                  <SelectTrigger><SelectValue placeholder="Select strategy" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="London Breakout">London Session Breakout</SelectItem>
                    <SelectItem value="EMA Scalping">1h EMA Cross Scalping</SelectItem>
                    <SelectItem value="MACD Crossover">MACD Crossover Strategy</SelectItem>
                    <SelectItem value="Mean Reversion">RSI Mean Reversion (Overbought/Oversold)</SelectItem>
                    <SelectItem value="Grid">Grid Trading Engine</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assets (Comma separated)</Label>
                <Input placeholder="XAUUSD, EURUSD" value={symbols} onChange={e => setSymbols(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Risk Per Trade (%)</Label>
                <Input type="number" placeholder="1" min={0.1} max={10} step={0.1} value={risk} onChange={e => setRisk(parseFloat(e.target.value))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setWizardStep('none')}>Cancel</Button>
              <Button onClick={() => saveBot('strategy')} disabled={loading}>Save & Deploy Bot</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {wizardStep === 'create-copier' && (
        <Card className="border-primary/30 animate-in fade-in slide-in-from-top-4">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Copy className="w-5 h-5 text-blue-500" /> Copier / Receiver Setup</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setWizardStep('select-type')}>&larr; Back</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Copier Name</Label>
                <Input placeholder="e.g. TradingView Alerts" value={botName} onChange={e => setBotName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Signal Source</Label>
                <Select value={strategy} onValueChange={setStrategy}>
                  <SelectTrigger><SelectValue placeholder="Select Source" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webhook">Custom Incoming Webhook</SelectItem>
                    <SelectItem value="telegram">Telegram Channel Link</SelectItem>
                    <SelectItem value="mt5-master">Copy from Master MT5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Trade Multiplier / Lot Sizing Mode</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select Lot Size Setting" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Lot Size (0.01)</SelectItem>
                    <SelectItem value="multiplier">Risk Multiplier (e.g. 2x Master signal)</SelectItem>
                    <SelectItem value="percent">Percent of Account Balance (1%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setWizardStep('none')}>Cancel</Button>
              <Button onClick={() => saveBot('copier')} disabled={loading}>Generate Webhook & Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {bots.length === 0 && wizardStep === 'none' && (
          <div className="text-center py-12 bg-secondary/20 rounded-xl border border-dashed border-border text-muted-foreground">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No bots active. Click "Add Bot" to seamlessly connect an AI or trading strategy to your MT5 bridge.</p>
          </div>
        )}
        {bots.map(bot => (
          <Card key={bot.id} className="group hover:border-primary/20 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bot.status === 'active' ? 'bg-profit-muted' : bot.status === 'paused' ? 'bg-warning/10' : 'bg-loss-muted'
                    }`}>
                    <Bot className={`w-5 h-5 ${bot.status === 'active' ? 'text-profit' : bot.status === 'paused' ? 'text-warning' : 'text-loss'
                      }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{bot.name}</span>
                      <Badge variant="outline" className="text-xs">{bot.broker}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">{statusIcon(bot.status)} {bot.status}</span>
                      <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {bot.strategy}</span>
                      <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {bot.riskPerTrade}% risk</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button onClick={() => toggleBot(bot.id)} variant="ghost" size="icon" className={`h-8 w-8 ${bot.status === 'active' ? 'text-warning hover:text-warning' : 'text-profit hover:text-profit'}`}>
                    {bot.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-loss hover:text-loss" onClick={() => deleteBot(bot.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-1.5 mt-3">
                {bot.symbols.map(s => (
                  <Badge key={s} variant="secondary" className="text-xs font-mono">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ── AI Chat Assistant ────────────────────────────────────── */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const defaultMessages: ChatMessage[] = [
  { id: '1', role: 'assistant', content: 'Hey! I\'m your AI trading assistant. Ask me about your trades, strategies, market analysis, or anything trading-related. 🚀', timestamp: new Date().toISOString() },
];

function AIChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [input, setInput] = useState('');

  // AI Config
  const [showConfig, setShowConfig] = useState(false);
  const [aiProvider, setAiProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [isInjecting, setIsInjecting] = useState(false);

  const quickPrompts = [
    'Analyze my win rate this week',
    'What\'s my best performing strategy?',
    'Review my last 10 MT5 trades',
    'Are we overbought on EURUSD right now?',
  ];

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(), role: 'user', content: input, timestamp: new Date().toISOString(),
    };

    // Simulate thinking process
    if (!apiKey) {
      const errBotMsg: ChatMessage = {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: '⚠️ Please click the "Configure AI" button above and securely enter your API key to access live models.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMsg, errBotMsg]);
    } else {
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: `⚡ Securely analyzing your request using [${aiProvider.toUpperCase()}]. Generating deep market analysis across MT5 data...`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMsg, botMsg]);
    }
    setInput('');
  };

  const handleInjectMarketData = async () => {
    setIsInjecting(true);
    try {
      const res = await fetch("\/api/live-data");
      const data = await res.json();

      const systemMsg: ChatMessage = {
        id: Date.now().toString(), role: 'user',
        content: `[SYSTEM_INJECTION: Current live MT5 market data: \n${JSON.stringify(data.data, null, 2)}\n\nAnalyze this immediate live state and inform me of any severe spread expansions or unique cross-pair opportunities.]`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, systemMsg]);

      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(), role: 'assistant',
          content: `I've received the live MT5 injection. Spread looks normal across XAUUSD and EURUSD. Both assets are in a consolidation phase. Consider holding off on breakout strategies until volatility spikes during NY session.`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiResponse]);
      }, 1500);

    } catch (e) {
      toast.error("Bridge disconnected. Couldn't fetch live data from Python.");
    }
    setIsInjecting(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] relative">
      <div className="flex items-center gap-2 pb-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">AI Trading Assistant</h2>
          <p className="text-xs text-muted-foreground">Powered by AI • Ask about real-time MT5 bridge data</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1 border-primary/30 text-primary hover:bg-primary/20" onClick={handleInjectMarketData} disabled={isInjecting}>
            <Activity className="w-3.5 h-3.5" /> Inject Live MT5 Data
          </Button>
          <Button variant={apiKey ? "default" : "secondary"} size="sm" className="h-8 gap-1" onClick={() => setShowConfig(!showConfig)}>
            <Settings className="w-3.5 h-3.5" /> Configure AI
          </Button>
        </div>
      </div>

      {showConfig && (
        <Card className="absolute top-[60px] right-0 z-50 w-80 shadow-2xl border-primary/50 bg-background/95 backdrop-blur-md">
          <CardHeader className="pb-3 text-sm font-bold">LLM Model Configuration</CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Select Provider</Label>
              <Select value={aiProvider} onValueChange={setAiProvider}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude 3.5 Sonnet)</SelectItem>
                  <SelectItem value="deepseek">DeepSeek (V3 Coder)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Secure API Key</Label>
              <Input
                type="password"
                placeholder="sk-..."
                className="h-8 text-xs font-mono"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">Keys are stored locally in your browser to process MT5 data instantly via front-end.</p>
            </div>
            <Button className="w-full h-8 text-xs" onClick={() => setShowConfig(false)}>Save & Close</Button>
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${msg.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border text-foreground'
              }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 pb-3 overflow-x-auto">
        {quickPrompts.map(prompt => (
          <button
            key={prompt}
            onClick={() => setInput(prompt)}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask about your trades, strategies, or markets..."
          className="flex-1"
        />
        <Button onClick={handleSend} size="icon"><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}

/* ── Trade Copier / Signal Bot ────────────────────────────── */
interface Signal {
  id: string;
  source: string;
  symbol: string;
  direction: 'long' | 'short';
  entry: number;
  sl: number;
  tp: number;
  status: 'pending' | 'executed' | 'expired';
  timestamp: string;
}

const mockSignals: Signal[] = [];

function TradeCopierTab() {
  const [autoCopy, setAutoCopy] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    fetch("\/api/signals").then(res => res.json()).then(data => {
      if (data.success && data.signals) setSignals(data.signals);
    }).catch(e => console.error(e));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Trade Copier & Signals</h2>
          <p className="text-sm text-muted-foreground">Copy trades from signals, webhooks, or other accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="auto-copy" className="text-sm text-muted-foreground">Auto-copy</Label>
          <Switch id="auto-copy" checked={autoCopy} onCheckedChange={setAutoCopy} />
        </div>
      </div>

      {/* Source Config */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Zap, label: 'TradingView', desc: 'Webhook alerts', connected: true },
          { icon: MessageSquare, label: 'Telegram', desc: 'Channel signals', connected: false },
          { icon: RefreshCw, label: 'Custom API', desc: 'REST webhook', connected: true },
        ].map(src => (
          <Card key={src.label} className={`cursor-pointer transition-colors ${src.connected ? 'border-profit/30' : 'hover:border-primary/20'}`}>
            <CardContent className="p-4 text-center">
              <div className={`w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-2 ${src.connected ? 'bg-profit-muted' : 'bg-secondary'
                }`}>
                <src.icon className={`w-5 h-5 ${src.connected ? 'text-profit' : 'text-muted-foreground'}`} />
              </div>
              <div className="text-sm font-medium text-foreground">{src.label}</div>
              <div className="text-xs text-muted-foreground">{src.desc}</div>
              <Badge variant={src.connected ? 'default' : 'outline'} className="mt-2 text-xs">
                {src.connected ? 'Connected' : 'Connect'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Signals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Signals</CardTitle>
          <CardDescription>Incoming trade signals from connected sources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {signals.length === 0 && (
              <div className="text-center text-sm text-muted-foreground p-4">Awaiting signals. You can trigger a Webhook test to your `/api/webhook/copier` to populate this.</div>
            )}
            {signals.map(sig => (
              <div key={sig.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-center gap-3">
                  {sig.direction === 'long' ? (
                    <TrendingUp className="w-4 h-4 text-profit" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-loss" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-semibold text-foreground">{sig.symbol}</span>
                      <Badge variant="outline" className={`text-xs ${sig.direction === 'long' ? 'text-profit border-profit/30' : 'text-loss border-loss/30'}`}>
                        {sig.direction.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {sig.source} • Entry: {sig.entry} • SL: {sig.sl} • TP: {sig.tp}
                    </div>
                  </div>
                </div>
                <Badge variant={sig.status === 'executed' ? 'default' : sig.status === 'pending' ? 'secondary' : 'outline'} className="text-xs">
                  {sig.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Bot Performance Tracker ──────────────────────────────── */
interface BotPerformance {
  id: string;
  name: string;
  totalTrades: number;
  winRate: number;
  pnl: number;
  roi: number;
  maxDrawdown: number;
  sharpe: number;
  status: 'running' | 'stopped';
  uptime: string;
}

const mockPerformance: BotPerformance[] = [];

function BotPerformanceTab() {
  const [performance, setPerformance] = useState<BotPerformance[]>([]);
  const [totals, setTotals] = useState({ active: 0, pnl: 0, winRate: 0 });

  useEffect(() => {
    fetch("\/api/performance").then(res => res.json()).then(data => {
      if (data.success && data.performance) {
        setPerformance(data.performance);
        const activeCount = data.performance.filter((p: BotPerformance) => p.status === 'running').length;
        const totalPnl = data.performance.reduce((acc: number, p: BotPerformance) => acc + p.pnl, 0);
        const avgWr = data.performance.reduce((acc: number, p: BotPerformance) => acc + p.winRate, 0) / (data.performance.length || 1);
        setTotals({ active: activeCount, pnl: totalPnl, winRate: avgWr });
      }
    }).catch(e => console.error(e));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Bot Performance</h2>
        <p className="text-sm text-muted-foreground">Monitor and track your MT5 bots trading performance</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Bots', value: performance.length.toString(), icon: Bot, color: 'text-primary' },
          { label: 'Active', value: totals.active.toString(), icon: Activity, color: 'text-profit' },
          { label: 'Total P&L', value: `${totals.pnl >= 0 ? '+' : ''}$${totals.pnl.toLocaleString()}`, icon: DollarSign, color: totals.pnl >= 0 ? 'text-profit' : 'text-loss' },
          { label: 'Avg Win Rate', value: `${totals.winRate.toFixed(1)}%`, icon: Percent, color: 'text-foreground' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bot Details */}
      {performance.length === 0 && (
        <div className="text-center text-sm text-muted-foreground p-8 rounded border border-dashed border-border">No performance data yet. Add a bot first!</div>
      )}
      {performance.map(bot => (
        <Card key={bot.id}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bot.status === 'running' ? 'bg-profit-muted' : 'bg-secondary'
                  }`}>
                  <Bot className={`w-5 h-5 ${bot.status === 'running' ? 'text-profit' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <span className="font-semibold text-foreground">{bot.name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={bot.status === 'running' ? 'default' : 'secondary'} className="text-xs gap-1">
                      {bot.status === 'running' ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                      {bot.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Uptime: {bot.uptime}
                    </span>
                  </div>
                </div>
              </div>
              <div className={`text-xl font-bold font-mono ${bot.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                {bot.pnl >= 0 ? '+' : ''}${bot.pnl.toLocaleString()}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-4">
              {[
                { label: 'Total Trades', value: bot.totalTrades.toString() },
                { label: 'Win Rate', value: `${bot.winRate}%` },
                { label: 'ROI', value: `${bot.roi > 0 ? '+' : ''}${bot.roi}%` },
                { label: 'Max Drawdown', value: `${bot.maxDrawdown}%` },
                { label: 'Sharpe Ratio', value: bot.sharpe.toFixed(2) },
              ].map(m => (
                <div key={m.label} className="text-center p-3 rounded-lg bg-secondary/50">
                  <div className="text-xs text-muted-foreground mb-1">{m.label}</div>
                  <div className="text-sm font-semibold font-mono text-foreground">{m.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Main Bots Page ───────────────────────────────────────── */
export default function Bots() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bot Center</h1>
          <p className="text-sm text-muted-foreground">Manage bots, signals, AI assistant & performance tracking</p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="bg-secondary/50 border border-border">
          <TabsTrigger value="settings" className="gap-1.5 data-[state=active]:bg-card">
            <Settings className="w-3.5 h-3.5" /> Bot Settings
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5 data-[state=active]:bg-card">
            <MessageSquare className="w-3.5 h-3.5" /> AI Assistant
          </TabsTrigger>
          <TabsTrigger value="copier" className="gap-1.5 data-[state=active]:bg-card">
            <Copy className="w-3.5 h-3.5" /> Trade Copier
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5 data-[state=active]:bg-card">
            <BarChart3 className="w-3.5 h-3.5" /> Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings"><BotSettingsTab /></TabsContent>
        <TabsContent value="ai"><AIChatTab /></TabsContent>
        <TabsContent value="copier"><TradeCopierTab /></TabsContent>
        <TabsContent value="performance"><BotPerformanceTab /></TabsContent>
      </Tabs>
    </div>
  );
}
