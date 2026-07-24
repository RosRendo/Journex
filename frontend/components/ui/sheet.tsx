import React, { useEffect } from "react";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
}

export function Sheet({ open, onOpenChange, children, title }: SheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={() => onOpenChange(false)}
      />
      
      {/* Drawer */}
      <div 
        className="relative w-full max-w-md bg-zinc-950 border-l border-zinc-800 shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300"
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
          <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-100">{title}</h2>
          <button 
            onClick={() => onOpenChange(false)}
            className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scroll-thin p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
