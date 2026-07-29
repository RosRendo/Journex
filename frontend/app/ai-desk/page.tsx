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
    <div className="flex h-[calc(100vh-80px)] max-w-[1600px] mx-auto gap-6 animate-fade-in">
      
      {/* ── LEFT: QUICK QUERIES ── */}
      <div className="hidden lg:flex w-[280px] flex-col gap-2 p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800/50 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-4 px-2">
          <Cpu className="w-5 h-5 text-emerald-400" />
          <h2 className="font-display font-bold text-lg text-emerald-400 tracking-wide">AI DESK</h2>
        </div>
        
        {QuickPills.map(pill => (
          <button 
            key={pill}
            onClick={() => setInput(`Show me ${pill}`)}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all text-left group"
          >
            <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200">{pill}</span>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400" />
          </button>
        ))}
        
        <div className="mt-auto p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Live AI Watcher</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            AI is currently monitoring <strong className="text-zinc-200">XAUUSD</strong> for a breakout above 2345.00.
          </p>
        </div>
      </div>

      {/* ── RIGHT: CHAT INTERFACE ── */}
      <div className="flex-1 flex flex-col bg-zinc-950/50 border border-zinc-800/50 rounded-2xl overflow-hidden backdrop-blur-md relative">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-thin">
          {messages.map(msg => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "user" ? "bg-zinc-800" : "bg-emerald-500/20 text-emerald-400"
              }`}>
                {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
              </div>
              
              <div className={`max-w-[80%] ${msg.role === "user" ? "text-right" : "text-left"}`}>
                {msg.type === "report" ? (
                  <div className="bg-zinc-900/80 border border-emerald-500/30 p-5 rounded-2xl shadow-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Morning Report</span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">{msg.content}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="bg-black/50 p-3 rounded-lg border border-zinc-800">
                        <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Market Mood</span>
                        <span className="text-sm font-bold text-emerald-400 mt-1 block">Risk-On (Bullish)</span>
                      </div>
                      <div className="bg-black/50 p-3 rounded-lg border border-zinc-800">
                        <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Macro Event</span>
                        <span className="text-sm font-bold text-red-400 mt-1 block">NFP at 14:30</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                    msg.role === "user" 
                      ? "bg-emerald-600 text-white rounded-tr-sm" 
                      : "bg-zinc-900/80 border border-zinc-800/80 text-zinc-200 rounded-tl-sm"
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
        <div className="p-4 bg-zinc-950 border-t border-zinc-800/80">
          <div className="flex items-center gap-3 bg-zinc-900/80 border border-zinc-700/50 rounded-xl p-2 px-4 shadow-inner">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask AI for analysis, risk checks, or portfolio stats..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-200 placeholder:text-zinc-600"
            />
            <button 
              onClick={handleSend}
              className="p-2 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
