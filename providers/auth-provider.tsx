'use client';

import { useEffect, ReactNode } from 'react';
import { onAuthChange, getUserDocument } from '@/lib/firebase/auth';
import { useAuthStore } from '@/store/auth-store';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setProfile, setLoading, reset } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        const profile = await getUserDocument(firebaseUser.uid);
        if (profile) {
          setProfile(profile);
        } else {
          setProfile(null);
        }
      } else {
        reset();
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [setUser, setProfile, setLoading, reset]);

  return <>{children}</>;
}
