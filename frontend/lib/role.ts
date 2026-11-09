"use client";

import { useEffect, useState } from "react";
import { getSession } from "@/lib/useSession";

const DEFAULT_ADMINS = ["rousrendo@gmail.com", "admin@journex.io"];
const ENV_ADMINS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "")
  .split(",")
  .map((e) => e.toLowerCase().trim())
  .filter(Boolean);

const ADMIN_EMAILS = Array.from(new Set([...DEFAULT_ADMINS, ...ENV_ADMINS]));

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let alive = true;
    getSession()
      .then((session) => {
        if (alive) {
          const u = session?.user as any;
          setIsAdmin(isAdminEmail(u?.email) || u?.role === "admin");
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return isAdmin;
}
