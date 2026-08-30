import React, { ReactNode } from "react";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/lib/useSession";

interface ProLockProps {
  children: ReactNode;
  featureName?: string;
}

export function ProLock({ children, featureName = "This feature" }: ProLockProps) {
  const { data: session } = useSession();
  const isPro = (session?.user as any)?.isPro === true;

  if (isPro) {
    return <>{children}</>;
  }

  return (
    <div className="relative overflow-hidden rounded-xl group/lock w-full h-full min-h-[250px]">
      <div className="absolute inset-0 blur-md opacity-30 pointer-events-none select-none overflow-hidden scale-105">
        {children}
      </div>
      <div className="absolute inset-0 bg-background/60 flex flex-col items-center justify-center p-6 text-center z-10 backdrop-blur-[2px]">
        <div className="w-14 h-14 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-violet-400" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1 tracking-tight">Pro Feature</h3>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-5 leading-relaxed">
          {featureName} is only available on the Pro or Lifetime plans. Upgrade to unlock full access.
        </p>
        <Link 
          href="/subscription"
          className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors shadow-lg shadow-violet-500/20"
        >
          Upgrade to Pro
        </Link>
      </div>
    </div>
  );
}

