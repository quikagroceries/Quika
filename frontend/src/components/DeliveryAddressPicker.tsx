"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Button from "./Button";
import Icon from "./Icon";
import SectionHeader from "./SectionHeader";
import {
  getRecentLocations,
  reverseGeocodeCoordinates,
  saveRecentLocation,
  searchAddressApi,
  trackLocationSearch,
  type LocationSuggestion,
} from "@/lib/locationService";
import type { LatLng, MapPin } from "./DeliveryMap";

const DeliveryMap = dynamic(() => import("./DeliveryMap"), {
  ssr: false,
  loading: () => <div className="h-[320px] animate-pulse bg-sunken-2 lg:h-full" />,
});

function distanceKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// A row in the list under the search box: a place you can tap.
function PlaceRow({ main, secondary, onClick, icon = "pin" }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-sunken-2"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange/15 text-brand-orange-dark">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">{main}</span>
        {secondary && <span className="block truncate text-xs text-muted">{secondary}</span>}
      </span>
    </button>
  );
}

// Step 3's "where to?" as ONE workspace: the map is the main surface, the
// left panel is how you say where (search leads on a phone, the map follows
// it). Typing, GPS, a saved/recent place and a
// pin on the map all drive the same address + coordinates, so whichever the
// customer uses, the others follow. What we'll deliver to - and the way
// forward - stay pinned at the bottom of the panel, next to the controls
// that decide them (not stranded below the map).
function DeliveryAddressPicker({
  address,
  setAddress,
  coords,
  setCoords,
  savedAddress,
  market,
  onContinue,
}: {
  address: string;
  setAddress: (a: string) => void;
  coords: LatLng | null;
  setCoords: (c: LatLng | null) => void;
  savedAddress?: string | null;
  market?: (MapPin & { name: string }) | null;
  onContinue: () => void;
}) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [resolving, setResolving] = useState(false);
  const [recent, setRecent] = useState<LocationSuggestion[]>([]);
  // Suggestions are for what the customer TYPES - not every time the address
  // changes because a map pick or a tapped place filled it in.
  const typedRef = useRef(false);

  useEffect(() => setRecent(getRecentLocations()), []);

  useEffect(() => {
    if (!typedRef.current) return;
    const q = address.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setSearched(false);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      const found = await searchAddressApi(q, ctrl.signal, coords || market || undefined);
      if (ctrl.signal.aborted) return;
      setSuggestions(found);
      setSearched(true);
      setSearching(false);
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [address]); // eslint-disable-line react-hooks/exhaustive-deps -- bias (coords/market) shouldn't re-run the search

  function choose(s: LocationSuggestion) {
    typedRef.current = false;
    setAddress(s.fullAddress);
    setCoords({ lat: s.lat, lng: s.lng });
    setSuggestions([]);
    setSearched(false);
    saveRecentLocation(s);
    trackLocationSearch(s);
    setRecent(getRecentLocations());
  }

  async function chooseSaved(a: string) {
    typedRef.current = false;
    setAddress(a);
    setSuggestions([]);
    // The saved address is text only - find it on the map (best effort).
    const [first] = await searchAddressApi(a, undefined, market || undefined);
    if (first) setCoords({ lat: first.lat, lng: first.lng });
  }

  async function pinPicked(c: LatLng) {
    typedRef.current = false;
    setCoords(c);
    setSuggestions([]);
    setSearched(false);
    setResolving(true);
    const place = await reverseGeocodeCoordinates(c.lat, c.lng);
    setAddress(place.fullAddress);
    setResolving(false);
  }

  function useMyLocation() {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError("Your browser can't share its location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await pinPicked({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setGeoError("Couldn't get your location - allow access, or pick on the map.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function clearAll() {
    typedRef.current = false;
    setAddress("");
    setCoords(null);
    setSuggestions([]);
    setSearched(false);
  }

  const typing = typedRef.current && address.trim().length >= 3;
  const hasAddress = address.trim().length > 0;
  const [main, ...rest] = address.split(",");
  const km = useMemo(() => (coords && market ? distanceKm(coords, market) : null), [coords, market]);
  const recentShown = recent.filter((r) => r.fullAddress !== savedAddress).slice(0, 4);

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-line bg-surface shadow-sm lg:h-[clamp(460px,calc(100vh-22rem),640px)] lg:grid-cols-[420px_minmax(0,1fr)]">
      {/* Panel: how to say where. */}
      <div className="flex min-h-0 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <SectionHeader icon="pin" title="Where should we deliver?" subtitle="Search, use your location, or drop a pin." className="mb-4" />

          <div className="relative">
            <Icon name="pin" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={address}
              onChange={(e) => {
                typedRef.current = true;
                setAddress(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && suggestions[0]) choose(suggestions[0]);
                if (e.key === "Escape") setSuggestions([]);
              }}
              placeholder="e.g. 12 Allen Avenue, Ikeja — a landmark helps"
              aria-label="Delivery address"
              autoComplete="off"
              className="min-h-[44px] w-full rounded-full border border-line-strong bg-surface pl-10 pr-10 text-base text-ink placeholder:text-faint transition-colors focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
            />
            {hasAddress && (
              <button
                type="button"
                onClick={clearAll}
                aria-label="Clear address"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-faint transition hover:bg-sunken-2 hover:text-ink"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3.5 py-2 text-sm font-bold text-ink transition hover:border-brand-orange/40 hover:bg-brand-orange/10 disabled:opacity-60"
          >
            <Icon name="pin" className="h-4 w-4 text-brand-orange-dark" />
            {locating ? "Locating…" : "Use my current location"}
          </button>
          {geoError && <p className="mt-2 text-sm text-red-600">{geoError}</p>}

          {/* One list, one job at a time: results while typing, otherwise the
              places you've used before. In flow (not a floating dropdown) so
              the panel can scroll it without clipping. */}
          <div className="mt-4">
            {typing ? (
              <>
                <p className="mb-1 px-2 text-[0.7rem] font-bold uppercase tracking-wide text-faint">Results</p>
                {searching && suggestions.length === 0 && <p className="px-2 py-3 text-sm text-faint">Searching…</p>}
                {suggestions.map((s) => (
                  <PlaceRow key={s.id} main={s.mainText} secondary={s.secondaryText} onClick={() => choose(s)} />
                ))}
                {searched && !searching && suggestions.length === 0 && (
                  <p className="rounded-2xl bg-sunken-2/70 px-3 py-3 text-sm text-muted">
                    No matches. Try a nearby landmark or area, or tap the map to drop a pin.
                  </p>
                )}
              </>
            ) : (
              (savedAddress || recentShown.length > 0) && (
                <>
                  <p className="mb-1 px-2 text-[0.7rem] font-bold uppercase tracking-wide text-faint">Saved &amp; recent</p>
                  {savedAddress && (
                    <PlaceRow icon="store" main="Saved address" secondary={savedAddress} onClick={() => chooseSaved(savedAddress)} />
                  )}
                  {recentShown.map((r) => (
                    <PlaceRow key={r.id || r.fullAddress} main={r.mainText} secondary={r.secondaryText} onClick={() => choose(r)} />
                  ))}
                </>
              )
            )}
          </div>
        </div>

        {/* Pinned: what we'll deliver to, and the way forward. */}
        <div className="border-t border-dashed border-line-strong p-5">
          <div className="mb-3 flex items-start gap-3 rounded-2xl bg-sunken-2/70 p-3">
            <span
              className={
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full " +
                (coords ? "bg-brand-green/12 text-brand-green" : "bg-brand-orange/15 text-brand-orange-dark")
              }
            >
              <Icon name={coords ? "check" : "pin"} className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-faint">Delivering to</p>
              {hasAddress ? (
                <>
                  <p className="truncate text-sm font-bold text-ink">{main}</p>
                  {rest.length > 0 && <p className="truncate text-xs text-muted">{rest.join(",").trim()}</p>}
                </>
              ) : (
                <p className="text-sm text-muted">Nothing chosen yet.</p>
              )}
              <p className="mt-1 text-xs text-faint">
                {resolving
                  ? "Finding the address for that spot…"
                  : coords
                    ? km != null && market
                      ? `Pin set · ${km < 10 ? km.toFixed(1) : Math.round(km)} km straight-line from ${market.name}`
                      : "Pin set — drag it to fine-tune."
                    : hasAddress
                      ? "No pin yet — tap the map so your rider finds the exact spot."
                      : "Pick a place above, or tap the map."}
              </p>
            </div>
          </div>
          <Button onClick={onContinue} disabled={!hasAddress} fullWidth>
            Continue to estimate
          </Button>
        </div>
      </div>

      {/* Map: the main surface. */}
      <DeliveryMap
        coords={coords}
        onPick={pinPicked}
        market={market}
        className="h-[320px] border-t border-line lg:h-full lg:border-l lg:border-t-0"
      >
        {!coords && (
          <div className="absolute left-3 top-3 rounded-full bg-surface/95 px-3.5 py-2 text-xs font-bold text-ink shadow-md">
            Tap the map to drop your delivery pin
          </div>
        )}
        {resolving && (
          <div className="absolute bottom-3 left-3 rounded-full bg-surface/95 px-3.5 py-2 text-xs font-bold text-muted shadow-md">
            Finding address…
          </div>
        )}
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          aria-label="Use my current location"
          className="pointer-events-auto absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-brand-orange-dark shadow-md transition hover:bg-sunken-2 disabled:opacity-60"
        >
          <Icon name="pin" className="h-5 w-5" />
        </button>
      </DeliveryMap>
    </div>
  );
}

export default DeliveryAddressPicker;
