"use client";
import { useState } from "react";
import { Brain, Heart, Battery, Sun, Moon, CloudRain, Zap, AlertTriangle, CheckCircle2, Coffee, Clock, TrendingUp, TrendingDown } from "lucide-react";

interface StateRating {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: number;
  maxValue: number;
  idealRange: [number, number];
}

const mentalStates: StateRating[] = [
  { id: "focus", label: "Focus Level", icon: <Brain className="w-3.5 h-3.5" />, value: 0, maxValue: 10, idealRange: [7, 10] },
  { id: "calm", label: "Emotional Calm", icon: <Heart className="w-3.5 h-3.5" />, value: 0, maxValue: 10, idealRange: [6, 10] },
  { id: "energy", label: "Energy Level", icon: <Battery className="w-3.5 h-3.5" />, value: 0, maxValue: 10, idealRange: [5, 10] },
];

const physicalStates: StateRating[] = [
  { id: "sleep", label: "Sleep Quality (last night)", icon: <Moon className="w-3.5 h-3.5" />, value: 0, maxValue: 10, idealRange: [6, 10] },
  { id: "fatigue", label: "Physical Fatigue", icon: <Coffee className="w-3.5 h-3.5" />, value: 0, maxValue: 10, idealRange: [0, 4] },
  { id: "stress", label: "General Stress", icon: <CloudRain className="w-3.5 h-3.5" />, value: 0, maxValue: 10, idealRange: [0, 4] },
];

const recentEvents = [
  { id: "1", label: "Just woke up", checked: false },
  { id: "2", label: "Just ate a meal", checked: false },
  { id: "3", label: "Had caffeine < 30min ago", checked: false },
  { id: "4", label: "Feeling rushed/pressured", checked: false },
  { id: "5", label: "Argued recently", checked: false },
  { id: "6", label: "Lost sleep over trades", checked: false },
];

export default function EmotionalStateChecker() {
  const [mental, setMental] = useState<StateRating[]>(mentalStates);
  const [physical, setPhysical] = useState<StateRating[]>(physicalStates);
  const [events, setEvents] = useState(recentEvents);
  const [recentLosses, setRecentLosses] = useState(0);

  const updateRating = (type: "mental" | "physical", id: string, value: number) => {
    if (type === "mental") {
      setMental(mental.map(s => s.id === id ? { ...s, value } : s));
    } else {
      setPhysical(physical.map(s => s.id === id ? { ...s, value } : s));
    }
  };

  const toggleEvent = (id: string) => {
    setEvents(events.map(e => e.id === id ? { ...e, checked: !e.checked } : e));
  };

  const getScoreColor = (value: number, ideal: [number, number], inverted = false) => {
    const inIdeal = value >= ideal[0] && value <= ideal[1];
    if (inIdeal) return "#10b981";
    if (inverted) {
      return value > ideal[1] ? "#ff5c73" : "#f59e0b";
    }
    return value >= ideal[0] ? "#10b981" : "#ff5c73";
  };

  const calculateOverall = () => {
    const allStates = [...mental, ...physical];
    let totalScore = 0;
    let factors = 0;
    
    allStates.forEach(s => {
      const inIdeal = s.value >= s.idealRange[0] && s.value <= s.idealRange[1];
      totalScore += inIdeal ? 10 : Math.max(0, 10 - Math.abs(s.value - (s.idealRange[0] + s.idealRange[1]) / 2) * 2);
      factors++;
    });

    const negativeEvents = events.filter(e => e.checked && (e.label.includes("pressured") || e.label.includes("Argued"))).length;
    totalScore -= negativeEvents * 3;

    if (recentLosses >= 2) totalScore -= 5;
    if (recentLosses >= 4) totalScore -= 10;

    return Math.max(0, Math.min(10, totalScore / factors * 10));
  };

  const overallScore = calculateOverall();
  const canTrade = overallScore >= 6;

  const renderSlider = (state: StateRating, type: "mental" | "physical", inverted = false) => (
    <div key={state.id} className="mb-3">
      <div className="flex items-center justify-between mb-1.5 font-sans">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-550">{state.icon}</span>
          <span className="text-xs text-zinc-350">{state.label}</span>
        </div>
        <span 
          className="text-xs font-bold font-mono"
          style={{ color: getScoreColor(state.value, state.idealRange, inverted) }}
        >
          {state.value}/{state.maxValue}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max={state.maxValue}
        value={state.value}
        onChange={(e) => updateRating(type, state.id, Number(e.target.value))}
        className="w-full appearance-none bg-black/25 border border-zinc-850 h-2 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#20e0b2] cursor-pointer"
      />
      <div className="flex justify-between text-[8px] text-zinc-555 mt-1">
        <span>0</span>
        <span>Ideal Range: {state.idealRange[0]}-{state.idealRange[1]}</span>
        <span>{state.maxValue}</span>
      </div>
    </div>
  );

  return (
    <div className="bg-[#101014] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 font-mono text-[10px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-emerald-450" />
          <h3 className="font-bold uppercase tracking-widest text-zinc-300">Emotional State Check</h3>
        </div>
        <div className="flex items-center gap-1 font-bold">
          <span className="text-xl font-black text-white">
            {overallScore.toFixed(1)}
          </span>
          <span className="text-xs text-zinc-500">/10</span>
        </div>
      </div>

      {!canTrade && overallScore > 0 && (
        <div className="mb-4 p-3 rounded-lg flex items-start gap-2 bg-[#ff5c73]/10 border border-[#ff5c73]/20 text-[#ff5c73]">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="font-sans">
            <span className="text-xs font-bold block">Not recommended to trade</span>
            <span className="text-[9px] text-zinc-550 block mt-0.5">
              Your mental/physical state may impair judgment
            </span>
          </div>
        </div>
      )}

      {canTrade && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2 bg-[#20e0b2]/10 border border-[#20e0b2]/20 text-[#20e0b2]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="font-bold uppercase tracking-wider text-[9px]">State is favorable for trading</span>
        </div>
      )}

      <div className="mb-4">
        <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Mental State</div>
        {mental.map(s => renderSlider(s, "mental"))}
      </div>

      <div className="mb-4">
        <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Physical State</div>
        {physical.map(s => renderSlider(s, "physical", true))}
      </div>

      <div className="mb-4">
        <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Recent Events</div>
        <div className="grid grid-cols-2 gap-2">
          {events.map(event => (
            <button
              key={event.id}
              onClick={() => toggleEvent(event.id)}
              className={`text-[9px] font-bold font-sans px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                event.checked ? "bg-[#ff5c73]/10 border border-[#ff5c73]/25 text-[#ff5c73]" : "bg-black/25 text-zinc-550 border border-zinc-850"
              }`}
            >
              {event.checked && <Zap className="w-3 h-3 inline mr-1 text-[#ff5c73]" />}
              {event.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-555 mb-2">
          Consecutive Losses
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRecentLosses(Math.max(0, recentLosses - 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/25 border border-[rgba(255,255,255,0.07)] text-zinc-500 hover:text-white cursor-pointer"
          >
            <TrendingDown className="w-4 h-4" />
          </button>
          <div 
            className={`flex-1 py-2 rounded-lg text-center font-bold font-mono text-[11px] border ${
              recentLosses >= 3 ? "bg-[#ff5c73]/10 border-[#ff5c73]/20 text-[#ff5c73]" : "bg-black/25 border-zinc-850 text-white"
            }`}
          >
            <span className="text-sm font-black">{recentLosses}</span>
            <span className="text-[10px] text-zinc-555 ml-1">losses in a row</span>
          </div>
          <button
            onClick={() => setRecentLosses(recentLosses + 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/25 border border-[rgba(255,255,255,0.07)] text-zinc-500 hover:text-white cursor-pointer"
          >
            <TrendingUp className="w-4 h-4" />
          </button>
        </div>
        {recentLosses >= 3 && (
          <p className="text-[9px] mt-2 font-mono text-red-405 font-bold uppercase tracking-wide flex items-center gap-1">
             <AlertTriangle className="w-3.5 h-3.5" /> Mandated Cool Down Active
          </p>
        )}
      </div>
    </div>
  );
}

