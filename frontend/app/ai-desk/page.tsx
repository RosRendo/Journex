"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Zap, ChevronRight, Activity, ShieldAlert, Cpu } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/terminalApi";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  type?: "text" | "report" | "opportunity";
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "ai",
    type: "report",
    content: "Good morning, Ros. Let's align on today's trading plan."
  }
];

export default function AIDeskPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: userMsg, type: "text" }]);
    setInput("");
    
    try {
      const res = await api.post("/ai/chat", {
        message: userMsg,
        history: messages
      });
      
      if (res.data && res.data.success) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: "ai",
          content: res.data.response,
          type: "text"
        }]);
      }
    } catch (e) {
      console.error("AI chat failed", e);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "ai",
        content: "I am having trouble connecting to my neural network. Please try again.",
        type: "text"
      }]);
    }
  };

  const QuickPills = [
    "Today's Outlook", "Today's Opportunity", "Today's Risk", 
    "Weekly Report", "Performance Analysis", "Improvement Recs"
  ];

  return (
    <div className="flex h-[calc(100vh-80px)] max-w-[1600px] mx-auto gap-4 animate-fade-in text-text-primary px-4 md:px-6 py-4">
      
      {/* ── LEFT: QUICK QUERIES ── */}
      <div className="hidden lg:flex w-[260px] flex-col gap-2 p-4 rounded-xl bg-[#111118] border border-zinc-800/40 shadow-xl">
        <div className="flex items-center gap-2 mb-4 px-1">
          <Cpu className="w-4 h-4 text-emerald-405" />
          <h2 className="font-display font-bold text-sm text-white tracking-widest uppercase">AI DESK</h2>
        </div>
        
        {QuickPills.map(pill => (
          <button 
            key={pill}
            onClick={() => setInput(`Show me ${pill}`)}
            className="flex items-center justify-between p-2.5 rounded-lg hover:bg-black/25 border border-transparent hover:border-zinc-850 transition-all text-left group font-mono text-[11px]"
          >
            <span className="text-zinc-400 group-hover:text-zinc-200">{pill}</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-emerald-400" />
          </button>
        ))}
        
        <div className="mt-auto p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 font-mono text-[11px]">
          <h3 className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
             <Activity className="w-3 h-3 animate-pulse" /> Live AI Watcher
          </h3>
          <p className="text-zinc-450 leading-relaxed">
            AI is currently monitoring <strong className="text-zinc-200">#XAUUSD</strong> for a breakout setup.
          </p>
        </div>
      </div>

      {/* ── RIGHT: CHAT INTERFACE ── */}
      <div className="flex-1 flex flex-col bg-[#111118] border border-zinc-800/40 rounded-xl overflow-hidden shadow-xl relative">
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scroll-thin">
          {messages.map(msg => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className={`flex gap-3.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                msg.role === "user" ? "bg-black/35 border-zinc-800 text-zinc-300" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }`}>
                {msg.role === "user" ? <User size={13} /> : <Bot size={13} />}
              </div>
              
              <div className={`max-w-[75%] ${msg.role === "user" ? "text-right" : "text-left"}`}>
                {msg.type === "report" ? (
                  <div className="bg-[#111118] border border-zinc-800/60 p-4.5 rounded-xl shadow-lg font-mono">
                    <div className="flex items-center gap-2 mb-2.5 border-b border-zinc-850 pb-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-450">Morning Strategy Plan</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">{msg.content}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-[10px]">
                      <div className="bg-black/25 p-3 rounded-lg border border-zinc-800/50">
                        <span className="block text-[8px] text-zinc-550 font-bold uppercase tracking-widest">Market Mood</span>
                        <span className="text-emerald-400 font-bold mt-1 block">Risk-On (Bullish)</span>
                      </div>
                      <div className="bg-black/25 p-3 rounded-lg border border-zinc-800/50">
                        <span className="block text-[8px] text-zinc-550 font-bold uppercase tracking-widest">Macro Event</span>
                        <span className="text-red-400 font-bold mt-1 block">NFP at 14:30</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`p-4 rounded-xl text-xs leading-relaxed shadow-md whitespace-pre-wrap ${
                    msg.role === "user" 
                      ? "bg-emerald-500 text-emerald-950 font-bold rounded-tr-none font-mono" 
                      : "bg-[#111118] border border-zinc-800/50 text-zinc-200 rounded-tl-none font-sans"
                  }`}>
                    {msg.content}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-black/15 border-t border-zinc-800/40">
          <div className="flex items-center gap-3 bg-[#111118] border border-zinc-800/60 rounded-lg p-2.5 px-4 shadow-inner">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask AI for analysis, risk checks, or portfolio stats..."
              className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder:text-zinc-650 font-mono"
            />
            <button 
              onClick={handleSend}
              className="p-2 bg-emerald-500 text-emerald-950 rounded-lg hover:bg-emerald-400 transition-colors font-bold"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
