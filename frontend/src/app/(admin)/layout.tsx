"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import AppShell from "@/components/AppShell";
import AuthShell from "@/components/AuthShell";
import ChangePasswordForm from "@/components/admin/ChangePasswordForm";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import { ADMIN_NAV } from "@/lib/nav";

function activeKeyFromPath(pathname) {
  if (pathname.startsWith("/admin/orders")) return "orders";
  if (pathname.startsWith("/admin/markets")) return "markets";
  if (pathname.startsWith("/admin/agents")) return "agents";
  if (pathname.startsWith("/admin/riders")) return "riders";
  if (pathname.startsWith("/admin/users")) return "users";
  if (pathname.startsWith("/admin/float")) return "float";
  if (pathname.startsWith("/admin/analytics")) return "analytics";
  if (pathname.startsWith("/admin/admins")) return "admins";
  if (pathname.startsWith("/admin/settings")) return "settings";
  return "dashboard";
}

// An admin added by another admin signs in on a temporary password; every
// admin endpoint refuses them until they replace it (backend
// core/security.py::require_role), so show nothing but this until they do.
function FirstPasswordGate({ onDone, onLogout }) {
  return (
    <AuthShell size="sm">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Set your password</h1>
          <p className="mt-1 text-sm text-ink/60">
            You signed in with a temporary password. Choose your own to continue.
          </p>
        </div>
        <ChangePasswordForm onChanged={onDone} submitLabel="Save and continue" />
        <button type="button" onClick={onLogout} className="text-sm text-muted hover:text-ink">
          Log out
        </button>
      </div>
    </AuthShell>
  );
}

// The admin portal signs itself out after this long without any activity, on
// top of the backend expiring its session after an hour.
const ADMIN_IDLE_MS = 30 * 60 * 1000;

function useIdleLogout(active: boolean, onIdle: () => void) {
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(onIdle, ADMIN_IDLE_MS);
    };
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [active, onIdle]);
}

export default function AdminLayout({ children }: any) {
  const { user, setUser, handleLogout } = useAuth();
  const pathname = usePathname();
  useIdleLogout(!!user, handleLogout);

  return (
    <RequireAuth roles={["ADMIN"]}>
      {user?.must_change_password ? (
        <FirstPasswordGate onDone={() => api.me().then(setUser)} onLogout={handleLogout} />
      ) : (
        <AppShell
          navItems={ADMIN_NAV}
          activeKey={activeKeyFromPath(pathname)}
          user={user}
          onLogout={handleLogout}
          fullWidth
          contentClassName="bg-canvas"
        >
          {children}
        </AppShell>
      )}
    </RequireAuth>
  );
}
