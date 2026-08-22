"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/logo.png";
import { useAuth } from "@/components/AuthProvider";
import Icon from "@/components/Icon";
import { ACCOUNT_NAV } from "@/lib/nav";
import { useShop } from "./ShopContext";
import VenuePopover from "./VenuePopover";

/** Shared header chrome tokens — keep icon wells + borders on one pattern. */
const BORDER = "border-[#ddd6cb]";
const ICON_WELL =
  "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#faf9f7] ring-1 ring-[#ebe7e0]";
const CHEVRON = "h-3.5 w-3.5 shrink-0 text-[#8a8178]";
const CONTROL_SHADOW = "shadow-[0_1px_2px_rgba(33,26,20,0.06)]";

function PinGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
    </svg>
  );
}

function Chevron({ open = false }: { open?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={CHEVRON + (open ? " rotate-180 transition" : " transition")}
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Sticky marketplace header — max-width centered, venue + search as primary discovery. */
function ShopHeader() {
  const { user, token, handleLogout, roleSwitch } = useAuth();
  const {
    market,
    vendor,
    step,
    searchQuery,
    setSearchQuery,
    listDraft,
    openBag,
    venueOpen,
    setVenueOpen,
    address,
    setAddress,
    setDeliveryCoords,
  } = useShop();

  const [accountOpen, setAccountOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const desktopGroupRef = useRef<HTMLButtonElement>(null);
  const mobileGroupRef = useRef<HTMLButtonElement>(null);
  const guest = !token || !user;
  const itemCount = listDraft?.itemCount || 0;
  const searchEnabled = step === "market" || step === "vendors";
  const venueSelected = Boolean(market?.name);
  const venueAnchorRef = isNarrow ? mobileGroupRef : desktopGroupRef;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    function onDoc(e: MouseEvent) {
      if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

  const deliverLabel = address.trim() || "Add address";

  return (
    <header className="sticky top-0 z-40 border-b border-[#ebe7e0] bg-white">
      <div className="flex h-[64px] w-full items-center gap-3 px-4 md:gap-4 md:px-6 lg:px-8">
        {/* The sidebar (from AppShell) carries the logo from md: up — this
            stays mobile-only so the brand mark exists exactly once at any
            given width, not twice. */}
        <Link href="/" className="shrink-0 md:hidden" aria-label="Quika home">
          <Image src={logo} alt="Quika" className="h-10 w-auto object-contain" priority />
        </Link>

        {/* One control, not two — it opens a single popover that manages
            both venue and delivery address together, so it shouldn't look
            like two separate dropdowns doing different jobs. */}
        <button
          ref={desktopGroupRef}
          type="button"
          onClick={() => setVenueOpen((o) => !o)}
          aria-expanded={venueOpen}
          aria-haspopup="listbox"
          className={
            "hidden h-11 min-w-0 max-w-[20rem] shrink-0 items-center gap-2.5 rounded-full border bg-white p-1.5 pr-3 text-left transition hover:bg-[#faf9f7] sm:flex md:max-w-[22rem] " +
            BORDER +
            " " +
            CONTROL_SHADOW
          }
        >
          <span className={ICON_WELL + " text-brand-green"}>
            <Icon name="pin" className="h-4 w-4" />
            {venueSelected && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-green text-white ring-2 ring-white">
                <svg viewBox="0 0 20 20" className="h-2 w-2" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-ink">
              {venueSelected ? market.name : "Choose your location"}
            </span>
            <span className="flex items-center gap-1 truncate text-[0.7rem] font-medium text-[#8a8178]">
              <PinGlyph className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{deliverLabel}</span>
            </span>
          </span>
          <Chevron open={venueOpen} />
        </button>

        {/* Search — same border language as the split control */}
        <div className="relative hidden min-w-0 flex-1 sm:block">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8a8178]">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M20 20l-3-3" />
            </svg>
          </span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!searchEnabled}
            placeholder={step === "vendors" ? "Search stalls" : "Search venues, produce, stalls…"}
            className={
              "h-11 w-full rounded-full border bg-[#f0eeeb] py-2.5 pl-11 pr-4 text-sm text-ink outline-none transition placeholder:text-[#8a8178] focus:border-brand-orange/40 focus:bg-white focus:ring-2 focus:ring-brand-orange/15 disabled:cursor-not-allowed disabled:opacity-45 " +
              BORDER
            }
            aria-label="Search"
          />
        </div>

        <div className="min-w-0 flex-1 sm:hidden" />

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={openBag}
            className={
              "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-white text-ink transition hover:border-brand-orange/40 hover:bg-[#fff8f5] " +
              BORDER +
              " " +
              CONTROL_SHADOW
            }
            aria-label={`Shopping list${itemCount ? `, ${itemCount} items` : ""}`}
          >
            <Icon name="basket" className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange px-1 text-[0.65rem] font-bold text-white shadow-sm">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </button>

          {/* The sidebar (from AppShell) now covers sign-in/account/logout on
              md+ — this stays mobile-only so there's exactly one place to
              find it at any given width, not two. */}
          <div className="relative shrink-0 md:hidden" ref={accountRef}>
            {guest ? (
              <Link
                href="/login?next=/shop"
                className="inline-flex h-11 items-center rounded-full bg-ink px-4 text-sm font-bold text-white transition hover:bg-ink/90"
              >
                Sign in
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setAccountOpen((o) => !o)}
                  className={
                    "flex h-11 w-11 items-center justify-center rounded-full border bg-white text-ink transition hover:bg-[#f7f5f2] md:w-auto md:gap-2 md:pl-1.5 md:pr-3 " +
                    BORDER +
                    " " +
                    CONTROL_SHADOW
                  }
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                >
                  <span className={ICON_WELL + " text-[#6b635a]"}>
                    <Icon name="user" className="h-4 w-4" />
                  </span>
                  <span className="hidden max-w-[7rem] truncate text-sm font-semibold md:inline">
                    {user?.phone}
                  </span>
                </button>
                {accountOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-[#ebe7e0] bg-white py-1 shadow-[0_16px_40px_rgba(33,26,20,0.12)]"
                  >
                    {vendor && (
                      <p className="border-b border-[#ebe7e0] px-4 py-2 text-xs text-[#8a8178]">
                        Soft prefer: {vendor.name}
                      </p>
                    )}
                    {roleSwitch && (
                      <button
                        type="button"
                        className="w-full px-4 py-2.5 text-left text-sm font-semibold text-ink hover:bg-[#f7f5f2]"
                        onClick={() => {
                          setAccountOpen(false);
                          roleSwitch.onToggle(
                            roleSwitch.mode === "customer" ? "agent" : "customer"
                          );
                        }}
                      >
                        {roleSwitch.mode === "customer" ? "Switch to agent" : "Switch to customer"}
                      </button>
                    )}
                    {ACCOUNT_NAV.map((item) => (
                      <Link
                        key={item.key}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-[#f7f5f2]"
                      >
                        <Icon name={item.icon} className="h-4 w-4 text-[#8a8178]" />
                        {item.label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAccountOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-3 border-t border-[#ebe7e0] px-4 py-2.5 text-sm font-semibold text-[#6b635a] hover:bg-[#f7f5f2]"
                    >
                      <Icon name="logout" className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: split group + search */}
      <div className="border-t border-[#ebe7e0] px-4 py-2 sm:hidden md:px-6 lg:px-8">
        <div className="flex flex-col gap-2">
          <button
            ref={mobileGroupRef}
            type="button"
            onClick={() => setVenueOpen((o) => !o)}
            aria-expanded={venueOpen}
            className={
              "flex items-center gap-2.5 rounded-xl border bg-white p-2 pr-3 text-left " +
              BORDER +
              " " +
              CONTROL_SHADOW
            }
          >
            <span className={ICON_WELL + " text-brand-green"}>
              <Icon name="pin" className="h-4 w-4" />
              {venueSelected && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand-green text-white ring-2 ring-white">
                  <svg viewBox="0 0 20 20" className="h-2 w-2" fill="currentColor" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-ink">
                {venueSelected ? market.name : "Choose your location"}
              </span>
              <span className="flex items-center gap-1 truncate text-[0.7rem] text-[#8a8178]">
                <PinGlyph className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{deliverLabel}</span>
              </span>
            </span>
            <Chevron open={venueOpen} />
          </button>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8178]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="M20 20l-3-3" />
              </svg>
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={!searchEnabled}
              placeholder={step === "vendors" ? "Search stalls" : "Search venues…"}
              className={
                "h-10 w-full rounded-full border bg-[#f0eeeb] py-2 pl-10 pr-3 text-sm text-ink outline-none placeholder:text-[#8a8178] disabled:opacity-45 " +
                BORDER
              }
              aria-label="Search"
            />
          </div>
        </div>
      </div>

      <VenuePopover
        open={venueOpen}
        onClose={() => setVenueOpen(false)}
        anchorRef={venueAnchorRef}
        address={address}
        onAddressChange={setAddress}
        onDeliveryCoordsChange={setDeliveryCoords}
      />
    </header>
  );
}

export default ShopHeader;
