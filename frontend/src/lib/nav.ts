// `color` is each item's accent for the sidebar's active-state pill/badge —
// a distinct hue per destination (not one brand color stretched across
// everything), same reasoning as the market category filters.
export const CUSTOMER_NAV = [
  { key: "shop", label: "Shop", icon: "store", href: "/shop", color: "#0E7A3C" },
  { key: "track", label: "Track", icon: "pin", href: "/track", color: "#1D6FA5" },
  { key: "history", label: "History", icon: "clock", href: "/history", color: "#8B5E34" },
  { key: "wallet", label: "Wallet", icon: "wallet", href: "/wallet", color: "#B8860B" },
  { key: "settings", label: "Settings", icon: "settings", href: "/settings", color: "#5B6B8C" },
];

/** Account-only links — used in shop header menu (not a permanent shop rail). */
export const ACCOUNT_NAV = [
  { key: "history", label: "History", icon: "clock", href: "/history", color: "#8B5E34" },
  { key: "wallet", label: "Wallet", icon: "wallet", href: "/wallet", color: "#B8860B" },
  { key: "settings", label: "Settings", icon: "settings", href: "/settings", color: "#5B6B8C" },
];

/** @deprecated Guests must not get a sidebar on /shop — use ShopShell instead. */
export const GUEST_NAV: typeof CUSTOMER_NAV = [];

export const AGENT_NAV = [
  { key: "home", label: "Home", icon: "basket", href: "/agent", color: "#0E7A3C" },
  { key: "history", label: "History", icon: "clock", href: "/agent/history", color: "#8B5E34" },
  { key: "dashboard", label: "Dashboard", icon: "wallet", href: "/agent/dashboard", color: "#B8860B" },
  { key: "settings", label: "Settings", icon: "settings", href: "/agent/settings", color: "#5B6B8C" },
];

export const ADMIN_NAV = [
  { key: "dashboard", label: "Dashboard", icon: "chart", href: "/admin", color: "#1D6FA5" },
  { key: "orders", label: "Orders", icon: "basket", href: "/admin/orders", color: "#0E7A3C" },
  { key: "markets", label: "Markets", icon: "store", href: "/admin/markets", color: "#B8860B" },
  { key: "agents", label: "Agents", icon: "user", href: "/admin/agents", color: "#8B5E34" },
  { key: "users", label: "Users", icon: "flag", href: "/admin/users", color: "#C2430F" },
  { key: "float", label: "Float", icon: "wallet", href: "/admin/float", color: "#0E7A87" },
  { key: "analytics", label: "Analytics", icon: "trending", href: "/admin/analytics", color: "#6B4FA0" },
  { key: "settings", label: "Settings", icon: "settings", href: "/admin/settings", color: "#5B6B8C" },
];
