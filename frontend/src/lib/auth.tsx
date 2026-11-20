import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, hasMockToken, setToken, setTokenProvider } from "./api";
import { resetChat } from "./chat";
import { supabase } from "./supabase";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => void;
}
const AuthContext = createContext<AuthState | null>(null);

// The backend tells us which sign-in to use: demo sessions (MOCK_DB=true) or Supabase Auth (MOCK_DB=false).
let useSupabase = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const health = await api<{ mockDb?: boolean }>("/api/health");
        useSupabase = health.mockDb === false;
        if (useSupabase) {
          setTokenProvider(async () => (await supabase().auth.getSession()).data.session?.access_token ?? null);
          const { data } = await supabase().auth.getSession();
          if (data.session) setUser(await api<User>("/api/me"));
        } else if (hasMockToken()) {
          setUser(await api<User>("/api/me"));
        }
      } catch {
        setToken(null); // not signed in (or the backend is down): show the login page
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (useSupabase) {
      const { error } = await supabase().auth.signInWithPassword({ email, password });
      if (error) throw new Error("Wrong email or password");
      const me = await api<User>("/api/me");
      setUser(me);
      return me;
    }
    const res = await api<{ token: string; user: User }>("/api/auth/login", { body: { email, password } });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const signOut = useCallback(() => {
    void resetChat();
    if (useSupabase) void supabase().auth.signOut(); else setToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
