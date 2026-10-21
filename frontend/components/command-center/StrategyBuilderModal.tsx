"use client";
import React from "react";

export default function StrategyBuilderModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
  [k: string]: any;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0f0f13] border border-white/10 rounded-xl p-6 w-80 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-zinc-400 text-sm mb-4">Strategy Builder coming soon.</p>
        <button onClick={onClose} className="px-4 py-1.5 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20 transition-all font-mono">Close</button>
      </div>
    </div>
  );
}