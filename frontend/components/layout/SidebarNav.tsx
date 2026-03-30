"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SIDEBAR_GROUPS, HEADER_GROUPS } from "./navigation";
import { LayoutDashboard } from "lucide-react";

export function PrimarySidebar() {
  const pathname = usePathname();

  return (
    <div className="w-[210px] h-full flex flex-col border-r flex-shrink-0 overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
      <div className="flex-1 overflow-y-auto py-3 space-y-4 scrollbar-none">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.id} className="px-2">
            {/* Group Label */}
            <div className="px-2 pb-1 text-[9px] font-bold tracking-[0.12em] text-[--text-tertiary] uppercase">
              {group.label}
            </div>

            {/* Items */}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === pathname ||
                  item.children?.some((c) => c.href === pathname);

                return (
                  <Link
                    key={item.id}
                    href={item.href || item.children?.[0]?.href || "#"}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all duration-150 group ${
                      isActive
                        ? "border-l-[3px] border-[--accent] bg-[--accent-dim] text-[--accent] pl-2"
                        : "border-l-[3px] border-transparent text-[--text-secondary] hover:bg-[--bg-elevated] hover:text-[--text-primary]"
                    }`}
                  >
                    <item.icon
                      className={`w-[15px] h-[15px] flex-shrink-0 ${isActive ? "text-[--accent]" : "text-[--text-tertiary] group-hover:text-[--text-primary]"}`}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        
        {/* Mobile ONLY extra navigation groups (Risk, Tools, Simulation) */}
        <div className="lg:hidden space-y-4 pt-4 mt-4 border-t border-white/5">
          {HEADER_GROUPS.map((group) => (
            <div key={group.id} className="px-2">
              <div className="px-2 pb-1 text-[9px] font-bold tracking-[0.12em] text-[--text-tertiary] uppercase">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    item.href === pathname ||
                    item.children?.some((c) => c.href === pathname);
                  return (
                    <Link
                      key={item.id}
                      href={item.href || item.children?.[0]?.href || "#"}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all duration-150 group ${
                        isActive
                          ? "border-l-[3px] border-[--accent] bg-[--accent-dim] text-[--accent] pl-2"
                          : "border-l-[3px] border-transparent text-[--text-secondary] hover:bg-[--bg-elevated] hover:text-[--text-primary]"
                      }`}
                    >
                      <item.icon
                        className={`w-[15px] h-[15px] flex-shrink-0 ${isActive ? "text-[--accent]" : "text-[--text-tertiary] group-hover:text-[--text-primary]"}`}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ContextPanel() {
  return null;
}
