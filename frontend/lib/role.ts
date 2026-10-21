"use client";

import { useEffect, useState } from "react";
import { getSession } from "@/lib/useSession";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "rousrendo@gmail.com")
  .split(",")
  .map((e) => e.toLowerCase().trim());

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
        if (alive) setIsAdmin(isAdminEmail((session?.user as any)?.email));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return isAdmin;
}
