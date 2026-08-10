'use client';

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import Button from "./Button";
import Card from "./Card";
import Icon from "./Icon";

// Phase 2+3: agent's Packaging step, shown once the balance is paid. The
// ~10-minute window is guidance only - it never blocks "Mark packed", it
// just escalates color on overrun so the agent has a sense of pace.
const WINDOW_MS = 10 * 60 * 1000;

function formatRemaining(ms) {
  const overrun = ms < 0;
  const abs = Math.abs(ms);
  const m = Math.floor(abs / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  const clock = `${m}:${String(s).padStart(2, "0")}`;
  return overrun ? `+${clock} over` : clock;
}

function PackagingPanel({ order, onPacked }: any) {
  // Seeded null (never Date.now() during render, which is impure) - the
  // interval below fills in a real clock reading within a second of mount,
  // fine for a soft guidance timer.
  const [now, setNow] = useState<any>(null);
  const [photos, setPhotos] = useState(order.packing_photos || []);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const startedAt = order.paid_at ? new Date(order.paid_at).getTime() : null;
  const remaining = now != null && startedAt != null ? startedAt + WINDOW_MS - now : WINDOW_MS;
  const overrun = remaining < 0;
  const nearOverrun = !overrun && remaining < 2 * 60 * 1000;

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await api.uploadPackingPhoto(file);
      setPhotos((cur) => [...cur, url]);
      // Best-effort attach - a failure here doesn't undo the local preview
      // and never blocks packing/dispatch below.
      await api.addPackingPhotos(order.id, [url]).catch(() => {});
    } catch (e2) {
      setError("Photo upload failed: " + e2.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleMarkPacked() {
    setError(""); setBusy(true);
    try {
      await api.packOrder(order.id);
      await api.dispatchCourier(order.id);
      onPacked();
    } catch (e2) {
      setError("Could not hand over to courier: " + e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-2 border-brand-orange">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-lg font-bold text-slate-900">Packaging</p>
        <span
          className={
            "rounded-full px-3 py-1 text-sm font-bold " +
            (overrun
              ? "bg-red-100 text-red-700"
              : nearOverrun
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-600")
          }
        >
          {formatRemaining(remaining)}
        </span>
      </div>
      <p className="mb-3 text-sm text-slate-500">
        Aim to have the order packed within ~10 minutes of payment — a guide only, you can still hand over after it runs out.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {photos.map((src, i) => (
          <img key={src + i} src={src} alt="" className="h-16 w-16 rounded-lg object-cover" />
        ))}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 disabled:opacity-50"
        >
          <Icon name="camera" className="h-5 w-5" />
          <span className="text-[10px] font-semibold">{uploading ? "…" : "Add"}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="hidden"
        />
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <Button onClick={handleMarkPacked} busy={busy} fullWidth className="text-lg">
        Mark packed / hand to courier
      </Button>
    </Card>
  );
}

export default PackagingPanel;
