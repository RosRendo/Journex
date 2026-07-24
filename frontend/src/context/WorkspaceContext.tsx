"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type WorkspaceType = "Global" | "Forex" | "Gold" | "Crypto" | "Scalping" | "Swing" | "Funded Challenge";

interface WorkspaceContextProps {
  activeWorkspace: WorkspaceType;
  setActiveWorkspace: (w: WorkspaceType) => void;
}

const WorkspaceContext = createContext<WorkspaceContextProps | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceType>("Global");

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
