"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import {
  searchAddressApi,
  reverseGeocodeCoordinates,
  getRecentLocations,
  saveRecentLocation,
  getPopularLocations,
  trackLocationSearch,
  type LocationSuggestion,
} from "@/lib/locationService";

const ADDRESS_STORAGE_KEY = "qyka_customer_delivery_address";

export function HeaderLocationPicker({ className = "" }: { className?: string }) {
  const { user, setUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [recentLocations, setRecentLocations] = useState<LocationSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [popularLocations, setPopularLocations] = useState<
    Array<{ mainText: string; secondaryText: string; fullAddress: string }>
  >([]);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize address from user profile or localStorage
  useEffect(() => {
    if (user?.default_delivery_address) {
      setAddress(user.default_delivery_address);
    } else if (typeof window !== "undefined") {
      const stored = localStorage.getItem(ADDRESS_STORAGE_KEY) || "";
      setAddress(stored);
    }
    setRecentLocations(getRecentLocations());
  }, [user]);

  // Focus search input when opened
  useEffect(() => {
    if (open) {
      setGeoError("");
      setSearchQuery("");
      setSuggestions([]);
      setRecentLocations(getRecentLocations());
      getPopularLocations().then(setPopularLocations);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  // Outside click & Escape listener
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!popoverRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Debounced live API geocoding search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const results = await searchAddressApi(trimmed, controller.signal);
        setSuggestions(results);
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
  }, [searchQuery]);

  // Apply location choice
  async function handleSelectLocation(loc: LocationSuggestion) {
    const full = loc.fullAddress.trim();
    if (!full) return;

    setAddress(full);
    saveRecentLocation(loc);
    trackLocationSearch(loc);
    setRecentLocations(getRecentLocations());

    if (typeof window !== "undefined") {
      localStorage.setItem(ADDRESS_STORAGE_KEY, full);
    }

    if (user) {
      try {
        const updated = await api.updateProfile({ default_delivery_address: full });
        if (updated && setUser) setUser(updated);
      } catch {
        // non-blocking fallback
      }
    }

    setOpen(false);
  }

  // Use GPS location with reverse geocoding
  function handleUseCurrentGPS() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser");
      return;
    }

    setGeoBusy(true);
    setGeoError("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const resolved = await reverseGeocodeCoordinates(lat, lng);
          const suggestion: LocationSuggestion = {
            id: `gps-${lat}-${lng}`,
            mainText: resolved.mainText,
            secondaryText: resolved.secondaryText,
            fullAddress: resolved.fullAddress,
            lat,
            lng,
          };
          await handleSelectLocation(suggestion);
        } catch {
          const fallback: LocationSuggestion = {
            id: `gps-fallback`,
            mainText: "Current Location",
            secondaryText: "Detected via GPS",
            fullAddress: "Current Location, Lagos",
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          await handleSelectLocation(fallback);
        } finally {
          setGeoBusy(false);
        }
      },
      (err) => {
        setGeoBusy(false);
        setGeoError(
          err.code === 1
            ? "Location permission was denied. Please enable location access in your browser."
            : "Could not retrieve location. Please check your network or search your address below."
        );
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  }

  const displayLocation = address || "Select delivery address";

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="group flex h-10 max-w-[11rem] items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-left shadow-xs transition hover:border-line-strong hover:bg-sunken-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 lg:max-w-[14rem]"
        aria-label="Delivery location"
        aria-expanded={open}
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sunken-2 text-ink ring-1 ring-line transition group-hover:scale-105">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">
            Delivering to
          </span>
          <span className="block truncate text-xs font-bold text-ink">
            {displayLocation}
          </span>
        </div>

        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Location Modal / Dropdown */}
      {open && (
        <div className="fixed inset-x-4 top-16 z-50 mx-auto max-w-lg overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl ring-1 ring-black/10 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 sm:w-[420px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h3 className="font-display text-base font-extrabold text-ink">
                Choose Delivery Location
              </h3>
              <p className="text-xs text-muted">
                Where should your personal shopper deliver?
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-sunken-2 hover:text-ink"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Search Input */}
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path strokeLinecap="round" d="M20 20l-3-3" />
                </svg>
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search street, estate, area, or landmark…"
                className="h-11 w-full rounded-2xl border border-line bg-sunken-2 py-2.5 pl-10 pr-10 text-xs font-semibold text-ink placeholder:text-muted focus:border-brand-orange focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-sunken hover:text-ink text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* GPS Button */}
            <button
              type="button"
              onClick={handleUseCurrentGPS}
              disabled={geoBusy}
              className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 text-left shadow-xs transition hover:border-line-strong hover:bg-sunken-2 disabled:opacity-60"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sunken-2 text-ink ring-1 ring-line group-hover:scale-105 transition">
                {geoBusy ? (
                  <svg className="h-4 w-4 animate-spin text-ink" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-ink">
                  {geoBusy ? "Detecting your location…" : "Use current GPS location"}
                </span>
                <span className="block text-[11px] text-muted">
                  {geoBusy ? "Finding your street & neighborhood via satellite" : "Enable location to auto-fill address"}
                </span>
              </div>
            </button>

            {geoError && (
              <div className="rounded-xl border border-[#A23B36]/20 bg-[#F7E3E1] p-3 text-xs font-medium text-[#5C201D]">
                {geoError}
              </div>
            )}

            {/* Live Autocomplete Results */}
            {searching && (
              <div className="flex items-center justify-center py-6 text-xs text-muted">
                <svg className="mr-2 h-4 w-4 animate-spin text-muted" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Searching addresses in Nigeria…
              </div>
            )}

            {!searching && suggestions.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                  Matching Addresses
                </p>
                <div className="space-y-1.5">
                  {suggestions.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => handleSelectLocation(loc)}
                      className="group flex w-full items-start gap-3 rounded-2xl p-2.5 text-left transition hover:bg-sunken-2"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sunken text-muted group-hover:text-ink">
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-ink">{loc.mainText}</p>
                        <p className="truncate text-[11px] text-muted">{loc.secondaryText}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Locations */}
            {!searchQuery && recentLocations.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                  Recent Locations
                </p>
                <div className="space-y-1">
                  {recentLocations.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => handleSelectLocation(loc)}
                      className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-sunken-2"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sunken text-muted">
                        <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-ink">{loc.mainText}</span>
                        <span className="block truncate text-[10px] text-muted">{loc.secondaryText}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Neighborhoods */}
            {!searchQuery && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
                  Popular Areas
                </p>
                <div className="flex flex-wrap gap-2">
                  {popularLocations.map((pop) => (
                    <button
                      key={pop.fullAddress}
                      type="button"
                      onClick={() =>
                        handleSelectLocation({
                          id: pop.fullAddress,
                          mainText: pop.mainText,
                          secondaryText: pop.secondaryText,
                          fullAddress: pop.fullAddress,
                          lat: 6.5244,
                          lng: 3.3792,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-2xs transition hover:border-line-strong hover:bg-sunken-2 active:scale-95"
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 fill-current text-brand-orange-dark" aria-hidden="true">
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
      )}
    </div>
  );
}

export default HeaderLocationPicker;
