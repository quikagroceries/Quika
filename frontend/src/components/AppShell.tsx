"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import MobileDrawer from "./MobileDrawer";
import PageContainer from "./PageContainer";

// navItems: [{ key, label, icon, href }]
// activeKey matches item.key for highlight
function AppShell({ navItems, activeKey, user, onLogout, roleSwitch, children }: any) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar
        navItems={navItems}
        activeKey={activeKey}
        user={user}
        onLogout={onLogout}
        roleSwitch={roleSwitch}
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
        />
        <PageContainer>{children}</PageContainer>
      </div>
    </div>
  );
}

export default AppShell;
