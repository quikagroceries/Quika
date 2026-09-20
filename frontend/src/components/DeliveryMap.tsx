"use client";

import { useEffect, useRef, type ReactNode } from "react";
import "leaflet/dist/leaflet.css";

export type LatLng = { lat: number; lng: number };
export type MapPin = LatLng & { name?: string };

// Central Lagos - only the starting view when neither pin exists yet.
const DEFAULT_CENTER: LatLng = { lat: 6.5244, lng: 3.3792 };

const STORE_SVG =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#1A1A1A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5 5.2 4.5h13.6l1.2 5"/><rect x="5" y="9.5" width="14" height="9.5" rx="1"/><rect x="10" y="14" width="4" height="5"/></svg>';

// Interactive delivery map: tap to drop the delivery pin (or drag it), with
// the market shown as a fixed pickup pin so the map reads as "agent shops
// HERE, delivers THERE". Leaflet + OpenStreetMap tiles - no API key. Leaflet
// touches `window` on import, so it loads inside the effect and this is
// meant to be dynamically imported with ssr: false. `children` render as
// floating overlays (hints, buttons) above the tiles.
function DeliveryMap({
  coords,
  onPick,
  market,
  className = "",
  children,
}: {
  coords: LatLng | null;
  onPick: (c: LatLng) => void;
  market?: MapPin | null;
  className?: string;
  children?: ReactNode;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const marketRef = useRef(market);
  marketRef.current = market;

  // Frame whatever pins exist: both -> fit them together, one -> centre on it.
  function frame(map: any, delivery: LatLng | null) {
    const m = marketRef.current;
    if (delivery && m) {
      map.fitBounds(
        [
          [delivery.lat, delivery.lng],
          [m.lat, m.lng],
        ],
        { padding: [70, 70], maxZoom: 16 }
      );
    } else if (delivery) {
      map.setView([delivery.lat, delivery.lng], Math.max(map.getZoom(), 16));
    } else if (m) {
      map.setView([m.lat, m.lng], 12);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !elRef.current || mapRef.current) return;
      leafletRef.current = L;

      const start = coords || marketRef.current || DEFAULT_CENTER;
      const map = L.map(elRef.current, { zoomControl: false }).setView([start.lat, start.lng], coords ? 16 : 12);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // CSS pins instead of Leaflet's default image marker (whose asset
      // paths break under bundlers) - and they're on-brand.
      const deliveryIcon = L.divIcon({
        className: "",
        iconSize: [34, 42],
        iconAnchor: [17, 40],
        html: `<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;background:#EE9A5A;border:3px solid #fff;box-shadow:0 4px 10px rgba(33,26,20,.3);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center"><div style="width:10px;height:10px;border-radius:50%;background:#1A1A1A"></div></div>`,
      });
      const marketIcon = L.divIcon({
        className: "",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        html: `<div style="width:34px;height:34px;border-radius:50%;background:#fff;border:2px solid #1A1A1A;box-shadow:0 3px 8px rgba(33,26,20,.25);display:flex;align-items:center;justify-content:center">${STORE_SVG}</div>`,
      });

      const m = marketRef.current;
      if (m) {
        // Non-interactive so a tap on/near the market still drops a delivery
        // pin instead of being swallowed by the marker; the name is a
        // permanent label rather than a hover tooltip for the same reason.
        const mk = L.marker([m.lat, m.lng], { icon: marketIcon, interactive: false, keyboard: false }).addTo(map);
        if (m.name) mk.bindTooltip(m.name, { permanent: true, direction: "top", offset: [0, -16] });
      }

      function place(latlng: { lat: number; lng: number }) {
        if (markerRef.current) {
          markerRef.current.setLatLng(latlng);
        } else {
          markerRef.current = L.marker(latlng, { icon: deliveryIcon, draggable: true }).addTo(map);
          markerRef.current.bindTooltip("Deliver here", { permanent: true, direction: "top", offset: [0, -34] });
          markerRef.current.on("dragend", () => {
            const p = markerRef.current.getLatLng();
            onPickRef.current({ lat: p.lat, lng: p.lng });
          });
        }
      }

      if (coords) {
        place(coords);
        frame(map, coords);
      }
      map.on("click", (e: any) => {
        place(e.latlng);
        onPickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
      mapRef.current = map;
      (map as any)._place = place;
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map is created once; later coords changes go through the effect below
  }, []);

  // Coords changed from OUTSIDE the map (search, GPS, recent, clear): move,
  // remove or reframe the pin. A pick made on the map itself already matches.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!coords) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }
    const current = markerRef.current?.getLatLng();
    if (current && Math.abs(current.lat - coords.lat) < 1e-6 && Math.abs(current.lng - coords.lng) < 1e-6) return;
    map._place?.(coords);
    frame(map, coords);
  }, [coords?.lat, coords?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={"relative z-0 overflow-hidden " + className}>
      <div ref={elRef} className="absolute inset-0" role="application" aria-label="Delivery location map" />
      {children && <div className="pointer-events-none absolute inset-0 z-[1000]">{children}</div>}
    </div>
  );
}

export default DeliveryMap;
