"use client";

import { useEffect, useState } from "react";
import Button from "./Button";
import Input from "./Input";
import { formatPriceHint, priceHintForItem, smartChipsForMarket } from "@/lib/marketHints";
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
  const unstructuredTotal = budgetLines.length > 0 ? Number(budget) || 0 : 0;
  const goodsTotal = pricedTotal + unstructuredTotal;
  const itemCount = pricedItems.length + budgetLines.length;
  return {
    mode,
    rows,
    budgetText,
    budget,
    goodsTotal,
    pricedTotal,
    unstructuredTotal,
    itemCount,
    items: [
      ...pricedItems.map((r: any) => ({
        description: r.item.trim(),
        listed_price: money((Number(r.price) || 0) * (Number(r.qty) || 0)),
        quantity: Number(r.qty) || 1,
        requested_note: r.note.trim() || null,
      })),
      ...budgetLines.map((l: string) => ({ description: l })),
    ],
  };
}

function PricedItems({ rows, setRows, onPulse, pricingMode = "estimate" }: any) {
  const isFixed = pricingMode === "fixed";
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
              className="rounded-2xl border border-[#ebe7e0] bg-white p-4 shadow-[0_1px_2px_rgba(33,26,20,0.04)]"
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
              {amount > 0 && (
                <p className="mt-2 text-right text-sm font-semibold text-ink">
                  Line · ₦{money(amount)}
                </p>
              )}
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
  return (
    <div>
      <p className="font-display text-lg font-bold text-ink">Free-text list</p>
      <p className="mb-3 text-sm text-[#6b635a]">
        Paste or type one item per line, then set a total budget for the agent.
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
          placeholder={"tomatoes\npepper\nonions\nrice"}
          className="w-full resize-y rounded-2xl border border-[#ebe7e0] bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand-orange/40 focus:ring-2 focus:ring-brand-orange/15"
        />
      </label>
      <label className="mt-3 block max-w-xs">
        <span className="mb-1 block text-xs font-semibold text-[#6b635a]">Budget ₦</span>
        <Input
          inputMode="decimal"
          value={budget}
          onChange={(e) => {
            setBudget(e.target.value);
            onPulse?.();
          }}
        />
      </label>
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
  marketName,
  onDraftChange,
  pricingMode = "estimate",
  embedded = false,
}: {
  initial?: any;
  onContinue: (payload: ShopListDraft) => void;
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

  useEffect(() => {
    if (!embedded || !shop?.listComposerMode) return;
    setMode(shop.listComposerMode);
  }, [embedded, shop?.listComposerMode]);

  useEffect(() => {
    if (!embedded) return;
    shop?.setListComposerMode(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, embedded]);

  const chips = smartChipsForMarket(marketName);
  const draft = buildDraft(mode, rows, budgetText, budget);
  const isFixed = pricingMode === "fixed";

  const canContinue =
    draft.pricedTotal > 0 ||
    (budgetText.split("\n").map((l) => l.trim()).filter(Boolean).length > 0 &&
      draft.unstructuredTotal > 0);

  function pulseTotal() {
    setPulse(true);
  }

  useEffect(() => {
    onDraftChange?.(draft);
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
        <PricedItems rows={rows} setRows={setRows} onPulse={pulseTotal} pricingMode={pricingMode} />
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

      {/* Embedded: sticky within the right panel only — never covers the left rail */}
      <div
        className={
          embedded
            ? "sticky bottom-0 z-20 -mx-4 mt-8 border-t border-[#ebe7e0] bg-white/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8"
            : "fixed bottom-0 left-0 right-0 z-20 border-t border-[#ebe7e0] bg-white/95 px-4 py-3 backdrop-blur"
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
            Add a priced item, or a free-text list with a budget.
          </p>
        )}
      </div>
    </div>
  );
}

export default ListBuilder;
