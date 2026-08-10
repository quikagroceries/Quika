"use client";

import { usePathname } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import AppShell from "@/components/AppShell";
import Notifications from "@/screens/Notifications";
import { useAuth } from "@/components/AuthProvider";
import { CUSTOMER_NAV } from "@/lib/nav";

function activeKeyFromPath(pathname) {
  if (pathname.startsWith("/orders/")) return null;
  if (pathname.startsWith("/history")) return "history";
  if (pathname.startsWith("/wallet")) return "wallet";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/shop")) return "shop";
  return "shop";
}

export default function CustomerLayout({ children }: any) {
  const { user, handleLogout, roleSwitch } = useAuth();
  const pathname = usePathname();

  return (
    <RequireAuth roles={["CUSTOMER", "AGENT"]} agentMode="customer">
      <AppShell
        navItems={CUSTOMER_NAV}
        activeKey={activeKeyFromPath(pathname)}
        user={user}
        onLogout={handleLogout}
        roleSwitch={roleSwitch}
      >
        <Notifications />
        {children}
      </AppShell>
    </RequireAuth>
  );
}
