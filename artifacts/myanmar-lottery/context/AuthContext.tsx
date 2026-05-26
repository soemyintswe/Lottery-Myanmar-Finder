import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ManagedUser } from "@/types/user";
import { getCurrentUser, getStoredAdminApiToken, logoutUser } from "@/services/userAdminService";

type AuthState = {
  token: string;
  user: ManagedUser | null;
  loading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<ManagedUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    const stored = getStoredAdminApiToken();
    if (!stored) {
      setToken("");
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const me = await getCurrentUser(stored);
      if (!me) {
        setToken("");
        setUser(null);
        setLoading(false);
        return;
      }
      setToken(stored);
      setUser(me);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    logoutUser();
    setToken("");
    setUser(null);
  }, []);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  const value = useMemo(() => ({ token, user, loading, refreshAuth, logout }), [token, user, loading, refreshAuth, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

