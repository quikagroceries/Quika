'use client';

import { useRef, useState } from "react";
import { api } from "@/lib/api";
import Avatar from "./Avatar";
import Icon from "./Icon";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const OUTPUT_PX = 512;

// Centre-crop to a square and shrink before uploading: phone photos are
// 3-8 MB and 4000px wide, and an avatar never shows more than a few hundred
// pixels. A ~60 KB square uploads in a blink even on a weak connection.
async function toSquareJpeg(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(OUTPUT_PX, side);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process that image.");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    canvas.width,
    canvas.height
  );
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.86));
  if (!blob) throw new Error("Could not process that image.");
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

// Profile photo control: the current photo (or initials) with a camera badge
// to pick a new one, and a Remove link once one is set. Picks go straight to
// Cloudinary from the browser (same as chat photos), then only the resulting
// URL is saved on the profile - no image bytes ever touch our API.
function AvatarUpload({ user, onUserUpdated, size = "h-20 w-20" }: any) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be picked again after a failure
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError("That photo is too large - pick one under 10 MB.");
      return;
    }
    setBusy(true);
    try {
      const url = await api.uploadProfilePhoto(await toSquareJpeg(file));
      onUserUpdated(await api.updateProfile({ avatar_url: url }));
    } catch (err: any) {
      setError(err?.message?.includes("Cloudinary") ? "Upload failed - check your connection and try again." : err?.message || "Could not update your photo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setError("");
    setBusy(true);
    try {
      onUserUpdated(await api.updateProfile({ avatar_url: null }));
    } catch (err: any) {
      setError(err?.message || "Could not remove your photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <Avatar src={user.avatar_url} name={user.full_name} className={size + " text-xl"} iconClassName="h-8 w-8" />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-surface/70">
            <svg className="h-6 w-6 animate-spin text-brand-orange-dark" viewBox="0 0 24 24" fill="none" aria-label="Uploading">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </span>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label={user.avatar_url ? "Change profile photo" : "Add profile photo"}
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-orange text-[#1A1A1A] shadow-md ring-2 ring-surface transition hover:bg-brand-orange-dark disabled:opacity-60"
        >
          <Icon name="camera" className="h-4 w-4" />
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={handlePick} className="hidden" />
      </div>

      <div className="min-w-0 text-sm">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="font-bold text-ink hover:underline disabled:opacity-60"
        >
          {user.avatar_url ? "Change photo" : "Add a photo"}
        </button>
        {user.avatar_url && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="ml-3 font-semibold text-faint hover:text-red-600 disabled:opacity-60"
          >
            Remove
          </button>
        )}
        {error && <p className="mt-1 text-red-600">{error}</p>}
      </div>
    </div>
  );
}

export default AvatarUpload;
