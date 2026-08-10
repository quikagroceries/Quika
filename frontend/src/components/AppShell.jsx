import { useState } from "react";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import MobileDrawer from "./MobileDrawer";
import PageContainer from "./PageContainer";

// The dashboard shell every authenticated screen renders through:
//   lg:+  full sidebar (260px) + content
//   md:   icon rail (72px) + content
//   <md:  top bar with hamburger + slide-out drawer, content full-width
// navItems/activeKey/onNavigate are role-specific and owned by the caller
// (Orders.jsx, CustomerHome.jsx) - this component only renders the chrome.
function AppShell({ navItems, activeKey, onNavigate, user, onLogout, roleSwitch, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleNavigate(key) {
    onNavigate(key);
    setDrawerOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar
        navItems={navItems}
        activeKey={activeKey}
        onNavigate={onNavigate}
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
          onNavigate={handleNavigate}
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
