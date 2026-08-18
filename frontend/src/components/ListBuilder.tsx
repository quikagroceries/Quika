"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Button from "./Button";
import Input from "./Input";
import { api } from "@/lib/api";
import { formatPriceHint, priceHintForItem, smartChipsForMarket } from "@/lib/marketHints";
import { parseListLine } from "@/lib/parseListLine";
import { useShopOptional, type ShopListDraft } from "@/components/shop/ShopContext";

const EMPTY_ROW = { item: "", price: "", qty: "1", note: "" };

function money(n: number) {
  return (Number(n) || 0).toFixed(2);
}

function flashClass(flash: boolean) {
  return flash ? "scale-[1.02] bg-brand-green/10 ring-brand-green/30" : "";
}

function buildDraft(
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
            : "border-[#ddd6cb] bg-white text-[#6b635a] hover:bg-[#faf9f7]")
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
          className="absolute left-0 top-[calc(100%+6px)] z-30 w-60 overflow-hidden rounded-xl border border-[#ebe7e0] bg-white shadow-[0_12px_28px_rgba(33,26,20,0.12)]"
        >
          <div className="border-b border-[#ebe7e0] p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stalls…"
              className="w-full rounded-lg border border-[#ebe7e0] px-2.5 py-1.5 text-xs text-ink outline-none transition focus:border-brand-orange/40"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-[#8a8178]">No stalls match</p>
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
                  className="flex w-full items-center px-3 py-2 text-left text-xs font-semibold text-ink transition hover:bg-[#f7f5f2]"
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

function PricedItems({ rows, setRows, onPulse, pricingMode = "estimate", marketId }: any) {
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
          <p className="mt-0.5 text-sm text-[#6b635a]">
            {isFixed
              ? "Add items with shelf prices — closer to a normal cart total."
              : "Item + what you expect to pay — your estimate, not a fixed restaurant cart."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => addRow()}
          className="hidden shrink-0 rounded-full border border-[#ddd6cb] bg-white px-3.5 py-2 text-sm font-bold text-ink transition hover:bg-[#faf9f7] sm:inline-flex"
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
              className="rounded-2xl border border-[#ebe7e0] bg-white p-4 shadow-xs transition-shadow duration-200 focus-within:shadow-sm focus-within:border-[#ddd6cb]"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-[#8a8178]">#{i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  aria-label="Remove item"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-[#8a8178] transition hover:bg-[#f0eeeb] hover:text-ink"
                >
                  ×
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1.4fr_0.7fr_0.5fr]">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#6b635a]">Item</span>
                  <Input
                    value={row.item}
                    onChange={(e) => updateRow(i, "item", e.target.value)}
                    placeholder="e.g. tomatoes"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#6b635a]">
                    {isFixed ? "Shelf ₦" : "Expect ₦"}
                  </span>
                  <Input
                    inputMode="decimal"
                    value={row.price}
                    onChange={(e) => updateRow(i, "price", e.target.value)}
                    placeholder={hint ? String(hint.min) : "0"}
                  />
                  {hint && !isFixed && (
                    <span className="mt-1 block text-[0.7rem] text-[#8a8178]">
                      {formatPriceHint(hint)}
                    </span>
                  )}
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-[#6b635a]">Qty</span>
                  <Input
                    inputMode="numeric"
                    value={row.qty}
                    onChange={(e) => updateRow(i, "qty", e.target.value)}
                  />
                </label>
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-semibold text-[#6b635a]">Note</span>
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
        className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full border border-dashed border-[#ddd6cb] text-sm font-bold text-ink transition hover:border-brand-orange/40 hover:bg-[#fff8f5] sm:hidden"
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
      <p className="mb-3 text-sm text-[#6b635a]">
        Paste or type one item per line — write it the way you&apos;d say it, like{" "}
        <span className="font-semibold text-ink">&quot;3 packs of milk 2000&quot;</span>, and
        we&apos;ll pick up the price and quantity automatically. No price? Just leave it, and cover
        it with a budget below.
      </p>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-[#6b635a]">Items</span>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onPulse?.();
          }}
          rows={8}
          placeholder={"3 packs of milk 2000\nPepper 1500\nOnions\nTomatoes ₦800"}
          className="w-full resize-y rounded-2xl border border-[#ebe7e0] bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand-orange/40 focus:ring-2 focus:ring-brand-orange/15"
        />
      </label>

      {parsed.length > 0 && (
        <div className="mt-3 rounded-2xl border border-[#ebe7e0] bg-white p-3.5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#8a8178]">
            We read it as
          </p>
          <div className="space-y-1.5">
            {parsed.map((p: any, i: number) => (
              <div key={i} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-ink">
                  {p.description}
                  {p.quantity != null && (
                    <span className="ml-1.5 text-xs font-semibold text-[#8a8178]">×{p.quantity}</span>
                  )}
                </span>
                {p.price != null ? (
                  <span className="shrink-0 text-sm font-semibold text-brand-green">
                    ₦{p.price.toLocaleString()}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-[#8a8178]">no price — budget below</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {needsBudgetCount > 0 ? (
        <label className="mt-3 block max-w-xs">
          <span className="mb-1 block text-xs font-semibold text-[#6b635a]">
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
          <p className="mt-3 text-sm text-[#6b635a]">
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
}: {
  initial?: any;
  onContinue: (payload: ShopListDraft) => void;
  marketId?: string;
  marketName?: string;
  onDraftChange?: (draft: ShopListDraft) => void;
  pricingMode?: "estimate" | "fixed";
  embedded?: boolean;
}) {
  const shop = useShopOptional();
  const [mode, setMode] = useState<"detailed" | "freetext">(
    initial?.mode || shop?.listComposerMode || "detailed"
  );
  const [rows, setRows] = useState(initial?.rows?.length ? initial.rows : [{ ...EMPTY_ROW }]);
  const [budgetText, setBudgetText] = useState(initial?.budgetText || "");
  const [budget, setBudget] = useState(initial?.budget || "");
  const [pulse, setPulse] = useState(false);
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
      if (emptyIdx >= 0) {
        setRows((cur: any[]) =>
          cur.map((r, i) => (i === emptyIdx ? { ...r, item: label } : r))
        );
      } else {
        setRows((cur: any[]) => [...cur, { ...EMPTY_ROW, item: label }]);
      }
    } else {
      setBudgetText((cur: string) => (cur.trim() ? `${cur.trim()}\n${label}` : label));
    }
    pulseTotal();
  }

  return (
    <div className={"relative " + (embedded ? "w-full pb-4" : "pb-28")}>
      {!embedded && (
        <div className="mb-4 flex rounded-full border border-[#ebe7e0] bg-[#f0eeeb] p-1">
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
                  ? "bg-white text-ink shadow-sm"
                  : "text-[#6b635a] hover:text-ink")
              }
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="mb-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#8a8178]">Quick add</p>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button key={chip} type="button" onClick={() => addChip(chip)} className="shop-chip">
              + {chip}
            </button>
          ))}
        </div>
      </div>

      {mode === "detailed" ? (
        <PricedItems
          rows={rows}
          setRows={setRows}
          onPulse={pulseTotal}
          pricingMode={pricingMode}
          marketId={marketId}
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

      <p className="mt-6 rounded-2xl border border-[#ebe7e0] bg-[#faf9f7] px-4 py-3 text-sm text-[#6b635a]">
        {isFixed ? (
          <>
            <span className="font-bold text-ink">Shelf total</span> — supermarket prices are fixed at
            checkout. Quika still picks and delivers for you.
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
        <div className="mt-4 rounded-2xl border border-[#ebe7e0] bg-white p-4 shadow-sm">
          <p className="font-display text-base font-bold text-ink">Review your list</p>
          <p className="mb-3 text-xs text-[#8a8178]">
            Check this is right before it goes to your agent.
          </p>
          <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {draft.items.map((it: any, i: number) => (
              <div
                key={i}
                className="flex items-baseline justify-between gap-3 border-b border-[#f0eeeb] pb-1.5 last:border-0 last:pb-0"
              >
                <span className="min-w-0 truncate text-sm text-ink">
                  {it.description}
                  {it.quantity != null && (
                    <span className="ml-1.5 text-xs font-semibold text-[#8a8178]">×{it.quantity}</span>
                  )}
                </span>
                {it.listed_price != null ? (
                  <span className="shrink-0 text-sm font-semibold text-ink">
                    ₦{Number(it.listed_price).toLocaleString()}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-[#8a8178]">from budget</span>
                )}
              </div>
            ))}
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl bg-[#faf9f7] p-3 transition hover:bg-[#f4f0e6]">
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

      {/* Embedded: sticky within the right panel only — never covers the left rail */}
      <div
        className={
          embedded
            ? "sticky bottom-16 z-20 -mx-4 mt-8 border-t border-[#ebe7e0] bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-8px_rgb(33_26_20_/_0.1)] backdrop-blur md:bottom-0 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8"
            : "fixed bottom-16 left-0 right-0 z-20 border-t border-[#ebe7e0] bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-8px_rgb(33_26_20_/_0.1)] backdrop-blur md:bottom-0"
        }
      >
        <div className={"flex w-full items-center gap-3 " + (embedded ? "" : "mx-auto max-w-3xl")}>
          <div className={"min-w-0 flex-1 rounded-xl px-3 py-2 transition " + flashClass(pulse)}>
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[#8a8178]">
              {isFixed ? "Cart total" : "Your estimate"} · {draft.itemCount} item
              {draft.itemCount === 1 ? "" : "s"}
            </p>
            <p className="truncate font-display text-xl font-extrabold text-ink">
              ₦{money(draft.goodsTotal)}
            </p>
          </div>
          <Button
            onClick={() => onContinue(draft)}
            disabled={!canContinue}
            className="shrink-0 px-5"
          >
            Continue
          </Button>
        </div>
        {!canContinue && (
          <p className="mt-1 w-full text-center text-xs text-[#8a8178]">
            {draft.goodsTotal > 0
              ? "Check the box above to confirm your list."
              : "Add a priced item, or a free-text list with a budget."}
          </p>
        )}
      </div>
    </div>
  );
}

export default ListBuilder;
