"use client";

import { useState, createContext, useContext, ReactNode } from "react";
import { TradingAccount } from "../../types/trade";

interface AccountContextType {
  accounts: TradingAccount[];
  activeAccount: TradingAccount;
  addAccount: (account: Omit<TradingAccount, "id" | "createdAt">) => void;
  deleteAccount: (id: string) => void;
  setActiveAccount: (id: string) => void;
}

const defaultAccounts: TradingAccount[] = [
  {
    id: "acc1",
    name: "Main Account",
    broker: "FTMO",
    balance: 52480.5,
    initialBalance: 50000,
    createdAt: "2024-01-01",
  },
  {
    id: "acc2",
    name: "Crypto",
    broker: "Binance",
    balance: 12350.0,
    initialBalance: 10000,
    createdAt: "2024-03-15",
  },
  {
    id: "acc3",
    name: "Personal",
    broker: "IC Markets",
    balance: 5820.75,
    initialBalance: 5000,
    createdAt: "2024-06-01",
  },
];

const AccountContext = createContext<AccountContextType | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<TradingAccount[]>(defaultAccounts);
  const [activeId, setActiveId] = useState("acc1");

  const activeAccount = accounts.find((a) => a.id === activeId) || accounts[0];

  const addAccount = (account: Omit<TradingAccount, "id" | "createdAt">) => {
    setAccounts((prev) => [
      ...prev,
      {
        ...account,
        id: `acc${Date.now()}`,
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const deleteAccount = (id: string) => {
    if (accounts.length <= 1) return;
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    if (activeId === id) setActiveId(accounts[0].id);
  };

  const setActiveAccount = (id: string) => setActiveId(id);

  return (
    <AccountContext.Provider
      value={{
        accounts,
        activeAccount,
        addAccount,
        deleteAccount,
        setActiveAccount,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccounts() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccounts must be used within AccountProvider");
  return ctx;
}
