'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

type UseAuthReturn = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export const useAuth = (): UseAuthReturn => {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isHydrated, setIsHydrated] = React.useState(false);

  const supabase = createClient();

  React.useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window !== 'undefined') {
      setIsHydrated(true);
    }
  }, []);

  React.useEffect(() => {
    if (!isHydrated) return;

    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
        } else {
          router.push('/signin');
        }
      } catch (error) {
        console.error('Error getting user:', error);
        router.push('/signin');
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setLoading(false);
      } else {
        setUser(null);
        router.push('/signin');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, router, isHydrated]);

  return {
    user,
    loading,
    isAuthenticated: !!user
  };
}
