import { useEffect, useState } from "react";
import { createClient } from "../utils/supabase/client";

export function useSession() {
  const [session, setSession] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setStatus(session ? "authenticated" : "unauthenticated");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setStatus(session ? "authenticated" : "unauthenticated");
    });

    return () => subscription.unsubscribe();
  }, []);

  return { data: session, status };
}

export async function signIn(provider?: string, options?: any) {
  const supabase = createClient();
  if (provider === "google") {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
  } else if (provider === "credentials" && options?.email && options?.password) {
    if (options?.isRegister) {
      const { data, error } = await supabase.auth.signUp({
        email: options.email,
        password: options.password,
        options: { data: { name: options.name } }
      });
      return { ok: !error, error: error?.message };
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: options.email,
        password: options.password
      });
      return { ok: !error, error: error?.message };
    }
  } else {
    // Basic redirect for other sign in methods
    window.location.href = "/login";
  }
}

export async function getSession() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function signOut(options?: any) {
  const supabase = createClient();
  await supabase.auth.signOut();
  if (options?.redirect !== false) {
    window.location.href = "/login";
  }
}
