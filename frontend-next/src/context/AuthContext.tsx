"use client";

import { useState, createContext, useContext, ReactNode } from "react";

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string) => Promise<boolean>;
  register: (name: string, email: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = async (email: string): Promise<boolean> => {
    // Mock login - accepts any credentials
    setUser({ id: "u1", email, name: email.split("@")[0] });
    return true;
  };

  const register = async (name: string, email: string): Promise<boolean> => {
    setUser({ id: "u1", email, name });
    return true;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
