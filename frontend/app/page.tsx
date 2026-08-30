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
    <div className="min-h-screen bg-bg-base text-text-primary selection:bg-accent/30 flex flex-col relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-accent-dim rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-info/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[1000px] h-[500px] bg-accent/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Grid Pattern overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
          backgroundSize: "64px 64px"
        }}
      />

      {/* Sticky Glassmorphism Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg-base/80 backdrop-blur-xl">
        <div className="w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg shadow-accent/20 transition-transform group-hover:scale-105">
              <TrendingUp className="w-5 h-5 text-bg-base" />
            </div>
            <span className="text-xl font-bold text-text-primary tracking-tight">Journex Pro</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">Features</a>
            <a href="#performance" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">Performance</a>
            <Link href="/pricing" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/auth?mode=login"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors hidden sm:block"
            >
              Sign In
            </Link>
            <Link
              href="/auth?mode=register"
              className="text-sm font-bold bg-text-primary text-bg-base px-6 py-2.5 rounded-full hover:opacity-90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)] flex items-center gap-2"
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
          <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bg-card border border-border text-sm font-medium text-text-secondary mb-8 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-bull animate-pulse shadow-[0_0_10px_var(--bull)]" />
            Live MT5 Terminal Engine Active
          </motion.div>

          <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-extrabold text-text-primary tracking-tighter leading-[1.1] mb-8">
            Institutional Infrastructure for <br className="hidden md:block" />
            <span className="text-accent">
              Professional Traders
            </span>
          </motion.h1>

          <motion.p variants={fadeIn} className="text-lg md:text-xl text-text-secondary max-w-2xl leading-relaxed mb-10 font-light">
            Deploy automated strategies, analyze real-time market sentiment, and backtest without limits using our multi-tenant AWS integration.
          </motion.p>

          <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center gap-5 w-full justify-center">
            <Link
              href="/auth?mode=register"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-accent text-bg-base font-bold text-lg hover:shadow-[0_0_30px_var(--accent-dim)] transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <span className="relative flex items-center gap-2">
                Start 7-Day Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-bg-card border border-border text-text-primary font-bold text-lg hover:bg-bg-elevated transition-all flex items-center justify-center gap-2"
            >
              View Documentation
            </Link>
          </motion.div>
        </motion.div>

        {/* Dashboard Preview Mockup (Visual Only) */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 w-full max-w-6xl relative rounded-t-2xl border-t border-x border-border bg-bg-card h-64 overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 left-0 right-0 h-10 border-b border-border bg-bg-elevated flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-bear/80" />
            <div className="w-3 h-3 rounded-full bg-warning/80" />
            <div className="w-3 h-3 rounded-full bg-bull/80" />
          </div>
          {/* Abstract UI representation */}
          <div className="pt-16 px-8 grid grid-cols-3 gap-6 h-full opacity-60">
            <div className="col-span-2 space-y-4">
              <div className="h-32 rounded-xl bg-accent-dim border border-border" />
            </div>
            <div className="space-y-4">
              <div className="h-16 rounded-xl bg-bg-elevated border border-border" />
              <div className="h-16 rounded-xl bg-bg-elevated border border-border" />
            </div>
          </div>
          {/* Gradient fade to hide bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg-base to-transparent" />
        </motion.div>
      </main>

      {/* Feature Grid */}
      <div id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-text-primary">Everything you need to scale.</h2>
          <p className="text-text-secondary max-w-2xl mx-auto text-lg">Journex isn't just a journal. It's a complete operating system for your trading business.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Activity,
              title: "Live MT5 Bridge",
              desc: "Zero-latency connection to your actual MT5 terminal. Monitor live equity, balance, and open trades directly from the web.",
              color: "text-info"
            },
            {
              icon: BarChart3,
              title: "Pro-Level Analytics",
              desc: "Advanced metrics, equity curves, win-rate mapping, and deep statistical analysis on all your historical trades.",
              color: "text-accent"
            },
            {
              icon: Globe,
              title: "AI Sentiment & News",
              desc: "Live fetching of global macroeconomic news. Instantly see bullish/bearish market sentiment before making a move.",
              color: "text-warning"
            },
            {
              icon: Monitor,
              title: "FXReplay Engine",
              desc: "Tick-by-tick backtesting engine. Fast-forward through history and test strategies exactly as if they were live markets.",
              color: "text-bull"
            },
            {
              icon: Crosshair,
              title: "Trading Simulators",
              desc: "Specialized Gold and flexible market simulators to build muscle memory without risking a single dime of real capital.",
              color: "text-bear"
            },
            {
              icon: Lock,
              title: "Multi-Tenant Auth",
              desc: "Enterprise-grade security and user partitioning, ensuring your algorithms and data are strictly isolated.",
              color: "text-neutral"
            }
          ].map((feature, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1 }}
              className="group p-8 rounded-3xl bg-bg-card border border-border hover:bg-bg-elevated transition-all duration-300 cursor-default"
            >
              <div className="w-14 h-14 rounded-2xl bg-bg-elevated border border-border flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-sm">
                <feature.icon className={`w-7 h-7 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-3 tracking-tight">{feature.title}</h3>
              <p className="text-text-secondary leading-relaxed text-sm font-light">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-24 text-center">
        <div className="p-12 rounded-3xl bg-bg-card border border-border relative overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-accent-dim blur-3xl opacity-50" />
          <h2 className="text-4xl font-bold text-text-primary mb-6 relative z-10">Ready to trade like a professional?</h2>
          <p className="text-text-secondary mb-10 max-w-xl mx-auto relative z-10">
            Join the elite traders who have stopped guessing and started treating their trading like a multi-million dollar business.
          </p>
          <Link
            href="/auth?mode=register"
            className="inline-flex relative z-10 px-8 py-4 rounded-full bg-accent text-bg-base font-bold text-lg hover:opacity-90 transition-all items-center justify-center gap-2 shadow-[0_0_30px_var(--accent-dim)]"
          >
            Create Your Free Account <Sparkles className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-12 text-center text-sm text-text-tertiary mt-auto bg-bg-base">
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
          <TrendingUp className="w-4 h-4" />
          <span className="font-bold">Journex Pro</span>
        </div>
        <p>&copy; {new Date().getFullYear()} Journex Analytics. All rights reserved.</p>
      </footer>
    </div>
  );
}

