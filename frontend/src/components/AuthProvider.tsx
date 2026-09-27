"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, setUnauthorizedHandler } from "@/lib/api";
import { clearShared } from "@/lib/sharedQuery";
import { clearToken, getToken, isAdminPath, saveToken, type Realm } from "@/lib/session";

const DUTY_KEY = "qyka_agent_on_duty";

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
  // The main app and the admin portal are two separate worlds with their own
  // session (see lib/session.ts). Which one this provider is serving is decided
  // by the page: the token, the user and every redirect below follow it.
  const realm: Realm = isAdminPath(pathname) ? "admin" : "customer";
  const [tokenRealm, setTokenRealm] = useState<Realm | null>(null);

  const handleLogout = useCallback(() => {
    clearShared(); // never show the next person the last one's cached data
    clearToken(realm);
    if (realm === "customer") localStorage.removeItem(DUTY_KEY);
    setToken(null);
    setUser(null);
    setLoading(false);
    if (realm === "admin") {
      // Never bounce someone off the hidden sign-in page itself. Elsewhere in
      // the admin, a signed-out visitor goes to the public homepage - not to a
      // login page - so /admin doesn't reveal where the real sign-in lives.
      if (!pathname.startsWith("/admin")) return;
      router.replace("/");
      return;
    }
    // Stay on guest-capable surfaces; otherwise bounce to login
    if (pathname === "/shop" || pathname === "/") {
      return;
    }
    if (pathname !== "/login") {
      router.replace("/login");
    }
  }, [pathname, router, realm]);

  // (Re)load the session whenever the realm changes - e.g. moving from the
  // main app into the admin portal starts from that portal's own session.
  useEffect(() => {
    const stored = getToken(realm);
    setToken(stored);
    setTokenRealm(realm);
    setUser(null);
    if (realm === "customer") {
      const dutyStored = localStorage.getItem(DUTY_KEY);
      setOnDuty(dutyStored === null ? true : dutyStored === "true");
    }
    setLoading(!!stored);
    setHydrated(true);
  }, [realm]);

  useEffect(() => {
    setUnauthorizedHandler(handleLogout);
  }, [handleLogout]);

  useEffect(() => {
    if (!hydrated || tokenRealm !== realm) return;
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.me()
      .then((u) => {
        // A session only counts in its own world: an admin account is never
        // signed in on the main app, and nobody else is ever signed in to the
        // admin portal (this also retires any old admin token left in the
        // main app's storage).
        const isAdminAccount = (u?.role || "").toUpperCase() === "ADMIN";
        if (isAdminAccount !== (realm === "admin")) {
          clearToken(realm);
          setToken(null);
          setUser(null);
          return;
        }
        setUser(u);
      })
      .catch(() => handleLogout())
      .finally(() => setLoading(false));
  }, [token, hydrated, tokenRealm, realm, handleLogout]);

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
    saveToken(realm, t);
    setTokenRealm(realm);
    setToken(t);
  }, [realm]);

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
