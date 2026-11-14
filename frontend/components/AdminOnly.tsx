"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Loader2 } from "lucide-react";
import { getSession } from "@/lib/useSession";
import { isAdminEmail } from "@/lib/role";

export default function AdminOnly({
  pageName,
  children,
}: {
  pageName: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let alive = true;
    getSession()
      .then((session) => {
        if (!alive) return;
        const u = session?.user as any;
        const isUserAdmin = isAdminEmail(u?.email) || u?.role === "admin";
        setIsAdmin(isUserAdmin);
        setLoading(false);
        if (!isUserAdmin) {
          router.replace("/dashboard?denied=admin_only");
        }
      })
      .catch(() => {
        if (alive) {
          setLoading(false);
          router.replace("/dashboard?denied=admin_only");
        }
      });

    return () => {
      alive = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 text-neutral-400 font-mono text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        <span>Verifying Security Clearance...</span>
      </div>
    );
  }

  if (isAdmin) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
        <ShieldAlert className="w-8 h-8 text-red-400" />
      </div>
      <h1 className="text-xl font-bold text-white mb-2">{pageName} — Admin Only</h1>
      <p className="text-sm text-zinc-400 max-w-md mb-6">
        This screen manages live MT5 broker connections and is strictly reserved for the
        system owner. Redirecting to workspace...
      </p>
    </div>
  );
}
