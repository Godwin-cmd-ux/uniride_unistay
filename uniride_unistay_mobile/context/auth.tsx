import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { api, loadStoredToken, setAuthToken, TOKEN_KEY, USER_KEY } from '@/lib/api';
import type { AuthUser } from '@/lib/types';

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  signIn: (token: string, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (user: AuthUser) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const storedToken = await loadStoredToken();
        if (!storedToken) return;
        const cached = await AsyncStorage.getItem(USER_KEY);
        if (cached && active) {
          try {
            setUser(JSON.parse(cached) as AuthUser);
          } catch {
            await AsyncStorage.removeItem(USER_KEY);
          }
        }
        const fresh = await api<AuthUser>('/api/auth/me');
        if (!active) return;
        setUser(fresh);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh));
      } catch {
        setAuthToken(null);
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
        if (active) setUser(null);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (token: string, nextUser: AuthUser) => {
    setAuthToken(token);
    setUser(nextUser);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(nextUser)],
    ]);
  }, []);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }, []);

  const refresh = useCallback(async () => {
    const fresh = await api<AuthUser>('/api/auth/me');
    setUser(fresh);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh));
  }, []);

  const updateUser = useCallback(async (nextUser: AuthUser) => {
    setUser(nextUser);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }, []);

  const value = useMemo(
    () => ({ user, ready, signIn, signOut, refresh, updateUser }),
    [user, ready, signIn, signOut, refresh, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
