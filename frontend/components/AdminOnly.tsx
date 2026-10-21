"use client";

import { useIsAdmin } from "@/lib/role";
import { ShieldAlert, Loader2 } from "lucide-react";

export default function AdminOnly({
  pageName,
  children,
}: {
  pageName: string;
  children: React.ReactNode;
}) {
  const isAdmin = useIsAdmin();

  if (isAdmin) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
        <ShieldAlert className="w-8 h-8 text-red-400" />
      </div>
      <h1 className="text-xl font-bold text-white mb-2">{pageName} — Admin Only</h1>
      <p className="text-sm text-zinc-400 max-w-md mb-6">
        This screen manages live MT5 broker connections and is reserved for the
        account owner. Your Journex workspace runs fully in{" "}
        <span className="text-emerald-400 font-semibold">paper trading mode</span>{" "}
        — journals, analytics, alerts, and every other tool are unlocked.
      </p>
      <div className="flex items-center gap-2 text-xs text-zinc-500 border border-zinc-800 rounded-full px-4 py-2">
        <Loader2 className="w-3 h-3 animate-spin text-zinc-600" />
        If you are the owner and see this, sign in with your admin Google account.
      </div>
    </div>
  );
}
