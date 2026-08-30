"use client";
import { NotebookPen, Target, AlertTriangle, TrendingUp, Star, GitCompare, Calendar, BarChart3 } from "lucide-react";
import TradeQualityRater from "@/components/review/TradeQualityRater";
import MistakeLogger from "@/components/review/MistakeLogger";
import DeviationReporter from "@/components/review/DeviationReporter";

export default function ReviewPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
            Review Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Trade quality ratings, mistake logging, and deviation analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/review/daily"
            className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
          >
            <Calendar className="w-3 h-3 inline mr-1" />
            Daily Review
          </a>
          <a
            href="/review/weekly"
            className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
          >
            <BarChart3 className="w-3 h-3 inline mr-1" />
            Weekly Review
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TradeQualityRater />
        <MistakeLogger />
      </div>

      <div className="grid grid-colss-1">
        <DeviationReporter />
      </div>
    </div>
  );
}

