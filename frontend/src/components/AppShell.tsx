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
  children,
}: any) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas md:flex">
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
        <div className={bottomNav ? "pb-16 md:pb-0" : ""}>
          {bare ? children : <PageContainer>{children}</PageContainer>}
        </div>
        {bottomNav && <MobileBottomNav navItems={navItems} activeKey={activeKey} />}
      </div>
    </div>
  );
}

export default AppShell;
