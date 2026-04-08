import React from "react";
import { FolderX } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ 
  title = "No Data Available", 
  description = "There is currently no data to display in this section.",
  icon = <FolderX className="w-8 h-8 opacity-20" />,
  action
}: EmptyStateProps) {
  return (
    <div className="w-full flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-[--border] bg-[--bg-card]">
      <div className="mb-4 text-[--text-tertiary]">{icon}</div>
      <h3 className="text-sm font-bold text-white uppercase tracking-widest">{title}</h3>
      <p className="text-xs text-[--text-secondary] mt-2 max-w-sm">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
