"use client";

import { useState } from "react";
import { signIn } from "@/lib/useSession";
import { useRouter } from "next/navigation";
import {
  TrendingUp, Mail, Lock, User, Eye, EyeOff,
  ArrowRight, Shield, Zap, Globe,
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
      setError("Invalid credentials. Try any email and password in demo mode.");
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left hero panel (hidden on mobile) ──────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#05050a] relative flex-col justify-between p-12 overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px]" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <TrendingUp className="w-5 h-5 text-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">Journex</span>
        </div>

        {/* Central content */}
        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-bold text-foreground leading-tight">
            Professional<br />
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              Forex Trading Dashboard
            </span>
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            Real-time MT5 integration, live signals, news alerts, sentiment analysis, and backtesting — all in one place.
          </p>
          <div className="space-y-3">
            {[
              { Icon: Zap, text: "Live MT5 bridge — real prices & positions" },
              { Icon: Globe, text: "Multi-source news with Discord & Telegram alerts" },
              { Icon: Shield, text: "Advanced risk calculator & trade confirmed checklist" },
            ].map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-violet-400" />
                </div>
                <span className="text-sm text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quote */}
        <div className="relative z-10 border border-border bg-white/3 rounded-2xl p-5">
          <p className="text-muted-foreground text-sm italic leading-relaxed">
            "The goal of a successful trader is to make the best trades. Money is secondary."
          </p>
          <p className="text-gray-600 text-xs mt-2">— Alexander Elder</p>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">Journex</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-sm text-muted-foreground mb-7">
            {mode === "login" ? "Sign in to your trading dashboard" : "Start your professional trading journey"}
          </p>

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 h-11 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-sm font-medium text-foreground mb-4 shadow-sm"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or with email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Tab toggle */}
          <div className="flex p-1 bg-muted rounded-xl mb-5">
            {(["login", "register"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize
                  ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {m}
              </button>
            ))}
          </div>

          <form onSubmit={handleCredentials} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input value={name} onChange={e => setName(e.target.value)}
                    placeholder="Your name" required
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60 transition" />
                </div>
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="trader@example.com" required
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60 transition" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required minLength={6}
                  className="w-full h-11 pl-10 pr-11 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60 transition" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {mode === "login" && (
              <div className="flex justify-end">
                <button type="button" className="text-xs text-violet-500 hover:text-violet-400 transition">
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-foreground text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-60">
              {loading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  {mode === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-2 items-center">
            <p className="text-xs text-muted-foreground">
              Demo: use <code className="bg-muted px-1 py-0.5 rounded text-[10px]">any@email.com</code> + any password
            </p>
            <p className="text-xs text-muted-foreground">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-violet-500 hover:text-violet-400 font-medium transition">
                {mode === "login" ? "Register" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
