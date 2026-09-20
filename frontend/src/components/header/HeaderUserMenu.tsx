"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import Avatar from "@/components/Avatar";

export function HeaderUserMenu({ className = "" }: { className?: string }) {
  const { user, handleLogout, roleSwitch } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
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

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-10 items-center justify-center rounded-full bg-brand-orange px-5 text-xs font-bold text-[#1A1A1A] shadow-xs transition hover:bg-brand-orange-dark active:bg-brand-orange-dark"
      >
        Sign in
      </Link>
    );
  }

  const displayName = user.full_name || user.phone || "Account";
  const initials = (user.full_name || user.phone || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const role = (user.role || "CUSTOMER").toUpperCase();

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="group flex h-10 items-center gap-2 rounded-full border border-line bg-surface p-[3px] pr-3 shadow-xs transition hover:border-line-strong hover:bg-sunken-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
        aria-label="User menu"
        aria-expanded={open}
      >
        <Avatar src={user.avatar_url} name={user.full_name || user.phone} className="h-[2.125rem] w-[2.125rem]" />

        <div className="hidden max-w-[7rem] truncate text-left md:block">
          <span className="block truncate text-xs font-bold text-ink">
            {displayName}
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

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-surface py-2 shadow-xl ring-1 ring-black/5">
          {/* User info header */}
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-xs font-bold text-ink">{displayName}</p>
            {user.phone && <p className="truncate text-[11px] text-muted">{user.phone}</p>}
            <div className="mt-1.5 flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-brand-orange/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-orange-dark">
                {role}
              </span>
              {role === "AGENT" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-brand-orange/15 px-2 py-0.5 text-[10px] font-bold text-brand-orange-dark">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-orange-dark" />
                  {roleSwitch?.mode === "agent" ? "On Duty" : "Off Duty"}
                </span>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div className="py-1">
            <Link
              href="/shop"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-ink transition hover:bg-sunken-2 hover:text-brand-orange-dark"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Start Personal Shopping
            </Link>

            <Link
              href="/track"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-ink transition hover:bg-sunken-2 hover:text-brand-orange-dark"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Orders
            </Link>

            <Link
              href="/wallet"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-ink transition hover:bg-sunken-2 hover:text-brand-orange-dark"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M16 12h.01" strokeWidth="3" strokeLinecap="round" />
                <path d="M2 10h20" />
              </svg>
              Wallet & Top-up
            </Link>

            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-ink transition hover:bg-sunken-2 hover:text-brand-orange-dark"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              Account Settings
            </Link>
          </div>

          {/* Role Switch action */}
          {roleSwitch && (
            <div className="border-t border-line px-2 py-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  roleSwitch.onToggle(roleSwitch.mode === "customer" ? "agent" : "customer");
                }}
                disabled={roleSwitch.busy}
                className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-semibold text-brand-orange-dark transition hover:bg-brand-orange/10 disabled:opacity-50"
              >
                <span>{roleSwitch.mode === "customer" ? "Switch to Agent Mode" : "Switch to Customer Mode"}</span>
                <span className="text-[10px] text-muted">⇄</span>
              </button>
            </div>
          )}

          {/* Sign Out */}
          <div className="border-t border-line px-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                handleLogout();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#A23B36] transition hover:bg-[#F7E3E1]/50"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HeaderUserMenu;
