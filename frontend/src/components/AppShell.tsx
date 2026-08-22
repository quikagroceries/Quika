"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import MobileDrawer from "./MobileDrawer";
import MobileBottomNav from "./MobileBottomNav";
import PageContainer from "./PageContainer";

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
  children,
}: any) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    // Always a flex row (not just from md up) - Sidebar collapses to
    // nothing below md via its own `hidden` class, so this stays visually
    // identical there, but it means the content column's `flex-1` actually
    // takes effect on mobile too instead of silently no-op'ing outside a
    // flex context, which is what let the canvas color show through below
    // short content instead of the page's real background reaching the
    // bottom-nav's reserved space.
    <div className="flex min-h-screen flex-col bg-canvas md:flex-row">
      <Sidebar
        navItems={navItems}
        activeKey={activeKey}
        user={user}
        onLogout={onLogout}
        roleSwitch={roleSwitch}
        guest={guest}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {!bare && (
          <>
            <MobileHeader onMenuClick={() => setDrawerOpen(true)} />
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
          </>
        )}
        {/* contentClassName's background lives on THIS wrapper, not on
            PageContainer's <main> - the bottom-nav reserve (`pb-16`) is
            padding on this element, so putting the color here instead of
            one level in covers that reserved strip too, instead of leaving
            it to show the canvas color behind the fixed tab bar. */}
        <div className={"flex flex-1 flex-col " + (bottomNav ? "pb-16 md:pb-0" : "") + " " + contentClassName}>
          {bare ? children : (
            <PageContainer full={fullWidth} className="flex-1">
              {children}
            </PageContainer>
          )}
        </div>
        {bottomNav && <MobileBottomNav navItems={navItems} activeKey={activeKey} />}
      </div>
    </div>
  );
}

export default AppShell;
