import { createContext, useContext } from 'react';
import type { ProfileUser } from '@/api/client';

export interface AuthContextValue {
  user: ProfileUser;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
};
