"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Clock, Loader2, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getBackendUrl, fetchWithAuth } from "@/lib/utils";

export function NewsCountdownWidget() {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [eventName, setEventName] = useState<string>("Loading next event...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchNews = async () => {
    try {
      const res = await fetchWithAuth(`${getBackendUrl()}/api/bridge/api/news/next-high-impact`);
      const json = await res.json();
      if (json.success) {
        setEventName(json.event);
        setTimeLeft(Math.floor(json.time_left_seconds));
        setError(false);
      } else {
        setError(true);
        setEventName("No upcoming red-folder events");
      }
    } catch (e) {
      console.error("News fetch error:", e);
      setError(true);
      setEventName("Error loading calendar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const hours = timeLeft !== null ? Math.floor(timeLeft / 3600) : 0;
  const minutes = timeLeft !== null ? Math.floor((timeLeft % 3600) / 60) : 0;
  const seconds = timeLeft !== null ? (timeLeft % 60) : 0;
  
  const isUrgent = timeLeft !== null && timeLeft > 0 && timeLeft < 3600; // less than 1 hr

  return (
    <div className="rounded-3xl p-6 relative overflow-hidden backdrop-blur-xl shadow-2xl h-full border transition-all duration-1000 group" 
         style={{ 
           background: "var(--bg-card)", 
           borderColor: isUrgent ? "rgba(255, 77, 106, 0.4)" : "var(--border)",
           boxShadow: isUrgent ? "0 0 30px rgba(255, 77, 106, 0.15)" : "none"
         }}>
      
      {/* Background ambient glow */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none transition-colors duration-1000" 
           style={{ background: isUrgent ? "var(--bear)" : "var(--accent)" }} />
           
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border-strong)" }}>
          <span className="text-[12px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Calendar size={16} style={{ color: isUrgent ? "var(--bear)" : "var(--accent)" }}/> 
            High Impact News
          </span>
          {isUrgent && (
            <motion.span 
              animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }}
              className="text-[10px] font-bold px-2 py-1 rounded uppercase" style={{ background: "rgba(255, 77, 106, 0.1)", color: "var(--bear)" }}
            >
              Imminent
            </motion.span>
          )}
        </div>

        <div className="flex flex-col items-center justify-center flex-1 py-4">
          <div className="text-[13px] font-bold text-center px-4 line-clamp-2 mb-6" style={{ color: "var(--text-secondary)" }}>
            {eventName}
          </div>
          
          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--text-tertiary)" }} />
          ) : error || timeLeft === null || timeLeft <= 0 ? (
            <div className="font-mono text-2xl font-bold" style={{ color: "var(--text-tertiary)" }}>--:--:--</div>
          ) : (
            <div className="flex items-center gap-3 md:gap-5 font-mono">
               <TimeBox value={hours} label="HRS" isUrgent={isUrgent} />
               <span className="text-2xl font-bold pb-4" style={{ color: isUrgent ? "rgba(255,77,106,0.3)" : "rgba(255,255,255,0.1)" }}>:</span>
               <TimeBox value={minutes} label="MIN" isUrgent={isUrgent} />
               <span className="text-2xl font-bold pb-4" style={{ color: isUrgent ? "rgba(255,77,106,0.3)" : "rgba(255,255,255,0.1)" }}>:</span>
               <TimeBox value={seconds} label="SEC" isUrgent={isUrgent} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TimeBox({ value, label, isUrgent }: { value: number, label: string, isUrgent: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg flex items-center justify-center shadow-inner relative overflow-hidden" 
           style={{ background: "var(--bg-elevated)", border: `1px solid ${isUrgent ? 'rgba(255,77,106,0.2)' : 'var(--border)'}` }}>
        <span className="text-3xl md:text-4xl font-black relative z-10" style={{ color: isUrgent ? "var(--bear)" : "var(--text-primary)" }}>
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] uppercase font-bold tracking-widest mt-3" style={{ color: "var(--text-tertiary)" }}>{label}</span>
    </div>
  );
}

