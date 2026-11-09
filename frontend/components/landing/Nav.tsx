"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, TrendingUp, X } from "lucide-react";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#showcase", label: "Product" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav
      aria-label="Main"
      className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#070709]/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Journex home">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#20e0b2]/10 border border-[#20e0b2]/30 shadow-[0_0_12px_rgba(32,224,178,0.25)]">
            <TrendingUp className="h-4 w-4 text-[#20e0b2]" strokeWidth={2.5} />
          </span>
          <span className="text-[15px] font-bold tracking-tight text-white flex items-center gap-1.5">
            Journex
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.06] text-[#20e0b2] border border-[#20e0b2]/20 font-bold">
              TERMINAL
            </span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] font-medium text-zinc-400 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2.5 md:flex">
          <Link
            href="/auth?mode=login"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[13px] font-medium text-zinc-300 transition-all hover:bg-white/[0.08] hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg bg-[#20e0b2] hover:bg-[#1bc79e] px-4 py-1.5 text-[13px] font-bold text-black transition-all shadow-[0_0_16px_rgba(32,224,178,0.3)] hover:shadow-[0_0_22px_rgba(32,224,178,0.5)]"
          >
            Launch Cockpit
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300 md:hidden hover:text-white"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-white/[0.08] bg-[#09090d] md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-white/[0.08] pt-4">
                <Link
                  href="/auth?mode=login"
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-center text-sm font-medium text-zinc-300"
                >
                  Log in
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-[#20e0b2] px-4 py-2.5 text-center text-sm font-bold text-black shadow-[0_0_16px_rgba(32,224,178,0.3)]"
                >
                  Launch Cockpit
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
