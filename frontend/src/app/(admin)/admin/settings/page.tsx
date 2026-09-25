"use client";

import { useEffect, useState } from "react";
import Settings from "@/screens/Settings";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
import SectionHeader from "@/components/SectionHeader";
import ChangePasswordForm from "@/components/admin/ChangePasswordForm";
import { api } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

// The one thing an admin's own Settings page needs that the shared screen
// (profile + account, identical for customer/agent/admin) doesn't cover:
// whether the API is actually reachable right now. Real data (a live ping),
// not decoration - there's no fabricated "environment"/version badge here
// because the backend doesn't expose one to check against.
function SystemStatusCard() {
  const [status, setStatus] = useState<"checking" | "ok" | "down">("checking");
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  function check() {
    setStatus("checking");
    api.getHealth()
      .then(() => { setStatus("ok"); setCheckedAt(new Date()); })
      .catch(() => { setStatus("down"); setCheckedAt(new Date()); });
  }

  useEffect(() => {
    check();
  }, []);

  const tone =
    status === "ok" ? "bg-brand-green/10 text-brand-green"
    : status === "down" ? "bg-red-100 text-red-700"
    : "bg-sunken text-muted";
  const dot =
    status === "ok" ? "bg-brand-green"
    : status === "down" ? "bg-red-600"
    : "bg-faint";
  const label = status === "ok" ? "API reachable" : status === "down" ? "API unreachable" : "Checking…";

  return (
    <Card>
      <SectionHeader icon="settings" title="System" className="mb-4" />
      <div className="flex items-center justify-between">
        <span className={"inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold " + tone}>
          <span className={"h-1.5 w-1.5 rounded-full " + dot} />
          {label}
        </span>
        <button
          type="button"
          onClick={check}
          disabled={status === "checking"}
          className="flex h-9 w-9 items-center justify-center rounded-full text-faint transition hover:bg-sunken hover:text-ink disabled:opacity-40"
          aria-label="Check again"
        >
          <Icon name="clock" className="h-4 w-4" />
        </button>
      </div>
      {checkedAt && (
        <p className="mt-2 text-xs text-faint">
          Last checked {checkedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </p>
      )}
    </Card>
  );
}

function PasswordCard() {
  return (
    <Card>
      <SectionHeader icon="shield" title="Password" subtitle="Used with your email at the admin sign-in page." className="mb-4" />
      <ChangePasswordForm />
    </Card>
  );
}

export default function Page() {
  const { user, setUser, handleLogout } = useAuth();
  return (
    <Settings
      user={user}
      onUserUpdated={setUser}
      onLogout={handleLogout}
      extra={<><PasswordCard /><SystemStatusCard /></>}
    />
  );
}
