"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import MobileDrawer from "./MobileDrawer";
import PageContainer from "./PageContainer";

/** Account / agent / admin shell — sidebar nav. Shop uses ShopShell instead. */
function AppShell({ navItems, activeKey, user, onLogout, roleSwitch, guest = false, children }: any) {
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
        <PageContainer>{children}</PageContainer>
      </div>
    </div>
  );
}

export default AppShell;
