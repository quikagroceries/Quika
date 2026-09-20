"use client";

import { api } from "@/lib/api";

export interface LocationSuggestion {
  id: string;
  mainText: string;
  secondaryText: string;
  fullAddress: string;
  lat: number;
  lng: number;
}

const RECENT_LOCATIONS_KEY = "qyka_recent_locations";
const CURRENT_ADDRESS_KEY = "qyka_customer_delivery_address";
const CURRENT_COORDS_KEY = "qyka_customer_delivery_coords";

// Used only if the live /locations/popular call fails (offline, backend
// down) - a static seed, not what's actually shown in the normal case.
const FALLBACK_POPULAR_LOCATIONS: Array<{ mainText: string; secondaryText: string; fullAddress: string }> = [
  { mainText: "Lekki Phase 1", secondaryText: "Lagos, Nigeria", fullAddress: "Lekki Phase 1, Lagos" },
  { mainText: "Victoria Island", secondaryText: "Lagos, Nigeria", fullAddress: "Victoria Island, Lagos" },
  { mainText: "Ikoyi", secondaryText: "Lagos, Nigeria", fullAddress: "Ikoyi, Lagos" },
  { mainText: "Ikeja GRA", secondaryText: "Lagos, Nigeria", fullAddress: "Ikeja GRA, Lagos" },
  { mainText: "Yaba", secondaryText: "Lagos, Nigeria", fullAddress: "Yaba, Lagos" },
  { mainText: "Surulere", secondaryText: "Lagos, Nigeria", fullAddress: "Surulere, Lagos" },
  { mainText: "Maitama", secondaryText: "Abuja, Nigeria", fullAddress: "Maitama, Abuja" },
  { mainText: "Wuse 2", secondaryText: "Abuja, Nigeria", fullAddress: "Wuse 2, Abuja" },
];

/** Live, DB-backed popular areas - counted from real picks via
 * POST /locations/track, ranked by GET /locations/popular. Falls back to a
 * static list only when the request itself fails. */
export async function getPopularLocations(): Promise<
  Array<{ mainText: string; secondaryText: string; fullAddress: string }>
> {
  try {
    const rows: Array<{ label: string; count: number }> = await api.getPopularLocations();
    if (!Array.isArray(rows) || rows.length === 0) return FALLBACK_POPULAR_LOCATIONS;
    return rows.map((row) => {
      const [mainText, ...rest] = row.label.split(",");
      return {
        mainText: mainText.trim(),
        secondaryText: rest.join(",").trim() || "Nigeria",
        fullAddress: row.label,
      };
    });
  } catch {
    return FALLBACK_POPULAR_LOCATIONS;
  }
}

/** Log a location pick so it counts toward live "popular areas" - fire and
 * forget, never blocks or breaks the selection flow it's called from. */
export function trackLocationSearch(loc: { fullAddress: string; lat?: number; lng?: number }) {
  api.trackLocation(loc.fullAddress, loc.lat, loc.lng).catch(() => {});
}

/** Format Nominatim address components into a street-level, human-readable
 * Nigerian address: "12 Allen Avenue" on the first line (house number +
 * street, or the place's own name when it's a shop/landmark), then the
 * area, city and state. OSM often has the street but not the house number,
 * so every field is optional and the line degrades gracefully. */
function formatNominatimAddress(item: any, typedHouse = ""): { mainText: string; secondaryText: string; fullAddress: string } {
  const addr = item.address || {};
  const house = String(addr.house_number || typedHouse || "").trim();
  const road = String(
    addr.road || addr.pedestrian || addr.residential || addr.footway || addr.path || addr.cycleway || ""
  ).trim();
  const area = String(
    addr.neighbourhood || addr.suburb || addr.quarter || addr.city_district || addr.hamlet || addr.village || ""
  ).trim();
  const city = String(addr.city || addr.town || addr.municipality || addr.county || "").trim();
  const state = String(addr.state || "").trim();
  // A named place (a shop, estate, school) reads better than a bare street.
  const place = String(item.name || "").trim();
  const isPlace = place && place !== road && place !== area && place !== city && place !== house;

  const street = [house, road].filter(Boolean).join(" ");
  const main = isPlace ? place : street || area || city || "Location";

  const secondaryParts: string[] = [];
  for (const part of [isPlace ? street : "", area, city, state]) {
    if (part && part !== main && !secondaryParts.includes(part)) secondaryParts.push(part);
  }
  const secondary = secondaryParts.join(", ") || "Nigeria";

  return { mainText: main, secondaryText: secondary, fullAddress: `${main}, ${secondary}` };
}

async function nominatimSearch(q: string, signal?: AbortSignal, bias?: { lat: number; lng: number }): Promise<any[]> {
  const params = new URLSearchParams({
    format: "json",
    q,
    countrycodes: "ng",
    addressdetails: "1",
    dedupe: "1",
    limit: "8",
    "accept-language": "en",
  });
  // Prefer (not require) results near the market / the current pin - a bare
  // "Allen Avenue" then finds the Lagos one first, not one in another city.
  if (bias) {
    const d = 0.35;
    params.set("viewbox", `${bias.lng - d},${bias.lat + d},${bias.lng + d},${bias.lat - d}`);
    params.set("bounded", "0");
  }
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    signal,
    headers: { Accept: "application/json", "User-Agent": "Quika-Personal-Shopping/1.0" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function toSuggestion(item: any, typedHouse = ""): LocationSuggestion {
  const { mainText, secondaryText, fullAddress } = formatNominatimAddress(item, typedHouse);
  return {
    id: String(item.place_id || `${item.lat},${item.lon}`) + (typedHouse ? `-${typedHouse}` : ""),
    mainText,
    secondaryText,
    fullAddress,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
  };
}

/** Search addresses with live API autocomplete. `bias` (the market, or the
 * current pin) steers results toward the right city. If the customer typed a
 * house number OpenStreetMap doesn't know ("12 Allen Avenue"), the search
 * retries with just the street and keeps their number on the result - the
 * pin lands on the street and they can drag it to the exact door. */
export async function searchAddressApi(
  query: string,
  signal?: AbortSignal,
  bias?: { lat: number; lng: number }
): Promise<LocationSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  try {
    const m = trimmed.match(/^(\d+[a-zA-Z]?)[,\s]+(.+)$/);
    const typedHouse = m ? m[1] : "";
    let results = await nominatimSearch(trimmed, signal, bias);
    // OSM rarely has house numbers: if the full query finds nothing, search
    // the street alone. Either way the number the customer typed stays on
    // the result - the pin lands on the street and can be dragged to the door.
    if (results.length === 0 && m) results = await nominatimSearch(m[2], signal, bias);
    return results.map((r) => toSuggestion(r, typedHouse));
  } catch (err: any) {
    return [];
  }
}

/** Reverse geocode coordinates to street address via GPS */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<{ mainText: string; secondaryText: string; fullAddress: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Quika-Personal-Shopping/1.0",
      },
    });

    if (!res.ok) {
      return {
        mainText: "Current Location",
        secondaryText: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        fullAddress: `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      };
    }

    const data = await res.json();
    return formatNominatimAddress(data);
  } catch {
    return {
      mainText: "Current Location",
      secondaryText: "Detected via GPS",
      fullAddress: "Current Location, Lagos",
    };
  }
}

/** Manage recent selected locations */
export function getRecentLocations(): LocationSuggestion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_LOCATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecentLocation(loc: LocationSuggestion) {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentLocations().filter((item) => item.fullAddress !== loc.fullAddress);
    const updated = [loc, ...existing].slice(0, 5);
    localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(updated));
    localStorage.setItem(CURRENT_ADDRESS_KEY, loc.fullAddress);
    if (loc.lat && loc.lng) {
      localStorage.setItem(CURRENT_COORDS_KEY, JSON.stringify({ lat: loc.lat, lng: loc.lng }));
    }
  } catch {
    // ignore storage error
  }
}
