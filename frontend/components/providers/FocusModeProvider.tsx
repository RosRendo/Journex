"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface FocusContextType {
  focusMode: boolean;
  toggleFocusMode: () => void;
}

const FocusContext = createContext<FocusContextType>({
  focusMode: false,
  toggleFocusMode: () => {},
});

export function FocusModeProvider({ children }: { children: React.ReactNode }) {
  const [focusMode, setFocusMode] = useState(false);

  const toggleFocusMode = useCallback(() => {
    setFocusMode(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("focus-mode");
      } else {
        document.documentElement.classList.remove("focus-mode");
      }
      return next;
    });
  }, []);

  // Keyboard shortcut: Ctrl+Shift+F
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "f") {
        e.preventDefault();
        toggleFocusMode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleFocusMode]);

  return (
    <FocusContext.Provider value={{ focusMode, toggleFocusMode }}>
      {children}
    </FocusContext.Provider>
  );
}

export const useFocusMode = () => useContext(FocusContext);
