import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";
import type { Profile } from "../types";

type AuthState = {
  user: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
};
const AuthContext = createContext<AuthState>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    const profile = await api<Profile>("/users/profile");
    setUser(profile);
  };
  useEffect(() => {
    if (localStorage.getItem("roomly.accessToken"))
      refresh()
        .catch(() => {
          localStorage.removeItem("roomly.accessToken");
          localStorage.removeItem("roomly.refreshToken");
        })
        .finally(() => setLoading(false));
    else setLoading(false);
  }, []);
  const setTokens = (access: string, refreshToken: string) => {
    localStorage.setItem("roomly.accessToken", access);
    localStorage.setItem("roomly.refreshToken", refreshToken);
  };
  const login = async (email: string, password: string) => {
    const data = await api<{ accessToken: string; refreshToken: string }>(
      "/auth/login",
      { method: "POST", ...body({ email, password }) },
    );
    setTokens(data.accessToken, data.refreshToken);
    await refresh();
  };
  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("roomly.accessToken");
      localStorage.removeItem("roomly.refreshToken");
      setUser(null);
    }
  };
  return (
    <AuthContext.Provider
      value={useMemo(
        () => ({ user, loading, login, logout, refresh, setTokens }),
        [user, loading],
      )}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
const body = (value: unknown): RequestInit => ({
  body: JSON.stringify(value),
  headers: { "Content-Type": "application/json" },
});
