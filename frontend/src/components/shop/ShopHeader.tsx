"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/logo.png";
import squiggleArrow from "@/assets/illustrations/decorative-squiggle-arrow.png";
import squiggle2 from "@/assets/illustrations/decorative-squiggle-2.png";
import dotArrow from "@/assets/illustrations/decorative-dot-arrow.png";
import dottedSquares from "@/assets/illustrations/decorative-dotted-squares.png";
import { useAuth } from "@/components/AuthProvider";
import Icon from "@/components/Icon";
import { ACCOUNT_NAV } from "@/lib/nav";
import { useShop } from "./ShopContext";
import { useChatOptional } from "@/components/chat/ChatContext";
import VenuePopover from "./VenuePopover";
import BagPeek from "./BagPeek";
import HeaderLiveOrderPill from "@/components/header/HeaderLiveOrderPill";
import SearchField from "@/components/SearchField";
import Avatar from "@/components/Avatar";
import { usePathname } from "next/navigation";
import { usePageSearchContext } from "@/components/PageSearchContext";
import HeaderWalletChip from "@/components/header/HeaderWalletChip";

/** Shared header chrome tokens — keep icon wells + borders on one pattern. */
const BORDER = "border-line-strong";
const ICON_WELL =
  "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken-2 ring-1 ring-line";
const CHEVRON = "h-3.5 w-3.5 shrink-0 text-faint";
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
// One header for the whole customer app on a phone. On /shop it drives market
// browsing (its search finds markets); on every other customer page
// (`mobileOnly`, so the desktop keeps its own top bar) it's the SAME header -
// location, bag, account - with its search bound to whatever that page
// registers (History's orders, Wallet's transactions...), or absent if the
// page has nothing to search.
function ShopHeader({ mobileOnly = false }: { mobileOnly?: boolean }) {
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
  // Same reasoning as DesktopTopBar's own bag button: while chat's docked
  // panel already holds the page's "sticky sidebar" slot, opening the bag
  // there too would fight it for the same layout role, so it peeks as a
  // small dropdown here instead.
  const chat = useChatOptional();
  const [bagPeekOpen, setBagPeekOpen] = useState(false);

  function handleBagClick() {
    if (chat?.open) {
      setBagPeekOpen((v) => !v);
    } else {
      openBag();
    }
  }
  const accountRef = useRef<HTMLDivElement>(null);
  const desktopGroupRef = useRef<HTMLButtonElement>(null);
  const guest = !token || !user;
  const itemCount = listDraft?.itemCount || 0;
  const pathname = usePathname();
  const onShop = pathname === "/shop" || pathname?.startsWith("/shop/");
  const pageSearch = usePageSearchContext();
  const searchPlaceholder = onShop ? "Search markets…" : pageSearch?.placeholder || null;
  const searchValue = onShop ? searchQuery : pageSearch?.query || "";
  const setSearchValue = onShop ? setSearchQuery : pageSearch?.setQuery || (() => {});
  // On /shop the box is always drawn (disabled outside the market step, so the
  // layout doesn't jump); elsewhere it exists only if the page has a search.
  const showSearch = onShop || Boolean(searchPlaceholder);
  const searchEnabled = onShop ? step === "market" : Boolean(searchPlaceholder);
  const venueSelected = Boolean(market?.name);
  const venueAnchorRef = desktopGroupRef;

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
    <header className={"sticky top-0 z-40 overflow-hidden border-b border-line-strong bg-canvas " + (mobileOnly ? "md:hidden" : "")}>
      {/* Far-left + far-right are meant to be genuinely visible (raised
          opacity, and gated on md: - not lg:/xl:, which may not even
          trigger on a normal desktop window and was why these read as
          "not really there"). The two center pieces are the deliberate
          exception: pinned to peek from just above/below the search pill,
          mostly hidden behind it on purpose - a glimpse, not the full
          image, is the point ("thirst for more"), so they stay lower
          opacity and small. */}
      <Image
        src={squiggleArrow}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -left-2 top-1/2 hidden w-20 -translate-y-1/2 opacity-[0.4] md:block"
      />
      <Image
        src={squiggle2}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-3 top-1/2 hidden w-20 -translate-y-1/2 rotate-6 opacity-[0.4] md:block"
      />
      <Image
        src={dotArrow}
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 -top-2 hidden w-14 -translate-x-1/2 -rotate-6 opacity-[0.22] lg:block"
      />
      <Image
        src={dottedSquares}
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-1/2 -bottom-2 hidden w-14 translate-x-6 rotate-6 opacity-[0.22] lg:block"
      />
      <div className="relative flex h-[64px] w-full items-center gap-3 px-4 md:gap-4 md:px-6 lg:px-8">
        {/* The sidebar (from AppShell) carries the logo from md: up — this
            stays mobile-only so the brand mark exists exactly once at any
            given width, not twice. */}
        <Link href="/" className="shrink-0 md:hidden" aria-label="Qyka home">
          <Image src={logo} alt="Qyka" className="h-10 w-auto object-contain" priority />
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
            "flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full border bg-surface p-1.5 pr-3 text-left transition hover:bg-sunken-2 sm:max-w-[20rem] sm:flex-none md:max-w-[22rem] " +
            BORDER +
            " " +
            CONTROL_SHADOW
          }
        >
          <span className={ICON_WELL + " text-ink"}>
            <Icon name="pin" className="h-4 w-4" />
            {venueSelected && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ink text-surface ring-2 ring-surface">
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
            <span className="flex items-center gap-1 truncate text-[0.7rem] font-medium text-faint">
              <PinGlyph className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{deliverLabel}</span>
            </span>
          </span>
          <Chevron open={venueOpen} />
        </button>

        {/* Search - the shared field, same as every other page's top bar */}
        {showSearch ? (
          <SearchField
            className="hidden min-w-0 flex-1 sm:block"
            value={searchValue}
            onChange={setSearchValue}
            disabled={!searchEnabled}
            placeholder={onShop ? "Search markets by name or area…" : searchPlaceholder}
          />
        ) : (
          <div className="hidden min-w-0 flex-1 sm:block" />
        )}

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          {/* Desktop only - on a phone the bottom bar's Track tab (with its
              live dot) already says "you have an order in progress". */}
          <div className="hidden md:block">
            <HeaderLiveOrderPill compact />
          </div>
          <div className="hidden sm:block">
            <HeaderWalletChip />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={handleBagClick}
              className={
                "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-surface text-ink transition hover:border-brand-orange/40 hover:bg-brand-orange/10 " +
                BORDER +
                " " +
                CONTROL_SHADOW
              }
              aria-label={`Shopping list${itemCount ? `, ${itemCount} items` : ""}`}
              aria-expanded={bagPeekOpen}
            >
              <Icon name="basket" className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange px-1 text-[0.65rem] font-bold text-[#1A1A1A] shadow-sm">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </button>
            {bagPeekOpen && <BagPeek onClose={() => setBagPeekOpen(false)} />}
          </div>

          {/* The sidebar (from AppShell) now covers sign-in/account/logout on
              md+ — this stays mobile-only so there's exactly one place to
              find it at any given width, not two. */}
          <div className="relative shrink-0 md:hidden" ref={accountRef}>
            {guest ? (
              <Link
                href="/login?next=/shop"
                className="inline-flex h-11 items-center rounded-full bg-brand-orange px-4 text-sm font-bold text-[#1A1A1A] shadow-xs transition hover:bg-brand-orange-dark"
              >
                Sign in
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setAccountOpen((o) => !o)}
                  className={
                    "flex h-11 w-11 items-center justify-center rounded-full border bg-surface text-ink transition hover:bg-sunken-2 md:w-auto md:gap-2 md:pl-[3px] md:pr-3 " +
                    BORDER +
                    " " +
                    CONTROL_SHADOW
                  }
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                >
                  <Avatar src={user?.avatar_url} name={user?.full_name} className="h-[2.375rem] w-[2.375rem]" />
                  <span className="hidden max-w-[7rem] truncate text-sm font-semibold md:inline">
                    {user?.full_name || user?.phone}
                  </span>
                </button>
                {accountOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-surface py-1 shadow-[0_16px_40px_rgba(33,26,20,0.12)]"
                  >
                    {vendor && (
                      <p className="border-b border-line px-4 py-2 text-xs text-faint">
                        Soft prefer: {vendor.name}
                      </p>
                    )}
                    {roleSwitch && (
                      <button
                        type="button"
                        className="w-full px-4 py-2.5 text-left text-sm font-semibold text-ink hover:bg-sunken-2"
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
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-sunken-2"
                      >
                        <Icon name={item.icon} className="h-4 w-4 text-faint" />
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
                      className="flex w-full items-center gap-3 border-t border-line px-4 py-2.5 text-sm font-semibold text-muted hover:bg-sunken-2"
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
      {/* Phones: the location control lives in the top row now, so this row
          is ONLY the search - and only while search is usable (the market
          step). A disabled search box on every other step was a full row of
          sticky header spent on nothing. */}
      {searchEnabled && (
        <div className="border-t border-line px-4 py-2 sm:hidden">
          <SearchField
            value={searchValue}
            onChange={setSearchValue}
            placeholder={searchPlaceholder}
          />
        </div>
      )}

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
