/**
 * Two completely separate sign-in sessions: the main app (customers, agents)
 * and the admin portal. They never share a token, a storage slot, or a
 * redirect - being signed into one tells the other nothing.
 *
 *  - customer: persistent (localStorage), long-lived.
 *  - admin:    per-tab (sessionStorage, gone when the tab/browser closes),
 *              and the backend expires it after an hour regardless.
 *
 * Which one is "current" is decided purely by the page you're on.
 */
export type Realm = "admin" | "customer";

const CUSTOMER_KEY = "qyka_token";
const ADMIN_KEY = "qyka_admin_token";

// /admin/* and the hidden admin sign-in page, which is a single 64-character
// alphanumeric path (its name is deliberately not written down in this code).
export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/") || /^\/[A-Za-z0-9]{64}$/.test(pathname);
}

export function currentRealm(): Realm {
  if (typeof window === "undefined") return "customer";
  return isAdminPath(window.location.pathname) ? "admin" : "customer";
}

function store(realm: Realm): Storage {
  return realm === "admin" ? window.sessionStorage : window.localStorage;
}

export function getToken(realm: Realm = currentRealm()): string | null {
  if (typeof window === "undefined") return null;
  try {
    return store(realm).getItem(realm === "admin" ? ADMIN_KEY : CUSTOMER_KEY);
  } catch {
    return null;
  }
}

export function saveToken(realm: Realm, token: string): void {
  store(realm).setItem(realm === "admin" ? ADMIN_KEY : CUSTOMER_KEY, token);
}

export function clearToken(realm: Realm): void {
  try {
    store(realm).removeItem(realm === "admin" ? ADMIN_KEY : CUSTOMER_KEY);
  } catch {
    /* storage unavailable */
  }
}
