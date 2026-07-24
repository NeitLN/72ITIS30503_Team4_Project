'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  AuthUser, 
  getStoredToken, 
  getStoredUser, 
  setStoredAuth, 
  clearStoredAuth, 
  loginUser as apiLoginUser, 
  registerUser as apiRegisterUser,
  fetchCurrentUser,
  logoutUser as apiLogoutUser
} from '../lib/auth';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isHydrated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (payload: Record<string, unknown>) => Promise<{ success: boolean; user?: AuthUser | null }>;
  register: (payload: Record<string, unknown>) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async (currentToken: string) => {
    try {
      const res = await fetchCurrentUser(currentToken);
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        setStoredAuth(currentToken, res.data.user);
      } else {
        // Token might be expired or invalid
        clearStoredAuth();
        setUser(null);
        setToken(null);
      }
    } catch {
      // Don't log out purely for network errors, rely on localStorage user for now
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getStoredToken();
      const storedUser = getStoredUser();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        // Optimistically set hydrated to true so UI doesn't block
        setIsHydrated(true);
        // Verify in background
        await refreshUser(storedToken);
      } else {
        setIsHydrated(true);
      }
    };

    initAuth();
  }, [refreshUser]);

  const login = async (payload: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiLoginUser(payload);
      if (res.success && res.data) {
        setToken(res.data.token);
        setUser(res.data.user);
        setStoredAuth(res.data.token, res.data.user);
        return { success: true, user: res.data.user };
      } else {
        setError(res.error?.message || 'Login failed');
        return { success: false };
      }
    } catch {
      setError('An unexpected error occurred');
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: Record<string, unknown>) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiRegisterUser(payload);
      if (res.success && res.data) {
        setToken(res.data.token);
        setUser(res.data.user);
        setStoredAuth(res.data.token, res.data.user);
        return true;
      } else {
        setError(res.error?.message || 'Registration failed');
        return false;
      }
    } catch {
      setError('An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (token) {
      // Best effort to let backend know
      await apiLogoutUser(token).catch(() => {});
    }
    clearStoredAuth();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isHydrated,
        isLoading,
        error,
        login,
        register,
        logout,
        refreshUser: () => token ? refreshUser(token) : Promise.resolve(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
