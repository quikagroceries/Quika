"use client";

import { usePathname } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { ADMIN_NAV } from "@/lib/nav";

function activeKeyFromPath(pathname) {
  if (pathname.startsWith("/admin/orders")) return "orders";
  if (pathname.startsWith("/admin/markets")) return "markets";
  if (pathname.startsWith("/admin/agents")) return "agents";
  if (pathname.startsWith("/admin/users")) return "users";
  if (pathname.startsWith("/admin/float")) return "float";
  if (pathname.startsWith("/admin/analytics")) return "analytics";
  if (pathname.startsWith("/admin/settings")) return "settings";
  return "dashboard";
}

export default function AdminLayout({ children }: any) {
  const { user, handleLogout } = useAuth();
  const pathname = usePathname();

  return (
    <RequireAuth roles={["ADMIN"]}>
      <AppShell
        navItems={ADMIN_NAV}
        activeKey={activeKeyFromPath(pathname)}
        user={user}
        onLogout={handleLogout}
        fullWidth
        contentClassName="bg-canvas"
      >
        {children}
      </AppShell>
    </RequireAuth>
  );
}
