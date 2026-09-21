"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas text-ink/50">
      <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p>Loading…</p>
    </div>
  );
}

/**
 * Client-side gate for authenticated routes.
 * @param {"CUSTOMER"|"AGENT"|"ADMIN"|Array<"CUSTOMER"|"AGENT"|"ADMIN">} [roles]
 * @param {"customer"|"agent"} [agentMode] — for AGENT role: which duty mode is allowed
 */
export default function RequireAuth({ children, roles, agentMode }: any) {
  const { token, user, loading, onDuty, homePath } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = Array.isArray(roles) ? roles : roles ? [roles] : null;
  const role = (user?.role || "").toUpperCase();
  // Admin-only routes bounce to the dedicated email+password login, never
  // the shared phone/OTP one (see backend/app/admin/routes.py::admin_login).
  const loginPath = allowed && allowed.length === 1 && allowed[0] === "ADMIN" ? "/admin-login" : "/login";

  useEffect(() => {
    if (loading) return;
    if (!token || !user) {
      router.replace(loginPath);
      return;
    }
    if ((role === "CUSTOMER" || role === "AGENT") && !user.full_name && pathname !== "/setup") {
      router.replace("/setup");
      return;
    }
    if (pathname === "/setup" && user.full_name) {
      router.replace(homePath);
      return;
    }
    if (allowed && !allowed.includes(role)) {
      router.replace(homePath);
      return;
    }
    if (role === "AGENT" && agentMode) {
      const wantAgent = agentMode === "agent";
      if (wantAgent && !onDuty) router.replace("/shop");
      if (!wantAgent && onDuty) router.replace("/agent");
    }
  }, [loading, token, user, role, allowed, agentMode, onDuty, pathname, router, homePath, loginPath]);

  if (loading || !token || !user) return <LoadingScreen />;
  if ((role === "CUSTOMER" || role === "AGENT") && !user.full_name && pathname !== "/setup") {
    return <LoadingScreen />;
  }
  if (allowed && !allowed.includes(role)) return <LoadingScreen />;
  if (role === "AGENT" && agentMode === "agent" && !onDuty) return <LoadingScreen />;
  if (role === "AGENT" && agentMode === "customer" && onDuty) return <LoadingScreen />;

  return children;
}
