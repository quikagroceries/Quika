// Every nav surface (Sidebar, MobileDrawer, MobileBottomNav) uses the single
// brand-orange accent for its active state now — no more a distinct hue per
// destination. That per-item `color` field used to exist for exactly that
// rainbow effect; dropped when the app moved to "peach is the one dominant
// accent, olive is a rare success-only accent" (see memory: peach-dominant).
export const CUSTOMER_NAV = [
  { key: "shop", label: "Shop", icon: "store", href: "/shop" },
  // "Orders" = Track + History in one: what's on the move, what's finished,
  // and unsent lists (key stays "track" - the route and nav art are keyed on it).
  { key: "track", label: "Orders", icon: "pin", href: "/track" },
  { key: "messages", label: "Messages", icon: "chat", href: "/messages" },
  { key: "wallet", label: "Wallet", icon: "wallet", href: "/wallet" },
  { key: "settings", label: "Settings", icon: "settings", href: "/settings" },
];

/** Account-only links — used in shop header menu (not a permanent shop rail). */
export const ACCOUNT_NAV = [
  { key: "track", label: "Orders", icon: "pin", href: "/track" },
  { key: "wallet", label: "Wallet", icon: "wallet", href: "/wallet" },
  { key: "settings", label: "Settings", icon: "settings", href: "/settings" },
];

/** @deprecated Guests must not get a sidebar on /shop — use ShopShell instead. */
export const GUEST_NAV: typeof CUSTOMER_NAV = [];

export const AGENT_NAV = [
  { key: "home", label: "Home", icon: "basket", href: "/agent" },
  { key: "history", label: "History", icon: "clock", href: "/agent/history" },
  { key: "messages", label: "Messages", icon: "chat", href: "/agent/messages" },
  { key: "dashboard", label: "Dashboard", icon: "wallet", href: "/agent/dashboard" },
  { key: "settings", label: "Settings", icon: "settings", href: "/agent/settings" },
];

export const ADMIN_NAV = [
  { key: "dashboard", label: "Dashboard", icon: "chart", href: "/admin" },
  { key: "orders", label: "Orders", icon: "basket", href: "/admin/orders" },
  { key: "markets", label: "Markets", icon: "store", href: "/admin/markets" },
  { key: "agents", label: "Agents", icon: "user", href: "/admin/agents" },
  { key: "riders", label: "Riders", icon: "bike", href: "/admin/riders" },
  { key: "users", label: "Users", icon: "flag", href: "/admin/users" },
  { key: "float", label: "Float", icon: "wallet", href: "/admin/float" },
  { key: "analytics", label: "Analytics", icon: "trending", href: "/admin/analytics" },
  { key: "admins", label: "Admins", icon: "shield", href: "/admin/admins" },
  { key: "settings", label: "Settings", icon: "settings", href: "/admin/settings" },
];
