"use client";

import { ThemeProvider } from "next-themes";
import React from "react";
import { TradeProvider } from "@/src/context/TradeContext";
import { AccountProvider } from "@/src/context/AccountContext";
import { AuthProvider } from "@/src/context/AuthContext";
import { Toaster } from "sonner";
import { SessionProvider } from "next-auth/react";
import { WebSocketProvider } from "@/components/providers/WebSocketProvider";
import { WorkspaceProvider } from "@/src/context/WorkspaceContext";
import { TradingCoreProvider } from "@/components/providers/TradingCoreProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <WorkspaceProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey="tradezella-theme"
      >
        <AuthProvider>
          <AccountProvider>
            <TradeProvider>
              <WebSocketProvider>
                <TradingCoreProvider>
                  {children}
                </TradingCoreProvider>
                <Toaster
                  position="top-right"
                  theme="dark"
                  richColors
                  closeButton
                  toastOptions={{
                    style: {
                      background: "#111118",
                      border: "1px solid rgba(63, 63, 70, 0.4)",
                      color: "#fff",
                      fontFamily: "monospace",
                      fontSize: "10px",
                    },
                  }}
                />
              </WebSocketProvider>
            </TradeProvider>
          </AccountProvider>
        </AuthProvider>
      </ThemeProvider>
      </WorkspaceProvider>
    </SessionProvider>
  );
}
