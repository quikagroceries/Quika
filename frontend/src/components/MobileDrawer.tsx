"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/logo.png";
import Icon from "./Icon";
import RoleSwitch from "./RoleSwitch";

function MobileDrawer({ open, onClose, navItems, activeKey, user, onLogout, roleSwitch, guest = false }: any) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const settingsHref = navItems.find((i) => i.key === "settings")?.href || "/settings";

  return (
    <div className="md:hidden">
      <div
        onClick={onClose}
        aria-hidden="true"
        className={
          "fixed inset-0 z-40 bg-ink/40 transition-opacity duration-300 ease-premium " +
          (open ? "opacity-100" : "pointer-events-none opacity-0")
        }
      />

      {/* `duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]` - the same
          bounce ShopBag's own mobile drawer slides with, not the flatter
          `ease-premium`. Every drawer in the app follows this one now. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80%] transform flex-col bg-canvas shadow-xl transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="flex items-center justify-between px-4 py-5">
          <Image src={logo} alt="Qyka Groceries" className="h-9 w-auto object-contain" />
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-ink/50 hover:bg-ink/5 active:bg-ink/10"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {roleSwitch && (
          <div className="px-4 pb-3">
            <RoleSwitch {...roleSwitch} />
          </div>
        )}

        <nav className="flex-1 space-y-1.5 px-3">
          {navItems.map((item) => {
            const active = item.key === activeKey;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onClose}
                className={
                  "flex w-full items-center gap-3 rounded-2xl px-3 min-h-[48px] text-base font-semibold transition-colors " +
                  (active
                    ? "bg-brand-orange text-[#1A1A1A] shadow-stamp"
                    : "text-ink/55 hover:bg-white/70 hover:text-ink")
                }
              >
                <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-ink/8 p-4">
          {guest ? (
            <Link
              href="/login?next=/shop"
              onClick={onClose}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-orange px-3 min-h-[48px] text-base font-bold text-[#1A1A1A] shadow-stamp hover:bg-brand-orange-dark"
            >
              <Icon name="user" className="h-5 w-5 shrink-0" />
              Sign in
            </Link>
          ) : (
            <>
              <Link
                href={settingsHref}
                onClick={onClose}
                className="mb-2 flex w-full items-center gap-2.5 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-white/70"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink/50">
                  <Icon name="user" className="h-4 w-4" />
                </span>
                <span className="truncate text-sm font-semibold text-ink">{user?.full_name || user?.phone}</span>
              </Link>
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 min-h-[44px] text-base font-semibold text-ink/55 hover:bg-white/70 hover:text-ink"
              >
                <Icon name="logout" className="h-5 w-5 shrink-0" />
                Log out
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MobileDrawer;
