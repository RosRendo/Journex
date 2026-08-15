"use client";

import Link from "next/link";
import { motion, Variants } from "framer-motion";
import {
  ArrowRight,
  Activity,
  Shield,
  BarChart3,
  Globe,
  Lock,
  Monitor,
  Crosshair,
  TrendingUp,
  ChevronRight,
  Sparkles,
} from "lucide-react";

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030305] text-foreground selection:bg-violet-500/30 flex flex-col relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-violet-600/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Grid Pattern overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
          backgroundSize: "64px 64px"
        }}
      />

      {/* Sticky Glassmorphism Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 transition-transform group-hover:scale-105">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Journex Pro</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#performance" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Performance</a>
            <Link href="/pricing" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/auth?mode=login"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors hidden sm:block"
            >
              Sign In
            </Link>
            <Link
              href="/auth?mode=register"
              className="text-sm font-bold bg-white text-black px-6 py-2.5 rounded-full hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_25px_rgba(255,255,255,0.25)] flex items-center gap-2"
            >
              Get Started <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 mt-32 md:mt-40 max-w-5xl mx-auto text-center min-h-[70vh]">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="flex flex-col items-center"
        >
          <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 text-sm font-medium text-gray-300 mb-8 backdrop-blur-md shadow-inner">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
            Real-time MT5 Terminal Integration Live
          </motion.div>

          <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-gray-500 tracking-tighter leading-[1.1] mb-8">
            The Unfair Advantage for <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Professional Forex Traders
            </span>
          </motion.h1>

          <motion.p variants={fadeIn} className="text-lg md:text-xl text-gray-400 max-w-2xl leading-relaxed mb-10 font-light">
            An institutional-grade dashboard that unites live MetaTrader 5 execution, real-time AI sentiment analysis, unlimited backtesting, and profound journaling.
          </motion.p>

          <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center gap-5 w-full justify-center">
            <Link
              href="/auth?mode=register"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-lg hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative flex items-center gap-2">
                Start 7-Day Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/[0.05] border border-white/10 text-white font-bold text-lg hover:bg-white/[0.1] transition-all flex items-center justify-center gap-2 backdrop-blur-md"
            >
              Dashboard Preview
            </Link>
          </motion.div>
        </motion.div>

        {/* Dashboard Preview Mockup (Visual Only) */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 w-full max-w-6xl relative rounded-t-2xl border-t border-x border-white/10 bg-white/[0.02] backdrop-blur-xl h-64 overflow-hidden shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
        >
          <div className="absolute top-0 left-0 right-0 h-10 border-b border-white/5 bg-black/20 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          {/* Abstract UI representation */}
          <div className="pt-16 px-8 grid grid-cols-3 gap-6 h-full opacity-50">
            <div className="col-span-2 space-y-4">
              <div className="h-32 rounded-xl bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-white/5" />
            </div>
            <div className="space-y-4">
              <div className="h-16 rounded-xl bg-white/5 border border-white/5" />
              <div className="h-16 rounded-xl bg-white/5 border border-white/5" />
            </div>
          </div>
          {/* Gradient fade to hide bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#030305] to-transparent" />
        </motion.div>
      </main>

      {/* Feature Grid */}
      <div id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">Everything you need to scale.</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">Journex isn't just a journal. It's a complete operating system for your trading business.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Activity,
              title: "Live MT5 Bridge",
              desc: "Zero-latency connection to your actual MT5 terminal. Monitor live equity, balance, and open trades directly from the web.",
              color: "from-blue-500 to-cyan-400",
              bg: "bg-blue-500/10",
              border: "group-hover:border-blue-500/50"
            },
            {
              icon: BarChart3,
              title: "Pro-Level Analytics",
              desc: "Advanced metrics, equity curves, win-rate mapping, and deep statistical analysis on all your historical trades.",
              color: "from-violet-500 to-purple-400",
              bg: "bg-violet-500/10",
              border: "group-hover:border-violet-500/50"
            },
            {
              icon: Globe,
              title: "AI Sentiment & News",
              desc: "Live fetching of global macroeconomic news. Instantly see bullish/bearish market sentiment before making a move.",
              color: "from-orange-500 to-red-400",
              bg: "bg-orange-500/10",
              border: "group-hover:border-orange-500/50"
            },
            {
              icon: Monitor,
              title: "FXReplay Engine",
              desc: "Tick-by-tick backtesting engine. Fast-forward through history and test strategies exactly as if they were live markets.",
              color: "from-emerald-500 to-teal-400",
              bg: "bg-emerald-500/10",
              border: "group-hover:border-emerald-500/50"
            },
            {
              icon: Crosshair,
              title: "Trading Simulators",
              desc: "Specialized Gold and flexible market simulators to build muscle memory without risking a single dime of real capital.",
              color: "from-pink-500 to-rose-400",
              bg: "bg-pink-500/10",
              border: "group-hover:border-pink-500/50"
            },
            {
              icon: Lock,
              title: "Webhook Trade Copier",
              desc: "Automate your execution. Send signals from TradingView or Discord straight into your MT5 account instantly.",
              color: "from-indigo-500 to-blue-400",
              bg: "bg-indigo-500/10",
              border: "group-hover:border-indigo-500/50"
            }
          ].map((feature, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1 }}
              className={`group p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all duration-300 cursor-default ${feature.border}`}
            >
              <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                <feature.icon className={`w-7 h-7 bg-gradient-to-br ${feature.color} bg-clip-text text-transparent`} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed text-sm font-light">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-24 text-center">
        <div className="p-12 rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-violet-600/10 blur-3xl" />
          <h2 className="text-4xl font-bold text-white mb-6 relative z-10">Ready to trade like a professional?</h2>
          <p className="text-gray-400 mb-10 max-w-xl mx-auto relative z-10">
            Join the elite traders who have stopped guessing and started treating their trading like a multi-million dollar business.
          </p>
          <Link
            href="/auth?mode=register"
            className="inline-flex relative z-10 px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-gray-200 transition-all items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            Create Your Free Account <Sparkles className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 text-center text-sm text-gray-500 mt-auto bg-black/40 backdrop-blur-md">
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
          <TrendingUp className="w-4 h-4" />
          <span className="font-bold">Journex Pro</span>
        </div>
        <p>&copy; {new Date().getFullYear()} Journex Analytics. All rights reserved.</p>
      </footer>
    </div>
  );
}
