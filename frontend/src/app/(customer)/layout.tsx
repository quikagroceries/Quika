"use client";

import { usePathname } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import AppShell from "@/components/AppShell";
import Notifications from "@/screens/Notifications";
import { useAuth } from "@/components/AuthProvider";
import { CUSTOMER_NAV } from "@/lib/nav";
import { ShopProvider } from "@/components/shop/ShopContext";
import ShopShell from "@/components/shop/ShopShell";

function activeKeyFromPath(pathname: string) {
  if (pathname.startsWith("/orders/")) return null;
  if (pathname.startsWith("/history")) return "history";
  if (pathname.startsWith("/wallet")) return "wallet";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/shop")) return "shop";
  return "shop";
}

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

/** /shop is guest-capable + header-first; account pages keep AppShell sidebar. */
export default function CustomerLayout({ children }: any) {
  const { user, token, hydrated, handleLogout, roleSwitch } = useAuth();
  const pathname = usePathname();
  const isShop = pathname === "/shop" || pathname.startsWith("/shop/");

  if (isShop) {
    if (!hydrated) return <LoadingScreen />;
    return (
      <ShopProvider>
        <ShopShell>{children}</ShopShell>
      </ShopProvider>
    );
  }

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
