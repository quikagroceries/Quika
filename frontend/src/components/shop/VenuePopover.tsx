"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

const RECENT_KEY = "quika_recent_venues";

function loadRecentIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function rememberVenue(id: string) {
  if (typeof window === "undefined") return;
  const next = [id, ...loadRecentIds().filter((x) => x !== id)].slice(0, 4);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

/**
 * Anchored location editor — not a modal. Page stays visible; light dim behind.
 * Venue/market switching lives on the market-browse screen, not here.
 */
function VenuePopover({
  open,
  onClose,
  anchorRef,
  address,
  onAddressChange,
  onDeliveryCoordsChange,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  address: string;
  onAddressChange: (a: string) => void;
  onDeliveryCoordsChange: (c: { lat: number; lng: number } | null) => void;
}) {
  const { user } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState(address);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const saved = user?.default_delivery_address || "";

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    function place() {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = Math.min(Math.max(Math.max(r.width, 320), 360), 400);
      let left = r.left;
      if (left + width > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - width - 12);
      }
      setPos({ top: r.bottom + 8, left, width });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (open) {
      setEditingAddress(false);
      setAddressDraft(address);
      setGeoError("");
    }
  }, [open, address]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoError("Location isn’t available in this browser.");
      return;
    }
    setGeoBusy(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        onDeliveryCoordsChange({ lat: p.coords.latitude, lng: p.coords.longitude });
        onAddressChange("Current location");
        setEditingAddress(false);
        setGeoBusy(false);
      },
      () => {
        setGeoError("Couldn’t get your location. Check permissions.");
        setGeoBusy(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  if (!open || !pos) return null;

  const deliverLabel = address.trim() || "Add delivery area";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/15" aria-hidden onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Choose your location"
        style={{ top: pos.top, left: pos.left, width: pos.width }}
        className="fixed z-50 overflow-hidden rounded-2xl border border-[#ebe7e0] bg-white shadow-[0_16px_40px_rgba(33,26,20,0.14)]"
      >
        <div className="px-3 pb-3 pt-2.5">
          <p className="px-0.5 pb-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#8a8178]">
            Your location
          </p>
          {!editingAddress ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#faf9f7] text-brand-green ring-1 ring-[#ebe7e0]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                </svg>
              </span>
              <button
                type="button"
                onClick={() => {
                  setAddressDraft(address);
                  setEditingAddress(true);
                }}
                className="min-w-0 flex-1 truncate text-left text-sm text-ink"
              >
                <span className="block truncate font-semibold">{deliverLabel}</span>
                <span className="text-xs text-[#8a8178]">Tap to change</span>
              </button>
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={geoBusy}
                className="shrink-0 rounded-full border border-brand-orange/30 bg-brand-orange/[0.06] px-3 py-1.5 text-xs font-bold text-brand-orange transition hover:bg-brand-orange/10 disabled:opacity-50"
              >
                {geoBusy ? "Locating…" : "Use current location"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                autoFocus
                value={addressDraft}
                onChange={(e) => setAddressDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && addressDraft.trim()) {
                    onAddressChange(addressDraft.trim());
                    onDeliveryCoordsChange(null);
                    setEditingAddress(false);
                  }
                }}
                placeholder="e.g. Ikeja, Lagos"
                className="w-full rounded-lg border border-[#ebe7e0] bg-[#f7f5f2] px-2.5 py-2 text-sm text-ink outline-none focus:border-brand-orange focus:bg-white"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!addressDraft.trim()) return;
                    onAddressChange(addressDraft.trim());
                    onDeliveryCoordsChange(null);
                    setEditingAddress(false);
                  }}
                  disabled={!addressDraft.trim()}
                  className="rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAddress(false)}
                  className="text-xs font-semibold text-[#8a8178]"
                >
                  Cancel
                </button>
                {saved && (
                  <button
                    type="button"
                    onClick={() => setAddressDraft(saved)}
                    className="ml-auto truncate text-xs font-semibold text-brand-orange"
                  >
                    Use saved
                  </button>
                )}
              </div>
            </div>
          )}
          {geoError && <p className="mt-1.5 text-xs text-red-600">{geoError}</p>}
        </div>
      </div>
    </>
  );
}

export default VenuePopover;
