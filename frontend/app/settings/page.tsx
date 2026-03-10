"use client";

import { useState } from "react";
import { useAuth } from "../../src/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, DollarSign, ShieldAlert, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Settings() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [currency, setCurrency] = useState("USD");
  const [riskPerTrade, setRiskPerTrade] = useState("2");
  const [maxDailyLoss, setMaxDailyLoss] = useState("5");

  const handleLogout = () => {
    logout();
    router.push("/auth");
  };

  return (
          <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your profile and preferences
          </p>
        </div>

        {/* Profile */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold">Profile</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Name
              </label>
              <Input
                value={user?.name || ""}
                readOnly
                className="bg-secondary/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Email
              </label>
              <Input
                value={user?.email || ""}
                readOnly
                className="bg-secondary/50"
              />
            </div>
          </div>
        </div>

        {/* Trading Preferences */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold">Trading Preferences</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Currency
              </label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Risk Management */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <ShieldAlert className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold">Risk Management</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Risk Per Trade (%)
              </label>
              <Input
                type="number"
                step="0.1"
                value={riskPerTrade}
                onChange={(e) => setRiskPerTrade(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Max Daily Loss (%)
              </label>
              <Input
                type="number"
                step="0.1"
                value={maxDailyLoss}
                onChange={(e) => setMaxDailyLoss(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Logout */}
        <Button variant="destructive" onClick={handleLogout} className="gap-2">
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>
  );
}
