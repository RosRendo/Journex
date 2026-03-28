"use client";

import { ThemeProvider } from "next-themes";
import React from "react";
import { TradeProvider } from "@/src/context/TradeContext";
import { AccountProvider } from "@/src/context/AccountContext";
import { AuthProvider } from "@/src/context/AuthContext";
import { Toaster } from "sonner";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
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
              {children}
              <Toaster position="top-right" theme="system" richColors closeButton />
            </TradeProvider>
          </AccountProvider>
        </AuthProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
