import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type ProfileUser } from '@/api/client';
import { AuthContext } from './auth-context';
import { AuthPage } from '@/pages/AuthPage';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then((result) => setUser(result.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () =>
      user
        ? {
            user,
            logout: async () => {
              await api.logout();
              setUser(null);
            },
          }
        : null,
    [user],
  );

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-app text-[13px] text-ink-3">Загрузка профиля…</div>;
  }
  if (!user || !value) return <AuthPage onAuthenticated={setUser} />;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
