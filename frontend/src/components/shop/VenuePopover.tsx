"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  searchAddressApi,
  reverseGeocodeCoordinates,
  getPopularLocations,
  trackLocationSearch,
  type LocationSuggestion,
} from "@/lib/locationService";

const RECENT_KEY = "qyka_recent_venues";

export function rememberVenue(id: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    const next = [id, ...ids.filter((x: string) => x !== id)].slice(0, 4);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/**
 * Anchored location editor with live API search & GPS reverse geocoding.
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [popularLocations, setPopularLocations] = useState<
    Array<{ mainText: string; secondaryText: string; fullAddress: string }>
  >([]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    function place() {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const width = Math.min(Math.max(Math.max(r.width, 340), 380), 440);
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
      setGeoError("");
      setQuery("");
      setSuggestions([]);
      getPopularLocations().then(setPopularLocations);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

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

  // Debounced address search API
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const res = await searchAddressApi(trimmed, controller.signal);
        setSuggestions(res);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function selectLocation(loc: { fullAddress: string; lat?: number; lng?: number }) {
    onAddressChange(loc.fullAddress);
    trackLocationSearch(loc);
    if (loc.lat && loc.lng) {
      onDeliveryCoordsChange({ lat: loc.lat, lng: loc.lng });
    } else {
      onDeliveryCoordsChange(null);
    }
    onClose();
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoError("Location is not available in this browser.");
      return;
    }
    setGeoBusy(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          const lat = p.coords.latitude;
          const lng = p.coords.longitude;
          const resolved = await reverseGeocodeCoordinates(lat, lng);
          selectLocation({ fullAddress: resolved.fullAddress, lat, lng });
        } catch {
          selectLocation({
            fullAddress: "Current Location, Lagos",
            lat: p.coords.latitude,
            lng: p.coords.longitude,
          });
        } finally {
          setGeoBusy(false);
        }
      },
      (err) => {
        setGeoBusy(false);
        setGeoError(
          err.code === 1
            ? "Location permission was denied. Please allow location access in your browser."
            : "Could not retrieve location. Please check your connection."
        );
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  if (!open || !pos) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-xs" aria-hidden onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Choose your delivery location"
        style={{ top: pos.top, left: pos.left, width: pos.width }}
        className="fixed z-50 overflow-hidden rounded-3xl border border-line bg-surface p-4 shadow-2xl ring-1 ring-black/10"
      >
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h3 className="font-display text-sm font-bold text-ink">Delivery Location</h3>
            <p className="text-[11px] text-muted">Where should your concierge deliver your items?</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-sunken hover:text-ink text-xs font-bold"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Live Search Input */}
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="M20 20l-3-3" />
              </svg>
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search street, area, or landmark…"
              className="h-10 w-full rounded-xl border border-line bg-sunken-2 pl-9 pr-8 text-xs font-semibold text-ink placeholder:text-muted focus:border-brand-orange focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted hover:text-ink"
              >
                ✕
              </button>
            )}
          </div>

          {/* GPS Location Button */}
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={geoBusy}
            className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface p-2.5 text-left transition hover:bg-sunken-2 disabled:opacity-60"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken-2 text-ink ring-1 ring-line">
              {geoBusy ? (
                <svg className="h-3.5 w-3.5 animate-spin text-ink" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                  <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ink">
                {geoBusy ? "Detecting GPS location…" : "Use current GPS location"}
              </p>
              <p className="text-[10px] text-muted">Auto-resolve street & neighbourhood</p>
            </div>
          </button>

          {geoError && (
            <div className="rounded-lg border border-[#A23B36]/20 bg-[#F7E3E1] p-2 text-[11px] font-medium text-[#5C201D]">
              {geoError}
            </div>
          )}

          {/* Autocomplete Search Results */}
          {searching && (
            <div className="flex items-center justify-center py-4 text-xs text-muted">
              <svg className="mr-2 h-3.5 w-3.5 animate-spin text-muted" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Searching locations in Nigeria…
            </div>
          )}

          {!searching && suggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Search Results</p>
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectLocation(s)}
                  className="flex w-full items-start gap-2.5 rounded-xl p-2 text-left transition hover:bg-sunken-2"
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-sunken text-muted">
                    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current text-brand-orange-dark" aria-hidden="true">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-ink">{s.mainText}</p>
                    <p className="truncate text-[10px] text-muted">{s.secondaryText}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Popular Areas */}
          {!query && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                Popular Areas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {popularLocations.map((pop) => (
                  <button
                    key={pop.fullAddress}
                    type="button"
                    onClick={() => selectLocation({ fullAddress: pop.fullAddress })}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink shadow-2xs transition hover:bg-sunken-2 active:scale-95"
                  >
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 shrink-0 fill-current text-brand-orange-dark" aria-hidden="true">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                    </svg>
                    {pop.mainText}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default VenuePopover;
