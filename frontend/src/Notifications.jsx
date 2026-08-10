import { useState, useEffect } from "react";
import { api } from "./api";
import Button from "./components/Button";
import Input from "./components/Input";

const POLL_MS = 10000;

// Real kinds emitted today: payment_due, item_unavailable, order_cancelled,
// item_decided (see notif_service.send() callers across app/orders/). This
// component is shared by both the customer and agent screens — item_decided
// only ever goes to the order's agent, overage_approval only ever goes to
// the customer (see jit.service.pay_vendor's 402 branch), so there's no
// cross-role leakage even though both render through the same feed.
function kindLabel(kind) {
  switch (kind) {
    case "payment_due": return "Payment due";
    case "item_unavailable": return "Item unavailable";
    case "order_cancelled": return "Order cancelled";
    case "item_decided": return "Customer decision";
    case "overage_approval": return "Approval needed";
    default: return kind;
  }
}

function Notifications() {
  const [unread, setUnread] = useState([]);
  const [overageAmount, setOverageAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function poll() {
    try {
      const all = await api.getNotifications();
      setUnread(all.filter((n) => !n.is_read));
    } catch {
      // A failed poll shouldn't interrupt whatever screen the customer is on.
    }
  }

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, []);

  async function handleDismiss(noteId) {
    setBusy(true);
    try {
      await api.markRead(noteId);
      setUnread((cur) => cur.filter((n) => n.id !== noteId));
    } catch (e) {
      setError("Could not dismiss: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleApproveOverage(note) {
    setBusy(true);
    try {
      await api.raiseCap(note.order_id, overageAmount);
      await api.markRead(note.id);
      setUnread((cur) => cur.filter((n) => n.id !== note.id));
      setOverageAmount("");
    } catch (e) {
      setError("Could not approve: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  if (unread.length === 0) return null;

  // The API already orders created_at desc, so index 0 is the newest.
  const note = unread[0];

  return (
    <div className="fixed inset-x-4 top-5 z-[1000] mx-auto max-w-md overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5">
      <div className="h-1.5 bg-brand-orange" />
      <div className="p-4">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-orange">
          {kindLabel(note.kind)}
        </div>
        <p className="text-slate-800">{note.message}</p>

        {error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        {note.kind === "overage_approval" && (
          <div className="mt-3 space-y-2">
            <Input
              placeholder="Amount to approve (₦)"
              value={overageAmount}
              onChange={(e) => setOverageAmount(e.target.value)}
            />
            <Button
              onClick={() => handleApproveOverage(note)}
              busy={busy}
              disabled={!overageAmount}
              fullWidth
            >
              Approve
            </Button>
          </div>
        )}

        <Button
          variant="neutral"
          onClick={() => handleDismiss(note.id)}
          busy={busy}
          fullWidth
          className="mt-3"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

export default Notifications;
