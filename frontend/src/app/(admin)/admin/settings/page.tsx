"use client";

import { useEffect, useState } from "react";
import Settings from "@/screens/Settings";
import Card from "@/components/Card";
import Icon from "@/components/Icon";
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
    : "bg-[#f0eeeb] text-[#6b635a]";
  const dot =
    status === "ok" ? "bg-brand-green"
    : status === "down" ? "bg-red-600"
    : "bg-[#8a8178]";
  const label = status === "ok" ? "API reachable" : status === "down" ? "API unreachable" : "Checking…";

  return (
    <Card>
      <p className="mb-3 text-sm font-bold uppercase tracking-wide text-[#8a8178]">System</p>
      <div className="flex items-center justify-between">
        <span className={"inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold " + tone}>
          <span className={"h-1.5 w-1.5 rounded-full " + dot} />
          {label}
        </span>
        <button
          type="button"
          onClick={check}
          disabled={status === "checking"}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#8a8178] transition hover:bg-[#f0eeeb] hover:text-ink disabled:opacity-40"
          aria-label="Check again"
        >
          <Icon name="clock" className="h-4 w-4" />
        </button>
      </div>
      {checkedAt && (
        <p className="mt-2 text-xs text-[#8a8178]">
          Last checked {checkedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </p>
      )}
    </Card>
  );
}

export default function Page() {
  const { user, setUser, handleLogout } = useAuth();
  return <Settings user={user} onUserUpdated={setUser} onLogout={handleLogout} extra={<SystemStatusCard />} />;
}
