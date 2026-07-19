'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { onIdTokenChanged, signOut as fbSignOut, type User } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase-client';

type AuthState = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signOut: async () => {},
});

/**
 * Mirrors the Firebase ID token into a cookie so server routes (Admin SDK
 * `verifyRequest`) can authenticate the caller. Firebase refreshes the token
 * roughly hourly; `onIdTokenChanged` fires on every refresh so the cookie
 * stays valid.
 */
function writeTokenCookie(token: string | null) {
  if (typeof document === 'undefined') return;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  if (token) {
    document.cookie = `firebase-auth-token=${token}; path=/; max-age=3600; SameSite=Lax${secure}`;
  } else {
    document.cookie = `firebase-auth-token=; path=/; max-age=0; SameSite=Lax${secure}`;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getClientAuth();
    const unsub = onIdTokenChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      writeTokenCookie(u ? await u.getIdToken() : null);
    });
    return unsub;
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      signOut: async () => {
        await fbSignOut(getClientAuth());
        writeTokenCookie(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
