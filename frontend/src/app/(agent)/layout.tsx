"use client";

import { usePathname } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { AGENT_NAV } from "@/lib/nav";

function activeKeyFromPath(pathname) {
  if (pathname.startsWith("/agent/orders/")) return null;
  if (pathname.startsWith("/agent/history")) return "history";
  if (pathname.startsWith("/agent/dashboard")) return "dashboard";
  if (pathname.startsWith("/agent/settings")) return "settings";
  return "home";
}

export default function AgentLayout({ children }: any) {
  const { user, handleLogout, roleSwitch } = useAuth();
  const pathname = usePathname();

  return (
    <RequireAuth roles={["AGENT"]} agentMode="agent">
      <AppShell
        navItems={AGENT_NAV}
        activeKey={activeKeyFromPath(pathname)}
        user={user}
        onLogout={handleLogout}
        roleSwitch={roleSwitch}
      >
        {children}
      </AppShell>
    </RequireAuth>
  );
}
