"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import ShopHeader from "./shop/ShopHeader";
import { useShopOptional } from "./shop/ShopContext";
import MobileDrawer from "./MobileDrawer";
import MobileBottomNav from "./MobileBottomNav";
import DesktopTopBar from "./DesktopTopBar";
import PageContainer from "./PageContainer";
import PageBackgroundAccents from "./PageBackgroundAccents";
import ShopBag from "./shop/ShopBag";
import ChatDock from "./chat/ChatDock";
import { ChatProvider } from "./chat/ChatContext";
import { PageSearchProvider } from "./PageSearchContext";

/**
 * Account / agent / admin / shop shell — sidebar nav, adaptive:
 * a labeled sidebar on desktop, an icon rail once space is tight, and a
 * hamburger + slide-in drawer below md. `bare` lets a section (Shop) own its
 * own sticky top bar and mobile nav instead of AppShell's generic
 * MobileHeader/MobileDrawer/PageContainer — it still gets the desktop
 * sidebar, just none of the chrome meant for plain content pages, so two
 * top bars (or two mobile menus) never stack. `bottomNav` adds the fixed
 * mobile tab bar (opt-in, not agent/admin's problem) — it composes with
 * `bare` fine since it's a sibling, not part of either content path.
 */
function AppShell({
  navItems,
  activeKey,
  user,
  onLogout,
  roleSwitch,
  guest = false,
  bare = false,
  bottomNav = false,
  fullWidth = false,
  contentClassName = "",
  ctaLabel,
  ctaHref,
  shopBag = false,
  children,
}: any) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Customer pages (inside a ShopProvider) use the shop's header on a phone -
  // one persistent header across the whole customer app. Agent/admin have no
  // shop context, so they keep the plain mobile header.
  const hasShop = Boolean(useShopOptional());
  const router = useRouter();
  const pathname = usePathname();

  // Warm every nav destination once the frame is up, so tapping a tab renders
  // from an already-loaded route instead of fetching its code on the tap.
  useEffect(() => {
    navItems.forEach((i: any) => router.prefetch(i.href));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the nav list is static per shell
  }, []);
  const title = navItems.find((i: any) => i.key === activeKey)?.label;

  const content = (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* The customer header is ONE element for every customer route (kept
          mounted across navigation): full on /shop (`bare`), phone-only
          elsewhere where the desktop top bar takes over. */}
      {hasShop && <ShopHeader mobileOnly={!bare} />}
      {!bare && (
        <>
          {!hasShop && <MobileHeader onMenuClick={bottomNav ? undefined : () => setDrawerOpen(true)} />}
          <DesktopTopBar title={title} ctaLabel={ctaLabel} ctaHref={ctaHref} />
          {!bottomNav && (
            <MobileDrawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              navItems={navItems}
              activeKey={activeKey}
              user={user}
              onLogout={onLogout}
              roleSwitch={roleSwitch}
              guest={guest}
            />
          )}
        </>
      )}
      {/* contentClassName's background lives on THIS wrapper, not on
          PageContainer's <main> - the bottom-nav reserve (`pb-16`) is
          padding on this element, so putting the color here instead of
          one level in covers that reserved strip too, instead of leaving
          it to show the canvas color behind the fixed tab bar. */}
      {/* `pb-24` (was `pb-16`) - the tab bar now floats with a bottom
          margin instead of sitting flush against the screen edge, so
          the reserved strip needs to clear the bar's height PLUS that
          margin and shadow, not just the bar's own height. */}
      <div className={"relative z-0 flex flex-1 flex-col " + (bottomNav ? "pb-24 md:pb-0" : "") + " " + contentClassName}>
        {!bare && <PageBackgroundAccents activeKey={activeKey} />}
        {bare ? children : (
          // `key` restarts the short fade-in per page while the frame stays put.
          <PageContainer key={pathname} full={fullWidth} className="relative z-10 flex-1 animate-page-in">
            {children}
          </PageContainer>
        )}
      </div>
      {bottomNav && <MobileBottomNav navItems={navItems} activeKey={activeKey} />}
    </div>
  );

  return (
    // Always a flex row (not just from md up) - Sidebar collapses to
    // nothing below md via its own `hidden` class, so this stays visually
    // identical there, but it means the content column's `flex-1` actually
    // takes effect on mobile too instead of silently no-op'ing outside a
    // flex context, which is what let the canvas color show through below
    // short content instead of the page's real background reaching the
    // bottom-nav's reserved space.
    //
    // `ChatProvider` + `ChatDock` sit here (not scoped behind a prop like
    // `shopBag` is) - unlike the bag, which needs `ShopProvider` further up
    // the tree and so only makes sense on customer routes, chat has no such
    // dependency and is used from both the customer (OrderDetail) and agent
    // (Shopping) sides. Always available, costs nothing when no page's
    // ChatPanel has registered an order (ChatDock renders null then).
    // `flex-1` on this row (not just `shopBag`'s) is what lets ChatDock's
    // desktop width-animation actually push `content` narrower - the same
    // reason ShopBag needs to be a flex sibling of it too.
    <ChatProvider>
      <PageSearchProvider>
      <div className="flex min-h-screen flex-col bg-canvas md:flex-row">
        <Sidebar
          navItems={navItems}
          activeKey={activeKey}
          user={user}
          onLogout={onLogout}
          roleSwitch={roleSwitch}
          guest={guest}
        />

        <div className="flex min-w-0 flex-1 md:flex-row">
          {content}
          {shopBag && <ShopBag />}
          <ChatDock />
        </div>
      </div>
      </PageSearchProvider>
    </ChatProvider>
  );
}

export default AppShell;
