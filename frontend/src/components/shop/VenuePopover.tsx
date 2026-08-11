"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import MarketArt from "@/components/shop/MarketArt";
import { marketTone } from "@/lib/vendorVisuals";
import { useAuth } from "@/components/AuthProvider";
import { DIRECTORY_MARKETS } from "@/lib/marketDirectory";

const RECENT_KEY = "quika_recent_venues";

function coverImageFor(m: any): string {
  const dir = DIRECTORY_MARKETS.find(
    (d) =>
      m.name?.toLowerCase().includes(d.name.toLowerCase().replace(/\s+market$/, "").slice(0, 8)) ||
      d.name.toLowerCase() === (m.name || "").toLowerCase()
  );
  if (dir?.image) return dir.image;
  return (m.venue_type || "") === "supermarket" ? "/quika-cat-pantry.jpg" : "/quika-cat-produce.jpg";
}

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

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function marketCoords(m: any): { lat: number; lng: number } | null {
  const lat = Number(m.latitude);
  const lng = Number(m.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/**
 * Anchored venue switcher — not a modal. Page stays visible; light dim behind.
 */
function VenuePopover({
  open,
  onClose,
  markets,
  currentId,
  onSelect,
  anchorRef,
  address,
  onAddressChange,
  deliveryCoords,
  onDeliveryCoordsChange,
}: {
  open: boolean;
  onClose: () => void;
  markets: any[];
  currentId?: string | null;
  onSelect: (m: any) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  address: string;
  onAddressChange: (a: string) => void;
  deliveryCoords: { lat: number; lng: number } | null;
  onDeliveryCoordsChange: (c: { lat: number; lng: number } | null) => void;
}) {
  const { user } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>([]);
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
      setQ("");
      setRecentIds(loadRecentIds());
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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = markets || [];
    if (!needle) return list;
    return list.filter((m) =>
      [m.name, m.city, m.state].some((v) => String(v || "").toLowerCase().includes(needle))
    );
  }, [markets, q]);

  const withDistance = useMemo(() => {
    if (!deliveryCoords) return filtered.map((m) => ({ m, km: null as number | null }));
    return filtered
      .map((m) => {
        const c = marketCoords(m);
        return { m, km: c ? haversineKm(deliveryCoords, c) : null };
      })
      .sort((a, b) => {
        if (a.km == null && b.km == null) return 0;
        if (a.km == null) return 1;
        if (b.km == null) return -1;
        return a.km - b.km;
      });
  }, [filtered, deliveryCoords]);

  const nearby = useMemo(() => {
    if (!deliveryCoords) return [];
    return withDistance.filter((x) => x.km != null && x.km <= 25).slice(0, 4).map((x) => x.m);
  }, [withDistance, deliveryCoords]);

  const recent = useMemo(() => {
    return recentIds
      .map((id) => filtered.find((m) => m.id === id))
      .filter(Boolean) as any[];
  }, [recentIds, filtered]);

  const current = useMemo(
    () => (currentId ? filtered.find((m) => m.id === currentId) : null),
    [filtered, currentId]
  );

  const locals = filtered.filter((m) => (m.venue_type || "local_market") === "local_market");
  const supers = filtered.filter((m) => m.venue_type === "supermarket");

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

  function Row({ m, hint }: { m: any; hint?: string }) {
    const active = m.id === currentId;
    return (
      <button
        type="button"
        onClick={() => {
          rememberVenue(m.id);
          onSelect(m);
          onClose();
        }}
        className={
          "flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[#f7f5f2] " +
          (active ? "bg-brand-orange/[0.06]" : "")
        }
      >
        <MarketArt
          tone={marketTone(m.name, m.city)}
          title={m.name}
          image={coverImageFor(m)}
          compact
          className="h-9 w-9 shrink-0 rounded-lg"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{m.name}</span>
          <span className="block truncate text-xs text-[#8a8178]">
            {hint ||
              [[m.city, m.state].filter(Boolean).join(", "),
                (m.venue_type || "") === "supermarket" ? "Supermarket" : "Local market",
              ]
                .filter(Boolean)
                .join(" · ")}
          </span>
          {active && (
            <span className="mt-0.5 block text-[0.65rem] font-bold text-brand-orange">
              Currently shopping here
            </span>
          )}
        </span>
        {active && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-orange text-white">
            <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}
      </button>
    );
  }

  function Section({ title, items }: { title: string; items: any[] }) {
    if (!items.length) return null;
    return (
      <div className="py-1">
        <p className="px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#8a8178]">
          {title}
        </p>
        {items.map((m) => (
          <Row key={m.id} m={m} />
        ))}
      </div>
    );
  }

  const deliverLabel = address.trim() || "Add delivery area";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/15" aria-hidden onClick={onClose} />
      <div
        ref={panelRef}
        role="listbox"
        aria-label="Choose venue"
        style={{ top: pos.top, left: pos.left, width: pos.width }}
        className="fixed z-50 max-h-[min(70vh,520px)] overflow-hidden rounded-2xl border border-[#ebe7e0] bg-white shadow-[0_16px_40px_rgba(33,26,20,0.14)]"
      >
        {/* Delivery row — tied to venue choice, not a separate header control */}
        <div className="border-b border-[#ebe7e0] px-3 py-2.5">
          {!editingAddress ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#faf9f7] text-brand-green ring-1 ring-[#ebe7e0]">
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
                <span className="text-[#8a8178]">Deliver to: </span>
                <span className="font-semibold">{deliverLabel}</span>
              </button>
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={geoBusy}
                className="shrink-0 text-xs font-bold text-brand-orange hover:underline disabled:opacity-50"
              >
                {geoBusy ? "…" : "Use current location"}
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

        <div className="border-b border-[#ebe7e0] p-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8178]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="M20 20l-3-3" />
              </svg>
            </span>
            <input
              autoFocus={!editingAddress}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search venues…"
              className="w-full rounded-xl border border-[#ebe7e0] bg-[#f7f5f2] py-2.5 pl-10 pr-3 text-sm text-ink outline-none placeholder:text-[#8a8178] focus:border-brand-orange focus:bg-white focus:ring-2 focus:ring-brand-orange/20"
            />
          </div>
        </div>

        <div className="max-h-[min(52vh,360px)] overflow-y-auto py-1">
          {!filtered.length ? (
            <p className="px-4 py-8 text-center text-sm text-[#8a8178]">No venues match.</p>
          ) : (
            <>
              {current && (
                <div className="py-1">
                  <p className="px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#8a8178]">
                    Currently shopping
                  </p>
                  <Row m={current} />
                </div>
              )}
              <Section title="Nearby" items={nearby.filter((m) => m.id !== currentId)} />
              <Section
                title="Recent"
                items={recent.filter((m) => m.id !== currentId && !nearby.some((n) => n.id === m.id))}
              />
              <Section
                title="Local markets"
                items={locals.filter(
                  (m) =>
                    m.id !== currentId &&
                    !nearby.some((n) => n.id === m.id) &&
                    !recent.some((r) => r.id === m.id)
                )}
              />
              <Section
                title="Supermarkets"
                items={supers.filter(
                  (m) =>
                    m.id !== currentId &&
                    !nearby.some((n) => n.id === m.id) &&
                    !recent.some((r) => r.id === m.id)
                )}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default VenuePopover;
