"use client";
import { useState } from "react";
import { Calendar, Target, TrendingUp, TrendingDown, Brain, AlertTriangle, CheckCircle2, Save, X, ArrowLeft, ArrowRight, Clock, Activity, DollarSign } from "lucide-react";

const dailyQuestions = {
  "Win Rate": { value: 62, target: 55, unit: "%" },
  "Risk/Reward": { value: 1.8, target: 2.0, unit: ":1" },
  "Trades": { value: 4, target: 5, unit: "" },
  "Profit": { value: 2.1, target: 2, unit: "%" },
};

const reviewQuestions = [
  { id: "1", category: "Preparation", question: "Did you review the session's setup before trading?", answer: null },
  { id: "2", category: "Preparation", question: "Were key S/R levels marked on your chart?", answer: null },
  { id: "3", category: "Preparation", question: "Did you check the economic calendar for news?", answer: null },
  { id: "4", category: "Execution", question: "Did you wait for confirmed entry signals?", answer: null },
  { id: "5", category: "Execution", question: "Was a stop loss set before every entry?", answer: null },
  { id: "6", category: "Execution", question: "Did you follow your position sizing rules?", answer: null },
  { id: "7", category: "Emotional", question: "Did you avoid trading after a loss?", answer: null },
  { id: "8", category: "Emotional", question: "Were you emotionally calm during trading?", answer: null },
  { id: "9", category: "Review", question: "Did you journal all trades?", answer: null },
  { id: "10", category: "Review", question: "Did you review your losing trades?", answer: null },
];

const mistakes = [
  { id: "1", label: "Overtrading", count: 2 },
  { id: "2", label: "Early Exit", count: 1 },
  { id: "3", label: "FOMO Entry", count: 0 },
];

export default function DailyReviewPage() {
  const [selectedDate, setSelectedDate] = useState("2026-04-20");
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [notes, setNotes] = useState("Good trading day. Stuck to plan for most trades. Need to work on patience for entries.");
  const [tomorrowGoal, setTomorrowGoal] = useState("Focus on waiting for A+ setups only");

  const toggleAnswer = (id: string) => {
    setAnswers(prev => {
      const current = prev[id];
      if (current === true) return { ...prev, [id]: false };
      if (current === false) return { ...prev, [id]: null };
      return { ...prev, [id]: true };
    });
  };

  const answeredQuestions = Object.values(answers).filter(a => a !== null).length;
  const totalQuestions = reviewQuestions.length;
  const completionPct = (answeredQuestions / totalQuestions) * 100;

  const categories = [...new Set(reviewQuestions.map(q => q.category))];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
            Daily Review
          </h1>
          <p className="text-muted-foreground mt-1">
            Reflect on today's trading performance and identify areas for improvement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">{selectedDate}</span>
          </div>
          <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(dailyQuestions).map(([key, data]) => (
          <div key={key} className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{key}</span>
              {data.value >= data.target ? (
                <TrendingUp className="w-4 h-4 text-[#20e0b2]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-[#ff5c73]" />
              )}
            </div>
            <div className="text-2xl font-bold">
              {data.value}
              <span className="text-sm font-normal text-muted-foreground ml-1">{data.unit}</span>
            </div>
            <div className="text-xs text-muted-foreground">Target: {data.target}{data.unit}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Self-Assessment</h2>
          
          {categories.map(category => (
            <div key={category} className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{category}</div>
              {reviewQuestions.filter(q => q.category === category).map(q => (
                <button
                  key={q.id}
                  onClick={() => toggleAnswer(q.id)}
                  className={`w-full p-3 rounded-lg text-left flex items-center justify-between transition-all ${
                    answers[q.id] === true ? "bg-[rgba(32,224,178,0.08)] border-green-500/30" :
                    answers[q.id] === false ? "bg-[rgba(255,92,115,0.08)] border-[rgba(255,92,115,0.2)]" :
                    "bg-card border border-border/50 hover:border-primary/30"
                  }`}
                >
                  <span className="text-sm">{q.question}</span>
                  <div className="flex items-center gap-2">
                    {answers[q.id] === true && <CheckCircle2 className="w-5 h-5 text-[#20e0b2]" />}
                    {answers[q.id] === false && <X className="w-5 h-5 text-[#ff5c73]" />}
                    {answers[q.id] === null && <span className="text-xs text-muted-foreground">Tap to answer</span>}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold mb-2">Today's Mistakes</h2>
            <div className="space-y-2">
              {mistakes.map(mistake => (
                <div key={mistake.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50">
                  <span className="text-sm">{mistake.label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
                      onClick={() => {}}
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-bold">{mistake.count}</span>
                    <button
                      className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80"
                      onClick={() => {}}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-2">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-32 p-3 rounded-lg bg-card border border-border/50 resize-none text-sm"
              placeholder="What went well today? What could be improved?"
            />
          </div>

          <div>
            <h2 className="text-lg font-bold mb-2">Tomorrow's Goal</h2>
            <input
              type="text"
              value={tomorrowGoal}
              onChange={(e) => setTomorrowGoal(e.target.value)}
              className="w-full p-3 rounded-lg bg-card border border-border/50 text-sm"
              placeholder="One focused goal for tomorrow..."
            />
          </div>

          <button className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            Save Review
          </button>
        </div>
      </div>
    </div>
  );
}

