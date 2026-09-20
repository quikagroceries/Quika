"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, setUnauthorizedHandler } from "@/lib/api";
import { clearShared } from "@/lib/sharedQuery";

const DUTY_KEY = "qyka_agent_on_duty";
const TOKEN_KEY = "qyka_token";

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: any) {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [onDuty, setOnDuty] = useState(true);
  const [dutyBusy, setDutyBusy] = useState(false);
  const [dutyError, setDutyError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const handleLogout = useCallback(() => {
    clearShared(); // never show the next person the last one's cached data
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(DUTY_KEY);
    setToken(null);
    setUser(null);
    setLoading(false);
    // Stay on guest-capable surfaces; otherwise bounce to login
    if (pathname === "/shop" || pathname === "/") {
      return;
    }
    if (pathname !== "/login") {
      router.replace("/login");
    }
  }, [pathname, router]);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    const dutyStored = localStorage.getItem(DUTY_KEY);
    setToken(stored);
    setOnDuty(dutyStored === null ? true : dutyStored === "true");
    setHydrated(true);
    if (!stored) setLoading(false);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleLogout);
  }, [handleLogout]);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.me()
      .then(setUser)
      .catch(() => handleLogout())
      .finally(() => setLoading(false));
  }, [token, hydrated, handleLogout]);

  useEffect(() => {
    if (!user || (user.role || "").toUpperCase() !== "AGENT") return;
    api.getMyAgentStatus()
      .then((s) => {
        setOnDuty(s.on_duty);
        localStorage.setItem(DUTY_KEY, String(s.on_duty));
      })
      .catch(() => {});
  }, [user]);

  const handleLoggedIn = useCallback((t) => {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
  }, []);

  const handleToggleDuty = useCallback(async (nextMode) => {
    setDutyError("");
    setDutyBusy(true);
    try {
      const result = await api.setAgentDuty(nextMode === "agent");
      setOnDuty(result.on_duty);
      localStorage.setItem(DUTY_KEY, String(result.on_duty));
      router.replace(result.on_duty ? "/agent" : "/shop");
    } catch (e) {
      setDutyError("Could not switch: " + e.message);
    } finally {
      setDutyBusy(false);
    }
  }, [router]);

  const role = (user?.role || "").toUpperCase();
  const roleSwitch = role === "AGENT"
    ? {
        mode: onDuty ? "agent" : "customer",
        onToggle: handleToggleDuty,
        busy: dutyBusy,
        error: dutyError,
      }
    : null;

  const homePath = useMemo(() => {
    if (!user) return "/shop";
    const r = (user.role || "").toUpperCase();
    if ((r === "CUSTOMER" || r === "AGENT") && !user.full_name) return "/setup";
    if (r === "ADMIN") return "/admin";
    if (r === "AGENT" && onDuty) return "/agent";
    if (r === "CUSTOMER" || r === "AGENT") return "/shop";
    return "/shop";
  }, [user, onDuty]);

  const value = {
    token,
    user,
    setUser,
    loading: !hydrated || loading,
    hydrated,
    onDuty,
    roleSwitch,
    homePath,
    handleLoggedIn,
    handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
