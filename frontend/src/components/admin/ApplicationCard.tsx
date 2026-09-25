'use client';

import Button from "@/components/Button";
import Card from "@/components/Card";
import Icon from "@/components/Icon";

function appliedOn(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// One pending agent or rider application - shared by the Agents and Riders
// admin screens so both read (and respond on a phone) exactly the same way.
// `place` is the market name (agents) or area/market (riders), already
// resolved by the caller.
export default function ApplicationCard({ app, place, busy, onDecide }: any) {
  const details = [place, app.vehicle].filter(Boolean).join(" · ");
  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-ink">{app.full_name || app.phone || "Applicant"}</span>
          {!app.user_id && (
            <span className="rounded-full bg-sunken px-2 py-0.5 text-xs font-bold text-muted">From website</span>
          )}
        </div>
        {app.phone && (
          <a href={`tel:${app.phone}`} className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-brand-orange-dark hover:underline">
            <Icon name="phone" className="h-3.5 w-3.5" /> {app.phone}
          </a>
        )}
        {details && <div className="text-sm text-muted">{details}</div>}
        {app.note && <div className="mt-1 break-words text-sm text-muted">&quot;{app.note}&quot;</div>}
        {app.created_at && <div className="mt-1 text-xs text-faint">Applied {appliedOn(app.created_at)}</div>}
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
        <Button variant="neutral" onClick={() => onDecide(app.id, "reject")} busy={busy} className="text-sm">
          Reject
        </Button>
        <Button onClick={() => onDecide(app.id, "approve")} busy={busy} className="text-sm">
          Approve
        </Button>
      </div>
    </Card>
  );
}
