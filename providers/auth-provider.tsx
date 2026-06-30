'use client';

import { useEffect, ReactNode } from 'react';
import { onAuthChange, getUserDocument } from '@/lib/firebase/auth';
import { useAuthStore } from '@/store/auth-store';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setProfile, setLoading, reset } = useAuthStore();

  useEffect(() => {
    let logoutTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (logoutTimer) {
        clearTimeout(logoutTimer);
        logoutTimer = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        const profile = await getUserDocument(firebaseUser.uid);
        if (profile) {
          setProfile(profile);
        } else {
          setProfile(null);
        }
        setLoading(false);
      } else {
        setLoading(true);
        logoutTimer = setTimeout(() => {
          reset();
        }, 3000);
      }
    });

    return () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      unsubscribe();
    };
  }, [setUser, setProfile, setLoading, reset]);

  return <>{children}</>;
}
