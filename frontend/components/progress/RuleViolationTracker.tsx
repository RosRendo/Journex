"use client";
import { useState } from "react";
import { Ban, AlertTriangle, TrendingDown, TrendingUp, Calendar, Clock, X, CheckCircle2, Info, Filter, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface RuleViolation {
  id: string;
  ruleName: string;
  category: string;
  severity: "warning" | "major" | "critical";
  tradeId: string;
  date: string;
  description: string;
  consequence: string;
  resolved: boolean;
  repeat: boolean;
}

interface CustomRule {
  id: string;
  name: string;
  enabled: boolean;
}

const mockViolations: RuleViolation[] = [
  { id: "1", ruleName: "News Trading", category: "Timing", severity: "warning", tradeId: "T012", date: "2026-04-20", description: "Traded 15 min before NFP news", consequence: "Stop trading during high impact news", resolved: false, repeat: false },
  { id: "2", ruleName: "Max Daily Loss", category: "Risk", severity: "critical", tradeId: "T010", date: "2026-04-19", description: "Exceeded 4% daily loss limit", consequence: "Mandatory 24h break", resolved: true, repeat: false },
  { id: "3", ruleName: "Revenge Trading", category: "Emotional", severity: "major", tradeId: "T008", date: "2026-04-18", description: "Took trade to recover from loss", consequence: "Review emotional triggers", resolved: false, repeat: true },
  { id: "4", ruleName: "No Stop Loss", category: "Risk", severity: "critical", tradeId: "T006", date: "2026-04-15", description: "Entered without setting stop loss", consequence: "Review execution process", resolved: true, repeat: false },
  { id: "5", ruleName: "Asian Session Trading", category: "Timing", severity: "warning", tradeId: "T004", date: "2026-04-14", description: "Traded during Asian session (not allowed)", consequence: "Stick to London/NY sessions", resolved: true, repeat: false },
];

const ruleCategories = [
  "Risk Management",
  "Trade Execution", 
  "Emotional Control",
  "Timing & Sessions",
  "Strategy Rules"
];

const defaultCustomRules: CustomRule[] = [
  { id: "1", name: "No trading within 30min of news", enabled: true },
  { id: "2", name: "Max 3 trades per session", enabled: true },
  { id: "3", name: "Take break after 2 consecutive losses", enabled: true },
  { id: "4", name: "No trading on Fridays", enabled: false },
  { id: "5", name: "Always use fixed lot size", enabled: true },
];

export default function RuleViolationTracker() {
  const [violations, setViolations] = useState<RuleViolation[]>(mockViolations);
  const [customRules, setCustomRules] = useState<CustomRule[]>(defaultCustomRules);
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("all");
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);

  const toggleRule = (id: string) => {
    setCustomRules(customRules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const resolveViolation = (id: string) => {
    setViolations(violations.map(v => v.id === id ? { ...v, resolved: !v.resolved } : v));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "var(--bear)";
      case "major": return "#f97316";
      case "warning": return "var(--accent)";
      default: return "var(--text-tertiary)";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <Ban className="w-4 h-4" />;
      case "major": return <AlertTriangle className="w-4 h-4" />;
      case "warning": return <Info className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const filteredViolations = violations.filter(v => {
    if (filter === "unresolved") return !v.resolved;
    if (filter === "resolved") return v.resolved;
    return true;
  }).filter(v => !severityFilter || v.severity === severityFilter);

  const stats = {
    total: violations.length,
    unresolved: violations.filter(v => !v.resolved).length,
    critical: violations.filter(v => v.severity === "critical" && !v.resolved).length,
    repeats: violations.filter(v => v.repeat).length,
  };

  return (
    <Card className="p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Ban className="w-5 h-5" style={{ color: stats.critical > 0 ? "var(--bear)" : "var(--accent)" }} />
          <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Rule Violation Tracker</h3>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="p-2 rounded-lg text-center" style={{ background: "var(--bg-input)" }}>
          <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{stats.total}</div>
          <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Total</div>
        </div>
        <div className="p-2 rounded-lg text-center" style={{ background: "var(--bg-input)" }}>
          <div className="text-lg font-bold" style={{ color: "#f97316" }}>{stats.unresolved}</div>
          <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Open</div>
        </div>
        <div className="p-2 rounded-lg text-center" style={{ background: "var(--bg-input)" }}>
          <div className="text-lg font-bold" style={{ color: "var(--bear)" }}>{stats.critical}</div>
          <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Critical</div>
        </div>
        <div className="p-2 rounded-lg text-center" style={{ background: "var(--bg-input)" }}>
          <div className="text-lg font-bold" style={{ color: "var(--bear)" }}>{stats.repeats}</div>
          <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Repeats</div>
        </div>
      </div>

      <div className="flex gap-1 mb-3">
        {(["all", "unresolved", "resolved"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="flex-1 py-1 text-[10px] rounded-lg capitalize"
            style={{ 
              background: filter === f ? "var(--accent)" : "var(--bg-input)",
              color: filter === f ? "white" : "var(--text-tertiary)"
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {["warning", "major", "critical"].map(severity => (
          <button
            key={severity}
            onClick={() => setSeverityFilter(severityFilter === severity ? null : severity)}
            className={`text-[10px] px-2 py-1 rounded-full capitalize transition-colors ${
              severityFilter === severity ? "ring-1" : ""
            }`}
            style={{ 
              background: severityFilter === severity ? getSeverityColor(severity) : "var(--bg-input)",
              color: severityFilter === severity ? "white" : "var(--text-tertiary)"
            }}
          >
            {severity}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
        {filteredViolations.map(violation => (
          <div
            key={violation.id}
            className={`p-3 rounded-lg ${violation.resolved ? "opacity-60" : ""}`}
            style={{ 
              background: "var(--bg-input)", 
              borderLeft: `3px solid ${getSeverityColor(violation.severity)}`
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span style={{ color: getSeverityColor(violation.severity) }}>
                  {getSeverityIcon(violation.severity)}
                </span>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                      {violation.ruleName}
                    </span>
                    {violation.repeat && (
                      <span className="text-[10px] px-1 rounded" style={{ background: "rgba(239,68,68,0.2)", color: "var(--bear)" }}>
                        REPEAT
                      </span>
                    )}
                  </div>
                  <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    {violation.tradeId} • {violation.date}
                  </span>
                </div>
              </div>
              <button
                onClick={() => resolveViolation(violation.id)}
                className="text-[10px]"
                style={{ color: violation.resolved ? "var(--bull)" : "var(--text-tertiary)" }}
              >
                {violation.resolved ? "Resolved" : "Mark resolved"}
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--text-tertiary)" }}>
              {violation.description}
            </p>
            <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <span className="text-[10px]" style={{ color: "var(--accent)" }}>
                Action: {violation.consequence}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
          Active Rules to Follow
        </div>
        <div className="space-y-1">
          {customRules.filter(r => r.enabled).map(rule => (
            <div
              key={rule.id}
              className="flex items-center gap-2 p-2 rounded-lg"
              style={{ background: "var(--bg-input)" }}
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "var(--bull)" }} />
              <span className="text-xs" style={{ color: "var(--text-primary)" }}>{rule.name}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}