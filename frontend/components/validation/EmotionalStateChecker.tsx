"use client";
import { useState } from "react";
import { Brain, Heart, Battery, Sun, Moon, CloudRain, Zap, AlertTriangle, CheckCircle2, Coffee, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StateRating {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: number;
  maxValue: number;
  idealRange: [number, number];
}

const mentalStates: StateRating[] = [
  { id: "focus", label: "Focus Level", icon: <Brain className="w-4 h-4" />, value: 0, maxValue: 10, idealRange: [7, 10] },
  { id: "calm", label: "Emotional Calm", icon: <Heart className="w-4 h-4" />, value: 0, maxValue: 10, idealRange: [6, 10] },
  { id: "energy", label: "Energy Level", icon: <Battery className="w-4 h-4" />, value: 0, maxValue: 10, idealRange: [5, 10] },
];

const physicalStates: StateRating[] = [
  { id: "sleep", label: "Sleep Quality (last night)", icon: <Moon className="w-4 h-4" />, value: 0, maxValue: 10, idealRange: [6, 10] },
  { id: "fatigue", label: "Physical Fatigue", icon: <Coffee className="w-4 h-4" />, value: 0, maxValue: 10, idealRange: [0, 4] },
  { id: "stress", label: "General Stress", icon: <CloudRain className="w-4 h-4" />, value: 0, maxValue: 10, idealRange: [0, 4] },
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
    if (inIdeal) return "var(--bull)";
    if (inverted) {
      return value > ideal[1] ? "var(--bear)" : "var(--accent)";
    }
    return value >= ideal[0] ? "var(--bull)" : "var(--bear)";
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
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span style={{ color: "var(--text-tertiary)" }}>{state.icon}</span>
          <span className="text-xs" style={{ color: "var(--text-primary)" }}>{state.label}</span>
        </div>
        <span 
          className="text-xs font-bold"
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
        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        style={{ 
          background: `linear-gradient(to right, var(--bull) ${(state.idealRange[0]/state.maxValue)*100}%, var(--accent) ${(state.idealRange[0]/state.maxValue)*100}%, var(--accent) ${(state.idealRange[1]/state.maxValue)*100}%, var(--bull) ${(state.idealRange[1]/state.maxValue)*100}%, var(--bear) 100%)`,
          backgroundColor: "var(--bg-input)"
        }}
      />
      <div className="flex justify-between text-[9px]" style={{ color: "var(--text-tertiary)" }}>
        <span>0</span>
        <span>Ideal: {state.idealRange[0]}-{state.idealRange[1]}</span>
        <span>{state.maxValue}</span>
      </div>
    </div>
  );

  return (
    <Card className="p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5" style={{ color: canTrade ? "var(--bull)" : "var(--bear)" }} />
          <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Emotional State Check</h3>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-2xl font-black" style={{ color: canTrade ? "var(--bull)" : "var(--bear)" }}>
            {overallScore.toFixed(1)}
          </span>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>/10</span>
        </div>
      </div>

      {!canTrade && overallScore > 0 && (
        <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--bear)" }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--bear)" }} />
          <div>
            <span className="text-xs font-semibold block" style={{ color: "var(--bear)" }}>Not recommended to trade</span>
            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              Your mental/physical state may impair judgment
            </span>
          </div>
        </div>
      )}

      {canTrade && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid var(--bull)" }}>
          <CheckCircle2 className="w-4 h-4" style={{ color: "var(--bull)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--bull)" }}>State is favorable for trading</span>
        </div>
      )}

      <div className="mb-4">
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>Mental State</div>
        {mental.map(s => renderSlider(s, "mental"))}
      </div>

      <div className="mb-4">
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>Physical State</div>
        {physical.map(s => renderSlider(s, "physical", true))}
      </div>

      <div className="mb-4">
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>Recent Events</div>
        <div className="grid grid-cols-2 gap-1">
          {events.map(event => (
            <button
              key={event.id}
              onClick={() => toggleEvent(event.id)}
              className={`text-[10px] px-2 py-1.5 rounded-lg text-left transition-colors ${
                event.checked ? "ring-1" : ""
              }`}
              style={{ 
                background: event.checked ? "rgba(239, 68, 68, 0.2)" : "var(--bg-input)",
                border: event.checked ? "1px solid var(--bear)" : "1px solid transparent",
                color: event.checked ? "var(--bear)" : "var(--text-tertiary)"
              }}
            >
              {event.checked && <Zap className="w-3 h-3 inline mr-1" />}
              {event.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
          Consecutive Losses
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRecentLosses(Math.max(0, recentLosses - 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--bg-input)", color: "var(--text-tertiary)" }}
          >
            <TrendingDown className="w-4 h-4" />
          </button>
          <div 
            className="flex-1 py-2 rounded-lg text-center font-bold"
            style={{ 
              background: recentLosses >= 3 ? "rgba(239, 68, 68, 0.2)" : "var(--bg-input)",
              color: recentLosses >= 3 ? "var(--bear)" : "var(--text-primary)"
            }}
          >
            <span className="text-lg">{recentLosses}</span>
            <span className="text-xs ml-1">losses in a row</span>
          </div>
          <button
            onClick={() => setRecentLosses(recentLosses + 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--bg-input)", color: "var(--text-tertiary)" }}
          >
            <TrendingUp className="w-4 h-4" />
          </button>
        </div>
        {recentLosses >= 3 && (
          <p className="text-[10px] mt-2" style={{ color: "var(--bear)" }}>
            After 3+ losses: Take a break before trading again
          </p>
        )}
      </div>
    </Card>
  );
}