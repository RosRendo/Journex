"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Mail, Lock, User, Eye, EyeOff,
  ArrowRight, Shield, Zap, Globe, Github
} from "lucide-react";

/* ── Google brand SVG icon ───────────────────────────────── */
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res: any = await signIn("credentials", {
      email, password, name, isRegister: mode === "register", redirect: false,
    });
    setLoading(false);
    if (!res?.error) {
      router.push("/dashboard");
    } else {
      setError("Invalid credentials. Please try again.");
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  const handleGithub = async () => {
    setLoading(true);
    await signIn("github", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-[#030305] flex selection:bg-violet-500/30 font-sans">
      {/* ── Left hero panel (hidden on mobile) ──────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-black relative flex-col justify-between p-12 overflow-hidden border-r border-white/5">
        {/* Animated Ambient glows */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[150px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[150px]" 
        />

        {/* Grid Pattern overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255, 255, 255, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 1) 1px, transparent 1px)`,
            backgroundSize: "64px 64px"
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.3)]">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">Journex Pro</span>
        </div>

        {/* Central content */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 space-y-8"
        >
          <h2 className="text-5xl font-extrabold text-white leading-[1.1] tracking-tighter">
            Elevate your<br />
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Trading Execution
            </span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed max-w-md font-light">
            Connect your MetaTrader 5, analyze live market sentiment, and backtest without limits using our institutional-grade infrastructure.
          </p>
          <div className="space-y-4">
            {[
              { Icon: Zap, text: "Zero-latency live MT5 bridge" },
              { Icon: Globe, text: "Real-time macroeconomic AI sentiment" },
              { Icon: Shield, text: "Advanced risk modeling & dynamic scaling" },
            ].map(({ Icon, text }, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                key={text} 
                className="flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0 shadow-inner">
                  <Icon className="w-5 h-5 text-violet-400" />
                </div>
                <span className="text-sm font-medium text-gray-300">{text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quote */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="relative z-10 border border-white/10 bg-white/[0.02] backdrop-blur-md rounded-2xl p-6"
        >
          <p className="text-gray-400 text-sm italic leading-relaxed mb-3">
            "The goal of a successful trader is to make the best trades. Money is secondary."
          </p>
          <p className="text-gray-500 text-xs font-semibold tracking-wider uppercase">— Alexander Elder</p>
        </motion.div>
      </div>

      {/* ── Right form panel ─────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none lg:hidden">
           <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] bg-violet-600/20 rounded-full blur-[100px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md relative z-10 bg-white/[0.02] lg:bg-transparent border lg:border-none border-white/5 p-8 lg:p-0 rounded-3xl backdrop-blur-xl lg:backdrop-blur-none"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Journex Pro</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-sm text-gray-400">
              {mode === "login" ? "Enter your credentials to access your terminal" : "Start your professional trading journey today"}
            </p>
          </div>

          {/* Social Auth */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-11 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all text-sm font-medium text-white disabled:opacity-50"
            >
              <GoogleIcon />
              Google
            </button>
            <button
              onClick={handleGithub}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-11 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all text-sm font-medium text-white disabled:opacity-50"
            >
              <Github className="w-5 h-5" />
              GitHub
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">or continue with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Tab toggle */}
          <div className="flex p-1 bg-white/[0.03] border border-white/5 rounded-xl mb-6 relative">
            <motion.div
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-lg shadow-sm"
              animate={{ left: mode === "login" ? 4 : "50%" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
            {(["login", "register"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors capitalize relative z-10
                  ${mode === m ? "text-white" : "text-gray-400 hover:text-white"}`}>
                {m}
              </button>
            ))}
          </div>

          <form onSubmit={handleCredentials} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="text-xs text-gray-400 mb-1.5 block font-medium ml-1">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-violet-400 transition-colors" />
                    <input value={name} onChange={e => setName(e.target.value)}
                      placeholder="John Doe" required
                      className="w-full h-12 pl-10 pr-4 rounded-xl border border-white/10 bg-white/[0.02] text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all placeholder:text-gray-600" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-xs text-gray-400 mb-1.5 block font-medium ml-1">Email address</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-violet-400 transition-colors" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="trader@example.com" required
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-white/10 bg-white/[0.02] text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all placeholder:text-gray-600" />
              </div>
            </div>
            
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block font-medium ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-violet-400 transition-colors" />
                <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required minLength={6}
                  className="w-full h-12 pl-10 pr-11 rounded-xl border border-white/10 bg-white/[0.02] text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all placeholder:text-gray-600" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 font-medium"
              >
                {error}
              </motion.div>
            )}

            {mode === "login" && (
              <div className="flex justify-end pt-1">
                <button type="button" className="text-xs text-gray-400 hover:text-violet-400 transition-colors font-medium">
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-12 mt-2 rounded-xl bg-white hover:bg-gray-200 text-black text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_25px_rgba(255,255,255,0.25)] disabled:opacity-60 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              {loading ? (
                <svg className="animate-spin w-5 h-5 text-black" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  {mode === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-gray-500 font-medium">
              Demo access: <code className="bg-white/5 px-1.5 py-0.5 rounded text-[10px] text-gray-300">any@email.com</code> + any password
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
