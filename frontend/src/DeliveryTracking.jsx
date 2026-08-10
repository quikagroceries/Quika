import { useEffect, useState } from "react";
import Card from "./components/Card";
import Button from "./components/Button";
import Icon from "./components/Icon";

// Post-payment status screen: a vertical timeline built entirely from the
// order's own timestamps (created_at / agent_assigned_at / paid_at /
// packed_at / dispatched_at / delivered_at) - no map, no API key, no
// "address not located" awkwardness. A live map can slot back in later as
// an optional view once a courier API feeds real position data; until then
// this is the primary (and only) reassurance, and it's honest about what
// this system actually knows.
//
// "Rider assigned / at pickup" and "Out for delivery" share one timestamp
// (dispatched_at) - V1 hands off to the courier and marks the order out for
// delivery in one action, so there's no real in-between moment to record
// separately yet. Both rows still show, they just complete together.
const ROWS = [
  { key: "placed", label: "Order placed", ts: (o) => o.created_at },
  { key: "agent_assigned", label: "Agent assigned & accepted", ts: (o) => o.agent_assigned_at },
  { key: "paid", label: "Balance paid", ts: (o) => o.paid_at },
  { key: "packaging", label: "Packaging", ts: (o) => o.packed_at },
  { key: "packed", label: "Packed", ts: (o) => o.packed_at },
  { key: "rider_assigned", label: "Rider assigned / at pickup", ts: (o) => o.dispatched_at },
  { key: "out_for_delivery", label: "Out for delivery", ts: (o) => o.dispatched_at },
  { key: "delivered", label: "Delivered", ts: (o) => o.delivered_at },
];

const PACKAGING_WINDOW_MS = 10 * 60 * 1000;

function formatRemaining(ms) {
  const overrun = ms < 0;
  const abs = Math.abs(ms);
  const m = Math.floor(abs / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  const clock = `${m}:${String(s).padStart(2, "0")}`;
  return overrun ? `+${clock} over` : clock;
}

function formatTimestamp(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

// The first row with no timestamp yet is "current" - everything before it
// is done (has a timestamp), everything after is still future. Fully
// data-driven, so a stalled/failed step (e.g. packed but dispatch failed)
// correctly parks the timeline there instead of guessing from `status`.
function currentRowIndex(order) {
  for (let i = 0; i < ROWS.length; i++) {
    if (!ROWS[i].ts(order)) return i;
  }
  return -1;
}

function TimelineRow({ label, timestamp, done, current, isLast, children }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold " +
            (done ? "bg-brand-green text-white" : current ? "bg-brand-orange text-white" : "bg-slate-100 text-slate-400")
          }
        >
          {done ? <Icon name="check" className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
        </span>
        {!isLast && <div className={"my-1 w-0.5 flex-1 rounded-full " + (done ? "bg-brand-green" : "bg-slate-200")} />}
      </div>
      <div className={"min-w-0 flex-1 " + (isLast ? "" : "pb-5")}>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <p className={"font-semibold " + (done || current ? "text-slate-900" : "text-slate-400")}>{label}</p>
          {done && <span className="shrink-0 text-xs text-slate-400">{formatTimestamp(timestamp)}</span>}
          {current && (
            <span className="shrink-0 rounded-full bg-brand-orange/10 px-2 py-0.5 text-xs font-bold text-brand-orange">
              In progress
            </span>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

function DeliveryTracking({ order, onConfirmDelivery, busy }) {
  // Seeded null (never Date.now() during render, which is impure) - the
  // interval below fills in a real clock reading within a second of mount,
  // fine for a soft guidance countdown.
  const [now, setNow] = useState(null);
  const [preview, setPreview] = useState(null);
  // Confirming delivery releases the agent's payout - a deliberate two-step
  // tap, not a single button sitting there ready to mis-tap.
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const startedAt = order.paid_at ? new Date(order.paid_at).getTime() : null;
  const remaining = now != null && startedAt != null ? startedAt + PACKAGING_WINDOW_MS - now : PACKAGING_WINDOW_MS;
  const overrun = remaining < 0;
  const nearOverrun = !overrun && remaining < 2 * 60 * 1000;

  const currentIdx = currentRowIndex(order);
  const packingPhotos = order.packing_photos || [];

  return (
    <Card>
      <p className="mb-4 font-bold text-slate-900">Order status</p>

      <div>
        {ROWS.map((row, i) => {
          const rawTs = row.ts(order);
          const done = !!rawTs;
          const current = i === currentIdx;
          return (
            <TimelineRow
              key={row.key}
              label={row.label}
              timestamp={rawTs}
              done={done}
              current={current}
              isLast={i === ROWS.length - 1}
            >
              {row.key === "packaging" && current && (
                <div className="mt-2 rounded-xl border border-brand-orange/30 bg-brand-orange/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-600">Your agent is preparing your order.</p>
                    <span
                      className={
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold " +
                        (overrun ? "bg-red-100 text-red-700" : nearOverrun ? "bg-amber-100 text-amber-700" : "bg-white text-slate-600")
                      }
                    >
                      {overrun ? formatRemaining(remaining) : `ready in ~${formatRemaining(remaining)}`}
                    </span>
                  </div>
                  {packingPhotos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {packingPhotos.map((src, idx) => (
                        <button key={src + idx} onClick={() => setPreview(src)} className="shrink-0 overflow-hidden rounded-lg">
                          <img src={src} alt="" className="h-16 w-16 object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {row.key === "packed" && done && packingPhotos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {packingPhotos.map((src, idx) => (
                    <button key={src + idx} onClick={() => setPreview(src)} className="shrink-0 overflow-hidden rounded-lg">
                      <img src={src} alt="" className="h-16 w-16 object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {row.key === "rider_assigned" && current && (
                <p className="mt-1 text-sm text-slate-500">Waiting for a rider to pick up your order.</p>
              )}
            </TimelineRow>
          );
        })}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-[1800] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreview(null)}
        >
          <img src={preview} alt="Packing photo" className="max-h-full max-w-full rounded-lg" />
          <button
            onClick={() => setPreview(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <Icon name="close" className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* A short PIN for the customer to hand the rider at pickup -
          verifiable handoff, no rider-side app needed to check it. No
          longer relevant once delivered. */}
      {order.handover_code && order.status !== "delivered" && order.status !== "closed" && (
        <div className="mt-5 rounded-xl border-2 border-dashed border-brand-orange/40 bg-brand-orange/5 p-4 text-center">
          <p className="text-sm font-semibold text-slate-600">Share this code with the rider at handover</p>
          <p className="mt-1 text-3xl font-extrabold tracking-[0.3em] text-brand-orange">{order.handover_code}</p>
        </div>
      )}

      {/* Only ever appears once the order is actually out for delivery -
          never during packaging, and never a one-tap action, since
          confirming releases the agent's payout. */}
      {order.status === "out_for_delivery" && !confirming && (
        <Button onClick={() => setConfirming(true)} fullWidth className="mt-5 text-lg">
          Confirm delivery received
        </Button>
      )}
      {order.status === "out_for_delivery" && confirming && (
        <div className="mt-5 rounded-xl border-2 border-brand-orange bg-white p-4">
          <p className="mb-1 text-sm font-semibold text-slate-800">
            This releases payment to your agent. Confirm you've received everything?
          </p>
          {order.handover_code && (
            <p className="mb-3 text-xs text-slate-500">Your handover code was {order.handover_code} — make sure it matched what the rider gave you.</p>
          )}
          <div className="flex gap-2">
            <Button variant="neutral" onClick={() => setConfirming(false)} disabled={busy} fullWidth>
              Cancel
            </Button>
            <Button onClick={onConfirmDelivery} busy={busy} fullWidth>
              Yes, confirm delivery
            </Button>
          </div>
        </div>
      )}
      {(order.status === "delivered" || order.status === "closed") && (
        <p className="mt-5 rounded-lg bg-brand-green/10 px-3 py-2 text-center text-sm font-semibold text-brand-green">
          Delivered — thanks for shopping with Quika!
        </p>
      )}
    </Card>
  );
}

export default DeliveryTracking;
