import { useState } from "react";
import Card from "./Card";
import Icon from "./Icon";

// Phase 1: a clean bought/not-bought checklist for the paid order, with each
// stall's purchase photo (proof of goods) viewable right next to the item it
// covers - via item.vendor_transfer_id, set by jit.service.pay_vendor.
function PurchaseChecklist({ items, purchases }) {
  const [preview, setPreview] = useState(null);
  const photoByTransfer = Object.fromEntries(
    (purchases || []).filter((p) => p.photo_ref).map((p) => [p.id, p.photo_ref])
  );

  return (
    <div>
      <p className="mb-2 font-bold text-slate-900">Bought items</p>
      <div className="space-y-2">
        {items.map((item) => {
          const bought = item.confirmed_price != null;
          const dropped = !bought && item.availability === "dropped";
          const photo = item.vendor_transfer_id ? photoByTransfer[item.vendor_transfer_id] : null;
          return (
            <Card key={item.id} className="flex items-center gap-3 py-3">
              <span
                className={
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full " +
                  (bought ? "bg-brand-green text-white" : "border-2 border-slate-300")
                }
              >
                {bought && <Icon name="check" className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className={"font-semibold " + (bought ? "text-slate-900" : "text-slate-400 " + (dropped ? "line-through" : ""))}>
                  {item.description}
                </div>
                <div className={"text-sm " + (bought ? "font-semibold text-brand-green" : "text-slate-400")}>
                  {bought ? `₦${item.confirmed_price}` : dropped ? "Dropped" : "Not bought"}
                </div>
              </div>
              {photo && (
                <button
                  onClick={() => setPreview(photo)}
                  aria-label="View purchase photo"
                  className="shrink-0 overflow-hidden rounded-lg"
                >
                  <img src={photo} alt="" className="h-12 w-12 object-cover" />
                </button>
              )}
            </Card>
          );
        })}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-[1800] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreview(null)}
        >
          <img src={preview} alt="Purchase proof" className="max-h-full max-w-full rounded-lg" />
          <button
            onClick={() => setPreview(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <Icon name="close" className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}

export default PurchaseChecklist;
