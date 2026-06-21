import Link from "next/link";
import { ArrowRight, Activity, Shield, Zap, TrendingUp, BarChart3, Globe, Lock, Monitor, Crosshair, ChevronRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#05050a] text-foreground selection:bg-primary/30 flex flex-col relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Journex Pro</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/auth?mode=login"
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/auth?mode=register"
            className="text-sm font-medium bg-white text-black px-5 py-2.5 rounded-full hover:bg-gray-100 transition-all shadow-lg hover:shadow-white/20"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 mt-16 md:mt-24 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-gray-300 mb-8 backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Real-time MT5 Terminal Integration Live
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-gray-500 tracking-tight leading-[1.1] mb-8">
          The Unfair Advantage for <br className="hidden md:block" />
          <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            Professional Forex Traders
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-3xl leading-relaxed mb-12">
          An institutional-grade dashboard that unites live MetaTrader 5 execution, real-time AI sentiment analysis, unlimited backtesting, and profound journaling. Stop guessing, start executing.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <Link
            href="/auth?mode=register"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-lg hover:shadow-[0_0_40px_rgba(139,92,246,0.4)] transition-all flex items-center justify-center gap-2 group"
          >
            Start Your 7-Day Free Trial
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2"
          >
            Go To Dashboard
          </Link>
        </div>
      </main>

      {/* Feature Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {[
          {
            icon: Activity,
            title: "Live MT5 Bridge",
            desc: "Zero-latency connection to your actual MT5 terminal. Monitor live equity, balance, and open trades directly from the web.",
            color: "from-blue-500 to-cyan-400",
            bg: "bg-blue-500/10"
          },
          {
            icon: BarChart3,
            title: "Pro-Level Analytics",
            desc: "Advanced metrics, equity curves, win-rate mapping, and deep statistical analysis on all your historical trades.",
            color: "from-violet-500 to-purple-400",
            bg: "bg-violet-500/10"
          },
          {
            icon: Globe,
            title: "AI Sentiment & News",
            desc: "Live fetching of global macroeconomic news. Instantly see bullish/bearish market sentiment before making a move.",
            color: "from-orange-500 to-red-400",
            bg: "bg-orange-500/10"
          },
          {
            icon: Monitor,
            title: "FXReplay Engine",
            desc: "Tick-by-tick backtesting engine. Fast-forward through history and test strategies exactly as if they were live markets.",
            color: "from-emerald-500 to-teal-400",
            bg: "bg-emerald-500/10"
          },
          {
            icon: Crosshair,
            title: "Trading Simulators",
            desc: "Specialized Gold and flexible market simulators to build muscle memory without risking a single dime of real capital.",
            color: "from-pink-500 to-rose-400",
            bg: "bg-pink-500/10"
          },
          {
            icon: Lock,
            title: "Webhook Trade Copier",
            desc: "Automate your execution. Send signals from TradingView or Discord straight into your MT5 account instantly.",
            color: "from-indigo-500 to-blue-400",
            bg: "bg-indigo-500/10"
          }
        ].map((feature, i) => (
          <div key={i} className="group p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all">
            <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6`}>
              <feature.icon className={`w-7 h-7 bg-gradient-to-br ${feature.color} bg-clip-text text-transparent`} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
            <p className="text-gray-400 leading-relaxed text-sm">
              {feature.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 text-center text-sm text-gray-500 mt-auto">
        <div className="flex items-center justify-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4" />
          <span className="font-bold">Journex Pro</span>
        </div>
        <p>&copy; {new Date().getFullYear()} Journex Analytics. All rights reserved.</p>
      </footer>
    </div>
  );
}
