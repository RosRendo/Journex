import { useSession as nextAuthUseSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut, getSession as nextAuthGetSession } from "next-auth/react";

export function useSession() {
  return nextAuthUseSession();
}

export async function signIn(provider?: string, options?: any) {
  return await nextAuthSignIn(provider, options);
}

export async function getSession() {
  return await nextAuthGetSession();
}

export async function signOut(options?: any) {
  return await nextAuthSignOut(options);
}
