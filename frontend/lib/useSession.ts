import { useSession as nextAuthUseSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut, getSession as nextAuthGetSession } from "next-auth/react";

export function useSession() {
  return nextAuthUseSession();
}

export async function signIn(provider?: string, options?: any) {
  return await nextAuthSignIn(provider, options);
}

export async function getSession() {
  try {
    return await nextAuthGetSession();
  } catch {
    return null;
  }
}

export async function signOut(options?: any) {
  return await nextAuthSignOut(options);
}

export async function performLogout() {
  try {
    // 1. Expire all session cookies on client side
    const cookieNames = [
      "authjs.session-token",
      "__Secure-authjs.session-token",
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
      "authjs.csrf-token",
      "next-auth.csrf-token",
    ];
    if (typeof document !== "undefined") {
      cookieNames.forEach((name) => {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
        document.cookie = `${name}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
      });
    }

    // 2. Call NextAuth signout endpoint
    await nextAuthSignOut({ redirect: false });
  } catch (err) {
    console.error("[LOGOUT ERROR]", err);
  } finally {
    // 3. Hard redirect to /auth?logout=true to purge all in-memory state
    if (typeof window !== "undefined") {
      window.location.href = "/auth?logout=true";
    }
  }
}
