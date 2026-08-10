import { useState } from "react";
import AppShell from "./components/AppShell";
import Settings from "./Settings";
import AdminDashboard from "./AdminDashboard";
import AdminOrders from "./AdminOrders";
import AdminMarkets from "./AdminMarkets";
import AdminAgents from "./AdminAgents";
import AdminUsers from "./AdminUsers";
import AdminFloat from "./AdminFloat";
import AdminAnalytics from "./AdminAnalytics";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "chart" },
  { key: "orders", label: "Orders", icon: "basket" },
  { key: "markets", label: "Markets", icon: "store" },
  { key: "agents", label: "Agents", icon: "user" },
  { key: "users", label: "Users", icon: "flag" },
  { key: "float", label: "Float", icon: "wallet" },
  { key: "analytics", label: "Analytics", icon: "trending" },
];

// Admin has no roleSwitch (never dual-mode like an agent) and no onboarding
// gate (bootstrap_admin never sets a name) - straight to the shell.
function AdminHome({ user, onLogout, onUserUpdated }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [openOrderId, setOpenOrderId] = useState(null);

  function handleNavigate(key) {
    setActiveTab(key);
    setOpenOrderId(null);
  }

  return (
    <AppShell
      navItems={NAV_ITEMS}
      activeKey={activeTab}
      onNavigate={handleNavigate}
      user={user}
      onLogout={onLogout}
    >
      {activeTab === "dashboard" && <AdminDashboard onNavigate={setActiveTab} />}
      {activeTab === "orders" && (
        <AdminOrders openOrderId={openOrderId} onOpenOrder={setOpenOrderId} />
      )}
      {activeTab === "markets" && <AdminMarkets />}
      {activeTab === "agents" && <AdminAgents />}
      {activeTab === "users" && <AdminUsers />}
      {activeTab === "float" && <AdminFloat />}
      {activeTab === "analytics" && <AdminAnalytics />}
      {activeTab === "settings" && (
        <Settings user={user} onUserUpdated={onUserUpdated} onLogout={onLogout} />
      )}
    </AppShell>
  );
}

export default AdminHome;
