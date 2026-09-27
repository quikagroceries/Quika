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
    // The hidden admin sign-in page is any single 64-character alphanumeric
    // path; never bounce someone off it (its name is deliberately not written
    // down in the code shipped to every visitor).
    if (/^\/[A-Za-z0-9]{64}$/.test(pathname)) return;
    // Admin routes send signed-out visitors to the homepage, not to a login
    // page, so /admin doesn't reveal where the real sign-in lives.
    if (pathname.startsWith("/admin")) {
      router.replace("/");
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
  // An agent approved straight from the public For Agents page is
  // agent-only until they register as a customer (Agent Settings) - no
  // switch, no shopping side, always in agent mode. Backend enforces the
  // same (core/security.py::get_customer_user, markets.service.set_duty).
  const agentOnly = role === "AGENT" && user?.has_customer_side === false;
  const effectiveOnDuty = agentOnly ? true : onDuty;
  const roleSwitch = role === "AGENT" && !agentOnly
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
    if (r === "AGENT" && effectiveOnDuty) return "/agent";
    if (r === "CUSTOMER" || r === "AGENT") return "/shop";
    return "/shop";
  }, [user, effectiveOnDuty]);

  const value = {
    token,
    user,
    setUser,
    loading: !hydrated || loading,
    hydrated,
    onDuty: effectiveOnDuty,
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
