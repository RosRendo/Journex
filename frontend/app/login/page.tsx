'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Terminal, Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.push('/');
      router.refresh();
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      }
    });

    if (error) {
      setError(error.message);
    } else {
      setError('Check your email for the confirmation link.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black relative overflow-hidden" style={{ background: "radial-gradient(circle at 50% 0%, #1a1b26, #000)" }}>
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
      <div className="absolute w-[500px] h-[500px] bg-[#6366f1] rounded-full blur-[120px] opacity-20 -top-48 -left-48 pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] bg-[#ec4899] rounded-full blur-[120px] opacity-10 bottom-0 right-0 pointer-events-none" />
      
      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-lg relative" style={{ background: "linear-gradient(135deg, #1e1e2e, #11111b)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-pink-500/20 rounded-2xl blur-sm" />
            <Terminal size={32} className="text-white relative z-10" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">Journ<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">ex</span></h1>
          <p className="text-gray-400 font-medium">Professional grade trading dashboard</p>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl" style={{ background: "rgba(17, 17, 27, 0.7)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <form className="p-8 space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center font-medium">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail size={16} className="text-gray-500" />
                  </div>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock size={16} className="text-gray-500" />
                  </div>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button 
                onClick={handleLogin}
                disabled={loading}
                className="flex-1 bg-white text-black font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
              >
                {loading ? 'Processing...' : 'Sign In'}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={handleSignUp}
                disabled={loading}
                className="flex-1 bg-transparent border border-white/20 text-white font-bold py-3 px-4 rounded-xl hover:bg-white/5 transition-all disabled:opacity-70"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
