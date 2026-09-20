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
  // A single order's tracking screen - reachable from Track (most often) or
  // History, but there's no dedicated nav item for it, so it identifies as
  // Track rather than leaving the sidebar showing nothing active at all.
  if (pathname.startsWith("/orders/")) return "track";
  if (pathname.startsWith("/track")) return "track";
  if (pathname.startsWith("/history")) return "track";
  if (pathname.startsWith("/messages")) return "messages";
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

/**
 * ONE shell for the whole customer app. Shop, Orders, Messages, Wallet and
 * Settings all render through the SAME <AppShell> element, so navigating
 * between them keeps the sidebar, header, tab bar, bag and chat dock mounted -
 * only the page inside swaps. (This used to be two different AppShell trees,
 * one for Shop and one for everything else, so every Shop <-> other move tore
 * the whole frame down and rebuilt it: the flicker and lag.) What differs by
 * route is just props:
 *  - Shop is guest-capable and `bare` (its own layout via ShopShell);
 *    everything else needs a signed-in customer (RequireAuth, applied INSIDE
 *    the shell around the page so the frame never unmounts for it).
 *  - `ShopProvider` and `Notifications` sit above/beside the shell for the
 *    same reason: the bag's state, the list draft and the toast poll all
 *    survive navigation instead of restarting with each page.
 */
export default function CustomerLayout({ children }: any) {
  const { user, token, hydrated, handleLogout, roleSwitch } = useAuth();
  const pathname = usePathname();
  const isShop = pathname === "/shop" || pathname.startsWith("/shop/");
  const authed = !!token && !!user;

  // First load only: don't paint a shell before we know who the user is.
  if (!hydrated) return <LoadingScreen />;

  // Signed out on a page that needs an account: no shell, just the redirect.
  if (!isShop && !authed) {
    return (
      <RequireAuth roles={["CUSTOMER", "AGENT"]} agentMode="customer">
        {null}
      </RequireAuth>
    );
  }

  return (
    <ShopProvider>
      {authed && <Notifications />}
      <AppShell
        navItems={CUSTOMER_NAV}
        activeKey={activeKeyFromPath(pathname)}
        user={user}
        onLogout={handleLogout}
        roleSwitch={roleSwitch}
        guest={isShop && !authed}
        bare={isShop}
        bottomNav
        fullWidth={!isShop}
        contentClassName={isShop ? "" : "bg-canvas"}
        ctaLabel={isShop ? undefined : "New list"}
        ctaHref={isShop ? undefined : "/shop"}
        shopBag
      >
        {isShop ? (
          <ShopShell>{children}</ShopShell>
        ) : (
          <RequireAuth roles={["CUSTOMER", "AGENT"]} agentMode="customer">
            {children}
          </RequireAuth>
        )}
      </AppShell>
    </ShopProvider>
  );
}
