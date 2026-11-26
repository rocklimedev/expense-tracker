import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { tokenStore } from '@/lib/api';
import { requestMessage, serverApi } from '@/lib/server-api';
import { setSignedIn, type AppDispatch, type RootState } from '@/lib/store';
import type { Me } from '@/lib/types';

interface AuthState {
  user: Me | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshPermissions: () => Promise<void>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const signedIn = useSelector((state: RootState) => state.session.signedIn);
  const session = serverApi.useCurrentUserQuery(undefined, { skip: !signedIn });
  const user = session.currentData ?? null;
  const loading = signedIn && !user && !session.isError;

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const { accessToken } = await dispatch(
          serverApi.endpoints.login.initiate({ email, password }, { track: false }),
        ).unwrap();
        tokenStore.set(accessToken);
        await dispatch(
          serverApi.endpoints.currentUser.initiate(undefined, {
            subscribe: false,
            forceRefetch: true,
          }),
        ).unwrap();
        dispatch(setSignedIn(true));
      } catch (error) {
        tokenStore.clear();
        dispatch(serverApi.util.resetApiState());
        throw new Error(requestMessage(error as FetchBaseQueryError));
      }
    },
    [dispatch],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    dispatch(setSignedIn(false));
    dispatch(serverApi.util.resetApiState());
  }, [dispatch]);

  useEffect(() => {
    if (signedIn && session.isError && !user) logout();
  }, [signedIn, session.isError, user, logout]);

  const refreshPermissions = useCallback(async () => {
    await dispatch(
      serverApi.endpoints.currentUser.initiate(undefined, { subscribe: false, forceRefetch: true }),
    ).unwrap();
  }, [dispatch]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshPermissions,
      can: (permission) => !!user?.permissions.includes(permission),
    }),
    [user, loading, login, logout, refreshPermissions],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
