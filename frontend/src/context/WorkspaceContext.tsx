"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type WorkspaceType = "Global" | "Forex" | "Gold" | "Crypto" | "Scalping" | "Swing" | "Funded Challenge";

interface WorkspaceContextProps {
  activeWorkspace: WorkspaceType;
  setActiveWorkspace: (w: WorkspaceType) => void;
}

const WorkspaceContext = createContext<WorkspaceContextProps | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  // Default to Gold dedicated workspace if no saved preference exists
  const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceType>("Gold");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("journex_active_workspace") as WorkspaceType;
      if (saved && ["Global", "Forex", "Gold", "Crypto", "Scalping", "Swing", "Funded Challenge"].includes(saved)) {
        setActiveWorkspaceState(saved);
      }
    } catch (_) {}
  }, []);

  const setActiveWorkspace = (w: WorkspaceType) => {
    setActiveWorkspaceState(w);
    try {
      localStorage.setItem("journex_active_workspace", w);
    } catch (_) {}
  };

  return (
    <WorkspaceContext.Provider value={{ activeWorkspace, setActiveWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
