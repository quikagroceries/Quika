"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Button from "./Button";
import Input from "./Input";
import { api } from "@/lib/api";
import { formatPriceHint, priceHintForItem, smartChipsForMarket } from "@/lib/marketHints";
import { parseListLine } from "@/lib/parseListLine";
import { useShopOptional, type ShopListDraft } from "@/components/shop/ShopContext";
import { illustrationForItem } from "@/lib/foodVisuals";
import netBag from "@/assets/illustrations/net-bag.png";
import squiggleArrow from "@/assets/illustrations/decorative-squiggle-arrow.png";
import dotArrow from "@/assets/illustrations/decorative-dot-arrow.png";
import dottedSquares from "@/assets/illustrations/decorative-dotted-squares.png";

const EMPTY_ROW = { item: "", price: "", qty: "1", note: "" };

function money(n: number) {
  return (Number(n) || 0).toFixed(2);
}

function flashClass(flash: boolean) {
  return flash ? "scale-[1.02] bg-brand-green/10 ring-brand-green/30" : "";
}

export function buildDraft(
  mode: "detailed" | "freetext",
  rows: any[],
  budgetText: string,
  budget: string
): ShopListDraft {
  const pricedItems = rows.filter((r: any) => r.item.trim().length > 0);
  const pricedTotal = pricedItems.reduce(
    (sum: number, r: any) => sum + (Number(r.price) || 0) * (Number(r.qty) || 0),
    0
  );
  const budgetLines = budgetText.split("\n").map((l: string) => l.trim()).filter(Boolean);
  // Each free-typed line is parsed on its own — "Rice 2000" becomes a
  // properly priced item, same as if it'd been typed into the detailed
  // form. Lines with no extractable price fall back to the old behavior:
  // pure description, covered by the manual budget estimate below.
  const parsedLines = budgetLines.map(parseListLine);
  const autoPriced = parsedLines.filter((p) => p.price != null);
  const needsBudget = parsedLines.filter((p) => p.price == null);
  const autoPricedTotal = autoPriced.reduce((sum, p) => sum + (p.price || 0), 0);
  const unstructuredTotal = needsBudget.length > 0 ? Number(budget) || 0 : 0;
  const goodsTotal = pricedTotal + autoPricedTotal + unstructuredTotal;
  const itemCount = pricedItems.length + budgetLines.length;
  return {
    mode,
    rows,
    budgetText,
    budget,
    goodsTotal,
    pricedTotal,
    unstructuredTotal,
    autoPricedTotal,
    itemCount,
    items: [
      ...pricedItems.map((r: any) => ({
        description: r.item.trim(),
        listed_price: money((Number(r.price) || 0) * (Number(r.qty) || 0)),
        quantity: Number(r.qty) || 1,
        requested_note: r.note.trim() || null,
        preferred_stall_id: r.stallId || null,
      })),
      ...autoPriced.map((p) => ({
        description: p.description,
        listed_price: money(p.price || 0),
        quantity: p.quantity || undefined,
      })),
      ...needsBudget.map((p) => ({
        description: p.description,
        quantity: p.quantity || undefined,
      })),
    ],
  };
}

/**
 * Searchable "prefer a stall" picker — same trigger-button + floating
 * listbox pattern as the Sort dropdown in MarketPicker's FilterBar, so it
 * reads as one system rather than a stray native <select>.
 */
function StallPicker({ vendors, onSelect }: { vendors: any[]; onSelect: (v: any) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
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

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v: any) => v.name.toLowerCase().includes(q));
  }, [vendors, query]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition " +
          (open
            ? "border-brand-orange/40 bg-[#fff8f5] text-ink"
            : "border-line-strong bg-surface text-muted hover:bg-sunken-2")
        }
      >
        Prefer a stall
        <svg
          viewBox="0 0 20 20"
          className={"h-3 w-3 transition " + (open ? "rotate-180" : "")}
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Prefer a stall"
          className="absolute left-0 top-[calc(100%+6px)] z-30 w-60 overflow-hidden rounded-xl border border-line bg-surface shadow-[0_12px_28px_rgba(33,26,20,0.12)]"
        >
          <div className="border-b border-line p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stalls…"
              className="w-full rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink outline-none transition focus:border-brand-orange/40"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-faint">No stalls match</p>
            ) : (
              filtered.map((v: any) => (
                <button
                  key={v.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    onSelect(v);
                    setOpen(false);
                  }}
                  className="flex w-full items-center px-3 py-2 text-left text-xs font-semibold text-ink transition hover:bg-sunken-2"
                >
                  {v.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PricedItems({ rows, setRows, onPulse, pricingMode = "estimate", marketId, highlightIndex }: any) {
  const isFixed = pricingMode === "fixed";
  // Real, agent-registered stalls only — no catalogue, no photos, nothing
  // to keep updated. Empty until an agent has actually registered one for
  // this market, same as GET /markets/{id}/vendors returns for everyone else.
  const [vendors, setVendors] = useState<any[]>([]);
  useEffect(() => {
    if (!marketId || isFixed) return;
    let cancelled = false;
    api
      .getMarketVendors(marketId)
      .then((rows: any[]) => {
        if (!cancelled) setVendors(rows || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [marketId, isFixed]);

  function updateRow(i: number, field: string, value: string) {
    setRows((cur: any[]) => cur.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
    onPulse?.();
  }
  function addRow(prefill?: Partial<typeof EMPTY_ROW>) {
    setRows((cur: any[]) => [...cur, { ...EMPTY_ROW, ...prefill }]);
    onPulse?.();
  }
  function removeRow(i: number) {
    setRows((cur: any[]) => cur.filter((_, idx) => idx !== i));
    onPulse?.();
  }
  function unpinStall(i: number) {
    setRows((cur: any[]) =>
      cur.map((r, idx) => (idx === i ? { ...r, stallId: undefined, stallName: undefined } : r))
    );
  }
  function preferStall(i: number, v: any) {
    setRows((cur: any[]) =>
      cur.map((r, idx) => (idx === i ? { ...r, stallId: v.id, stallName: v.name } : r))
    );
    onPulse?.();
  }

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-display text-lg font-bold text-ink">
            {isFixed ? "Cart items" : "Detailed list"}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {isFixed
              ? "Add items with shelf prices — closer to a normal cart total."
              : "Item + what you expect to pay — your estimate, not a fixed restaurant cart."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => addRow()}
          className="hidden shrink-0 rounded-full border border-line-strong bg-surface px-3.5 py-2 text-sm font-bold text-ink transition hover:bg-sunken-2 sm:inline-flex"
        >
          + Add row
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row: any, i: number) => {
          const amount = (Number(row.price) || 0) * (Number(row.qty) || 0);
          const hint = priceHintForItem(row.item);
          return (
            <div
              key={i}
              className="rounded-2xl border border-line bg-surface p-4 shadow-xs transition-shadow duration-200 focus-within:shadow-sm focus-within:border-line-strong"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-faint">#{i + 1}</span>
                  {row.item.trim() && (
                    // The actual "jump" feedback for a quick-added item -
                    // its icon hops up and down as it lands, rather than
                    // the whole card just fading/scaling in.
                    <div
                      className={"relative h-5 w-5 shrink-0 " + (i === highlightIndex ? "animate-icon-jump" : "")}
                    >
                      <Image src={illustrationForItem(row.item)} alt="" className="h-full w-full object-contain" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  aria-label="Remove item"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-faint transition hover:bg-sunken hover:text-ink"
                >
                  ×
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1.4fr_0.7fr_0.5fr]">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-muted">Item</span>
                  <Input
                    value={row.item}
                    onChange={(e) => updateRow(i, "item", e.target.value)}
                    placeholder="e.g. tomatoes"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-muted">
                    {isFixed ? "Shelf ₦" : "Expect ₦"}
                  </span>
                  <Input
                    inputMode="decimal"
                    value={row.price}
                    onChange={(e) => updateRow(i, "price", e.target.value)}
                    placeholder={hint ? String(hint.min) : "0"}
                  />
                  {hint && !isFixed && (
                    <span className="mt-1 block text-[0.7rem] text-faint">
                      {formatPriceHint(hint)}
                    </span>
                  )}
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-muted">Qty</span>
                  <Input
                    inputMode="numeric"
                    value={row.qty}
                    onChange={(e) => updateRow(i, "qty", e.target.value)}
                  />
                </label>
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-semibold text-muted">Note</span>
                <Input
                  value={row.note}
                  onChange={(e) => updateRow(i, "note", e.target.value)}
                  placeholder="Optional — ripeness, brand, size…"
                />
              </label>
              <div className="mt-2 flex items-center justify-between gap-2">
                {row.stallId ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange/10 px-2.5 py-1 text-xs font-semibold text-brand-orange">
                    From {row.stallName}
                    <button
                      type="button"
                      onClick={() => unpinStall(i)}
                      aria-label={`Don't pin to ${row.stallName}`}
                      className="ml-0.5 leading-none text-brand-orange/70 hover:text-brand-orange"
                    >
                      ×
                    </button>
                  </span>
                ) : vendors.length > 0 ? (
                  <StallPicker vendors={vendors} onSelect={(v) => preferStall(i, v)} />
                ) : (
                  <span />
                )}
                {amount > 0 && (
                  <p className="text-right text-sm font-semibold text-ink">
                    Line · ₦{money(amount)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => addRow()}
        className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full border border-dashed border-line-strong text-sm font-bold text-ink transition hover:border-brand-orange/40 hover:bg-[#fff8f5] sm:hidden"
      >
        + Add another item
      </button>
    </div>
  );
}

function BudgetItems({ text, setText, budget, setBudget, onPulse }: any) {
  const parsed = useMemo(
    () =>
      text
        .split("\n")
        .map((l: string) => l.trim())
        .filter(Boolean)
        .map((l: string) => parseListLine(l)),
    [text]
  );
  const needsBudgetCount = parsed.filter((p: any) => p.price == null).length;
  const autoPricedTotal = parsed.reduce((sum: number, p: any) => sum + (p.price || 0), 0);

  return (
    <div>
      <p className="font-display text-lg font-bold text-ink">Free-text list</p>
      <p className="mb-3 text-sm text-muted">
        Paste or type one item per line — write it the way you&apos;d say it, like{" "}
        <span className="font-semibold text-ink">&quot;3 packs of milk 2000&quot;</span>, and
        we&apos;ll pick up the price and quantity automatically. No price? Just leave it, and cover
        it with a budget below.
      </p>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-muted">Items</span>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onPulse?.();
          }}
          rows={8}
          placeholder={"3 packs of milk 2000\nPepper 1500\nOnions\nTomatoes ₦800"}
          className="w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none transition focus:border-brand-orange/40 focus:ring-2 focus:ring-brand-orange/15"
        />
      </label>

      {parsed.length > 0 && (
        <div className="mt-3 rounded-2xl border border-line bg-surface p-3.5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-faint">
            We read it as
          </p>
          <div className="space-y-1.5">
            {parsed.map((p: any, i: number) => (
              // Unconditional here (unlike PricedItems' highlightIndex
              // tracking) - a chip always appends a new line at the end,
              // so a previously-unseen index is always a genuinely new DOM
              // node that mounts fresh and picks up the icon's jump
              // animation on its own; editing existing lines keeps their
              // index/key and just updates in place, no replay.
              <div key={i} className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5 truncate text-sm text-ink">
                  <div className="relative h-4 w-4 shrink-0 animate-icon-jump">
                    <Image src={illustrationForItem(p.description)} alt="" className="h-full w-full object-contain" />
                  </div>
                  <span className="truncate">
                    {p.description}
                    {p.quantity != null && (
                      <span className="ml-1.5 text-xs font-semibold text-faint">×{p.quantity}</span>
                    )}
                  </span>
                </span>
                {p.price != null ? (
                  <span className="shrink-0 text-sm font-semibold text-brand-green">
                    ₦{p.price.toLocaleString()}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-faint">no price — budget below</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {needsBudgetCount > 0 ? (
        <label className="mt-3 block max-w-xs">
          <span className="mb-1 block text-xs font-semibold text-muted">
            Budget for {needsBudgetCount} item{needsBudgetCount === 1 ? "" : "s"} without a price ₦
          </span>
          <Input
            inputMode="decimal"
            value={budget}
            onChange={(e) => {
              setBudget(e.target.value);
              onPulse?.();
            }}
          />
        </label>
      ) : (
        autoPricedTotal > 0 && (
          <p className="mt-3 text-sm text-muted">
            Every item has a price — nothing else to estimate.
          </p>
        )
      )}
    </div>
  );
}

/**
 * List composer — Detailed / Free-text.
 * When embedded, lives in the shop shell right column; mode comes from the left rail.
 */
function ListBuilder({
  initial,
  onContinue,
  marketId,
  marketName,
  onDraftChange,
  pricingMode = "estimate",
  embedded = false,
  standalone = false,
  continueLabel,
}: {
  initial?: any;
  onContinue: (payload: ShopListDraft) => void;
  marketId?: string;
  marketName?: string;
  onDraftChange?: (draft: ShopListDraft) => void;
  pricingMode?: "estimate" | "fixed";
  /** Rendered inside the shop shell's right column — rail drives mode, footer sticks within the panel. */
  embedded?: boolean;
  /** Rendered as its own page (list-first landing) — shows its own mode
      toggle, footer sticks within a normal-width container. */
  standalone?: boolean;
  /** Overrides the footer button's text (e.g. "Save changes" when editing a saved list). */
  continueLabel?: string;
}) {
  const shop = useShopOptional();
  const [mode, setMode] = useState<"detailed" | "freetext">(
    initial?.mode || shop?.listComposerMode || "detailed"
  );
  const [rows, setRows] = useState(initial?.rows?.length ? initial.rows : [{ ...EMPTY_ROW }]);
  const [budgetText, setBudgetText] = useState(initial?.budgetText || "");
  const [budget, setBudget] = useState(initial?.budget || "");
  const [pulse, setPulse] = useState(false);
  // Which detailed row just landed via a quick-add chip, so PricedItems can
  // play `animate-pop-in` on that one row only. Free-text doesn't need the
  // same tracking - a chip there always appends a new line, so its preview
  // list (keyed by index) mounts a genuinely new DOM node on its own and
  // picks up an entrance animation for free.
  const [justAddedIndex, setJustAddedIndex] = useState<number | null>(null);
  // The checker: an explicit "yes, this is right" the customer has to give
  // before Continue unlocks — not just a live preview they can scroll past.
  // Any edit invalidates it, so it always reflects what's about to be sent.
  const [confirmed, setConfirmed] = useState(false);

  // One-way sync only: when embedded, the rail (ShopSideRail's Compose
  // tools) is the sole source of truth for mode and writes to
  // shop.listComposerMode directly on click - this just mirrors that into
  // local state. The toggle pills that would set `mode` locally are hidden
  // whenever embedded (see the `!embedded &&` block below), so there is
  // nothing here that ever needs to push a value back the other way. A
  // second effect doing exactly that used to exist and could tug the two
  // values in opposite directions in the same commit, each effect racing to
  // "correct" the other - the classic infinite-update-depth loop.
  useEffect(() => {
    if (!embedded || !shop?.listComposerMode) return;
    setMode(shop.listComposerMode);
  }, [embedded, shop?.listComposerMode]);

  const chips = smartChipsForMarket(marketName);
  const draft = buildDraft(mode, rows, budgetText, budget);
  const isFixed = pricingMode === "fixed";
  // Both embedded and standalone keep the footer sticky within a padded
  // container rather than fixed to the viewport.
  const panelLayout = embedded || standalone;

  // The dock docks down to a slim strip while the page is actively
  // scrolling down (so it doesn't fight for attention while the user's
  // clearly reading further down the list), and opens back up the moment
  // they scroll back up or focus anything in the list (typing an item,
  // ticking the confirm box).
  //
  // Direction-based, not idle-timeout-based - an earlier version collapsed
  // on any scroll and re-expanded after 650ms of no scrolling, which
  // sounds fine but breaks under how people actually scroll: real scrolling
  // comes in bursts with gaps that often exceed 650ms, so it would spring
  // open mid-read and immediately re-collapse on the very next burst,
  // visibly flickering (confirmed by simulating a slow multi-tick scroll:
  // height cycled 62 -> 62 -> 62 -> 79.5 -> 62 px). Direction has no timer
  // to race against, so there's nothing to flicker.
  //
  // Toggling needs real hysteresis on top of that, though - a single wheel
  // "tick" isn't a reliable direction signal on its own. Real trackpad
  // scrolling sends a noisy, non-monotonic deltaY stream within one
  // continuous gesture (small reversals as the gesture accelerates/settles),
  // and the first version flipped `dockCollapsed` on any single delta past
  // a tiny 4px threshold - so one real scroll gesture could trigger several
  // collapse/expand flips in quick succession, each restarting the 300ms
  // transition mid-flight, which is exactly what reads as the dock
  // "shaking". Requiring 28px of *accumulated, uninterrupted* movement in
  // one direction before toggling (resetting the accumulator whenever the
  // instantaneous delta reverses) filters that noise out - a stray reversal
  // just zeroes the counter instead of flipping state outright.
  const [dockCollapsed, setDockCollapsed] = useState(false);
  // The dock's footprint in the page stays at its EXPANDED height even while
  // the card inside slims down. If the collapsed card actually shortened the
  // page, then at the very bottom the page's end would move under you: the
  // scroll position gets clamped upward, that reads as "scrolling up", the
  // dock expands, the page grows, and it bounces back and forth - the shake
  // you see after flicking to the bottom on a phone.
  const dockCardRef = useRef<HTMLDivElement>(null);
  const [dockReservedH, setDockReservedH] = useState<number | null>(null);
  useEffect(() => {
    if (dockCollapsed || !dockCardRef.current) return;
    const h = dockCardRef.current.offsetHeight;
    setDockReservedH((prev) => (prev == null || h > prev ? h : prev));
  });
  useEffect(() => {
    if (!panelLayout) return;
    let lastY = window.scrollY;
    let accum = 0;
    const THRESHOLD = 28;
    // After a toggle, ignore scrolling for the length of the resize
    // transition (and re-baseline): whatever scroll movement happens WHILE
    // the dock is resizing is the resize's own doing, not the user's intent,
    // and reading it as direction is what made it flip straight back.
    let lockUntil = 0;
    function onScroll() {
      const y = window.scrollY;
      if (performance.now() < lockUntil) {
        lastY = y;
        accum = 0;
        return;
      }
      const delta = y - lastY;
      lastY = y;
      if (delta === 0) return;
      if (y <= 80) {
        setDockCollapsed(false);
        accum = 0;
        return;
      }
      if (accum !== 0 && (delta > 0) !== (accum > 0)) accum = 0;
      accum += delta;
      if (accum > THRESHOLD) {
        setDockCollapsed(true);
        accum = 0;
        lockUntil = performance.now() + 450;
      } else if (accum < -THRESHOLD) {
        setDockCollapsed(false);
        accum = 0;
        lockUntil = performance.now() + 450;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [panelLayout]);
  function expandDock() {
    setDockCollapsed(false);
  }

  // A real total AND an explicit confirm — however the total was composed
  // (priced detailed rows, auto-parsed free-text lines, or the manual
  // budget covering whatever's left unpriced).
  const canContinue = draft.goodsTotal > 0 && confirmed;

  function pulseTotal() {
    setPulse(true);
  }

  useEffect(() => {
    onDraftChange?.(draft);
    setConfirmed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, rows, budgetText, budget]);

  useEffect(() => {
    if (!pulse) return;
    const t = setTimeout(() => setPulse(false), 280);
    return () => clearTimeout(t);
  }, [pulse, draft.goodsTotal, draft.itemCount]);

  function addChip(label: string) {
    if (mode === "detailed") {
      const emptyIdx = rows.findIndex((r: any) => !r.item.trim());
      const landedIndex = emptyIdx >= 0 ? emptyIdx : rows.length;
      if (emptyIdx >= 0) {
        setRows((cur: any[]) =>
          cur.map((r, i) => (i === emptyIdx ? { ...r, item: label } : r))
        );
      } else {
        setRows((cur: any[]) => [...cur, { ...EMPTY_ROW, item: label }]);
      }
      // Filling an existing empty row reuses the same key, so React won't
      // remount it - `justAddedIndex` drives the pop-in animation
      // explicitly instead of relying on mount detection, which only the
      // append case would get for free.
      setJustAddedIndex(landedIndex);
      // 750ms > the 0.7s icon-jump animation duration - clearing the class
      // before it finishes would cut the bounce off mid-motion instead of
      // letting it settle.
      setTimeout(() => setJustAddedIndex((cur) => (cur === landedIndex ? null : cur)), 750);
    } else {
      setBudgetText((cur: string) => (cur.trim() ? `${cur.trim()}\n${label}` : label));
    }
    pulseTotal();
  }

  return (
    <div
      className={"relative " + (panelLayout ? "w-full pb-0" : "pb-28")}
      onFocus={expandDock}
    >
      {!embedded && (
        // `bg-canvas-deep` (warm, matches the cream page it sits on), not
        // `bg-sunken` (a cool gray token meant for panel interiors - here
        // it clashed against the warm page background right at the
        // track's edge, reading as a stray mismatched box rather than one
        // continuous toggle).
        <div className="mb-4 flex rounded-full border border-line bg-canvas-deep p-1">
          {(
            [
              ["detailed", "Detailed"],
              ["freetext", "Free-text"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={
                "flex-1 rounded-full py-2.5 text-sm font-bold transition " +
                (mode === id
                  ? "bg-surface text-ink shadow-sm"
                  : "text-muted hover:text-ink")
              }
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="mb-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-faint">Quick add from market</p>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => {
            const img = illustrationForItem(chip);
            return (
              <button
                key={chip}
                type="button"
                onClick={() => addChip(chip)}
                // `relative` + `pl-8` (instead of the old `gap-2` + gutter
                // for a small inline icon) - the icon is now absolutely
                // positioned and deliberately larger than the pill itself,
                // so it needs to come out of flow entirely (an in-flow
                // image this size would blow the pill's height out) and
                // the label needs its own reserved left margin to clear it.
                className="group relative flex items-center rounded-full border border-line bg-surface py-1.5 pl-8 pr-3 text-xs font-bold text-ink shadow-xs transition hover:border-brand-orange/40 hover:bg-brand-orange/10 active:scale-95"
              >
                {/* Sized past the pill's own height (36px vs. the pill's
                    ~28px) and nudged left/up so it visibly bleeds off the
                    edge like a sticker, rather than sitting neatly inside
                    the pill the way the old 16px inline icon did. */}
                <div className="pointer-events-none absolute -left-1.5 -top-1.5 h-9 w-9 shrink-0 transition-transform group-hover:scale-110">
                  <Image src={img} alt="" className="h-full w-full object-contain drop-shadow-sm" />
                </div>
                <span>+ {chip}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* `key={mode}` forces React to remount this block on every switch,
          which re-triggers `animate-chalk-in` (fade + slide-in from the
          left, 0.35s, no delay) each time instead of just once on first
          mount - was a bare mode ? A : B with no transition at all, so
          Detailed/Free-text used to swap instantly. */}
      <div key={mode} className="animate-chalk-in">
        {mode === "detailed" ? (
          <PricedItems
            rows={rows}
            setRows={setRows}
            onPulse={pulseTotal}
            pricingMode={pricingMode}
            marketId={marketId}
            highlightIndex={justAddedIndex}
          />
        ) : (
          <BudgetItems
            text={budgetText}
            setText={setBudgetText}
            budget={budget}
            setBudget={setBudget}
            onPulse={pulseTotal}
          />
        )}
      </div>

      <p className="mt-6 rounded-2xl border border-line bg-sunken-2 px-4 py-3 text-sm text-muted">
        {isFixed ? (
          <>
            <span className="font-bold text-ink">Shelf total</span> — supermarket prices are fixed at
            checkout. Qyka still picks and delivers for you.
          </>
        ) : (
          <>
            <span className="font-bold text-ink">Your estimate</span> — real prices come from
            bargaining at the market, not a catalogue.
          </>
        )}
      </p>

      {/* The checker: everyone's about to send this to a real person to buy
          for real money — one last look at exactly what we understood,
          plus an explicit yes, before Continue unlocks. */}
      {draft.itemCount > 0 && (
        <div className="mt-4 rounded-3xl border border-line bg-surface p-4 shadow-sm">
          <p className="font-display text-base font-bold text-ink">Review your list</p>
          <p className="mb-3 text-xs text-faint">
            Check this is right before it goes to your agent.
          </p>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {draft.items.map((it: any, i: number) => {
              const itemImg = illustrationForItem(it.description);
              return (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 border-b border-sunken pb-2 last:border-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sunken p-1">
                      <Image src={itemImg} alt="" className="h-full w-full object-contain" />
                    </div>
                    <span className="min-w-0 truncate text-sm font-semibold text-ink">
                      {it.description}
                      {it.quantity != null && (
                        <span className="ml-1.5 text-xs font-semibold text-faint">×{it.quantity}</span>
                      )}
                    </span>
                  </div>
                  {it.listed_price != null ? (
                    <span className="shrink-0 text-sm font-bold text-ink">
                      ₦{Number(it.listed_price).toLocaleString()}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs font-semibold text-faint">from budget</span>
                  )}
                </div>
              );
            })}
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl bg-sunken-2 p-3 transition hover:bg-chalk">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-brand-orange"
            />
            <span className="text-sm font-semibold text-ink">This is right — send it to my agent</span>
          </label>
        </div>
      )}

      {/* On phones the sticky offset clears the floating bottom tab bar
          (5.5rem = its height + gap + safe area); from `md` there is no tab
          bar, so it's the original 1rem. */}
      {/* Floating dock, mirroring DesktopTopBar's own floating-card pattern
          (`rounded-2xl`, `border-line`, `shadow-xs`, `bg-surface`) instead
          of a bespoke shape - this app already has one established
          "floating bar" language. No side padding of its own: the parent
          page container (NewOrderFlow's step-1 wrapper) already supplies
          the page gutter, and adding another layer here was quietly
          insetting this dock narrower than its own siblings above it
          (ShopHeroSpotlight, the list rows) - same width now, not a
          near-match. `bottom-4` (not `bottom-0`) is deliberate: the
          topbar's `top-4` leaves the same kind of visible cream margin
          above it, so a matching gap below this dock is the established
          look, not the "empty space" bug from before - that bug was the
          dock's *own* trailing padding stacking with its parents', not
          this intentional margin.

          `dockCollapsed` slims it to a compact strip while the page is
          mid-scroll (see the effect above) and restores it the moment
          scrolling settles or the user focuses anything in the list -
          purely a size/detail transition, every control stays mounted and
          clickable throughout, nothing disappears then needs a re-render
          to come back. */}
      {/* `overflow-anchor: none` - a defensive measure against Chrome's
          scroll-anchoring: an element that resizes itself in response to
          scroll position is exactly the pattern anchoring can misfire on
          (it nudges scrollY to compensate for a layout shift near the
          viewport, which would then feed back into the scroll handler
          above). Cheap to keep even if not the primary cause of the
          shaking - it only ever prevents an unwanted correction, never a
          wanted one. */}
      <div
        className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 mt-8 flex w-full items-end md:bottom-4"
        style={{ overflowAnchor: "none", minHeight: dockReservedH ?? undefined }}
      >
        <div
          ref={dockCardRef}
          className={
            "relative w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-xs transition-[padding] duration-300 ease-premium " +
            (dockCollapsed ? "px-3 py-2" : "px-4 py-3 md:px-6")
          }
        >
          {/* Quiet accents, same z-0/z-10 pairing used everywhere else in
              the app - `overflow-hidden` on this card clips them to its own
              rounded corners, and they fade out with the rest of the dock
              when it collapses on scroll (no separate opacity wiring
              needed, they're just behind content that already animates). */}
          <Image
            src={netBag}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -left-2 -top-3 z-0 w-12 -rotate-6 opacity-[0.12]"
          />
          <Image
            src={squiggleArrow}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -right-3 -bottom-2 z-0 w-16 rotate-6 opacity-[0.14]"
          />
          {/* Two more, centered in the gap between the total and the
              button rather than another corner - same "peek from the edge,
              mostly hidden behind real content" language ShopHeader's
              center accents use, not full pieces competing with the total/
              CTA for attention. `top-0`/`bottom-0`, NOT `-top-3`/`-bottom-3`
              - this card has `overflow-hidden` (added earlier to clip the
              two corner accents to the rounded corners), which clips
              anything positioned outside the box's own bounds entirely,
              not just partially. A negative offset here doesn't "peek from
              the edge", it renders fully off-box and gets clipped to
              nothing - confirmed empirically (screenshot showed neither
              accent). Staying inside the box (flush with the edge) is what
              actually keeps them visible while still reading as tucked
              into the corner/edge. */}
          <Image
            src={dotArrow}
            alt=""
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 z-0 w-10 -translate-x-1/2 -rotate-6 opacity-[0.16]"
          />
          <Image
            src={dottedSquares}
            alt=""
            aria-hidden
            className="pointer-events-none absolute left-1/2 bottom-0 z-0 w-10 translate-x-4 rotate-6 opacity-[0.16]"
          />
          <div className="relative z-10 flex w-full items-center gap-3">
            <div className={"min-w-0 flex-1 rounded-xl transition-all duration-300 ease-premium " + (dockCollapsed ? "px-1" : "px-3 py-2") + " " + flashClass(pulse)}>
              <p
                className={
                  "overflow-hidden font-bold uppercase tracking-wide text-faint transition-all duration-300 ease-premium " +
                  (dockCollapsed ? "max-h-0 text-[0px] opacity-0" : "max-h-5 text-[0.65rem] opacity-100")
                }
              >
                {isFixed ? "Cart total" : "Your estimate"} · {draft.itemCount} item
                {draft.itemCount === 1 ? "" : "s"}
              </p>
              <p className={"truncate font-display font-extrabold text-ink transition-[font-size] duration-300 ease-premium " + (dockCollapsed ? "text-base" : "text-xl")}>
                ₦{money(draft.goodsTotal)}
              </p>
            </div>
            <Button
              onClick={() => onContinue(draft)}
              disabled={!canContinue}
              className={"shrink-0 transition-all duration-300 ease-premium " + (dockCollapsed ? "min-h-0 h-9 px-3.5 text-xs" : "px-5")}
            >
              {continueLabel ?? (marketId ? "Continue" : "Next: pick market")}
            </Button>
          </div>
          {!canContinue && (
            <p
              className={
                "relative z-10 w-full overflow-hidden text-center text-xs text-faint transition-all duration-300 ease-premium " +
                (dockCollapsed ? "max-h-0 opacity-0" : "mt-1 max-h-8 opacity-100")
              }
            >
              {draft.goodsTotal > 0
                ? "Check the box above to confirm your list."
                : "Add a priced item, or a free-text list with a budget."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ListBuilder;
