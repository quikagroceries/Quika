'use client';

import { useState } from "react";
import Button from "./Button";
import Input from "./Input";

const EMPTY_ROW = { item: "", price: "", qty: "1", note: "" };

function money(n) {
  return (Number(n) || 0).toFixed(2);
}

// One combined composer: priced ("detailed") rows and a free-text budget
// list both live on the same screen and both count toward the same goods
// total - a customer can use either section alone, or both together. Price/
// Qty each get their own plain wrapper div (flex-1 / w-20) rather than a
// second width class directly on Input (which always renders "w-full"
// itself) - putting a conflicting width utility on the same element let
// Tailwind's generated rule order silently decide which one wins, which is
// what previously made the Qty box render full-width and swallow the value
// meant for Price.
function PricedItems({ rows, setRows }: any) {
  function updateRow(i, field, value) {
    setRows((cur) => cur.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }
  function addRow() {
    setRows((cur) => [...cur, { ...EMPTY_ROW }]);
  }
  function removeRow(i) {
    setRows((cur) => cur.filter((_, idx) => idx !== i));
  }

  const total = rows.reduce((sum, r) => sum + (Number(r.price) || 0) * (Number(r.qty) || 0), 0);

  return (
    <div>
      <p className="text-lg font-bold text-slate-900">Priced items</p>
      <p className="mb-3 text-sm text-slate-500">List each item with its own price and quantity.</p>

      <div className="space-y-3">
        {rows.map((row, i) => {
          const amount = (Number(row.price) || 0) * (Number(row.qty) || 0);
          return (
            <div key={i} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                <button
                  onClick={() => removeRow(i)}
                  aria-label="Remove item"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  ×
                </button>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Item</span>
                  <Input placeholder="e.g. Rice" value={row.item} onChange={(e) => updateRow(i, "item", e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">Price (₦)</span>
                    <Input placeholder="0.00" inputMode="decimal" value={row.price} onChange={(e) => updateRow(i, "price", e.target.value)} />
                  </div>
                  <div className="w-20 shrink-0">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">Qty</span>
                    <Input placeholder="1" inputMode="numeric" value={row.qty} onChange={(e) => updateRow(i, "qty", e.target.value)} />
                  </div>
                </div>
                <div>
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Description (optional)</span>
                  <Input
                    placeholder="e.g. Mama Chidinma's stall, ripe ones"
                    value={row.note}
                    onChange={(e) => updateRow(i, "note", e.target.value)}
                  />
                </div>
                <div className="flex justify-end text-sm text-slate-500">
                  Amount: <span className="ml-1 font-semibold text-slate-900">₦{money(amount)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Button variant="neutral" onClick={addRow} fullWidth className="mt-3">+ Add priced item</Button>

      {rows.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-slate-700">
          <span className="font-semibold">Priced subtotal</span>
          <span className="font-bold text-slate-900">₦{money(total)}</span>
        </div>
      )}
    </div>
  );
}

function BudgetItems({ text, setText, budget, setBudget }: any) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <div>
      <p className="text-lg font-bold text-slate-900">Other items (budget)</p>
      <p className="mb-3 text-sm text-slate-500">
        Anything you don't want to price separately — write the list and set one combined budget for it.
        Pricing each line is optional but helps your agent shop to your expectations.
      </p>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-700">Your list</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"One item per line, e.g.\nRice (3k)\nBeans (5k)\nPepper (2k)"}
          rows={5}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-brand-orange"
        />
      </label>
      {lines.length > 0 && (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          {lines.map((l, i) => <li key={i}>{l}</li>)}
        </ol>
      )}
      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-semibold text-slate-700">
          Estimated budget for these items (₦){lines.length > 0 ? "" : " — optional"}
        </span>
        <Input placeholder="e.g. 15000" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} />
      </label>
    </div>
  );
}

// Phase 5: a standalone composer step - not a chat, not a modal, not a
// forced either/or. Priced items and budget items live side by side and
// both feed the same goods total, so a customer can use one section, the
// other, or both together. `initial` (a previously staged payload) lets
// "Edit list" navigate back here pre-filled without losing work.
function ListBuilder({ initial, onContinue }: any) {
  const [rows, setRows] = useState(initial?.rows?.length ? initial.rows : [{ ...EMPTY_ROW }]);
  const [budgetText, setBudgetText] = useState(initial?.budgetText || "");
  const [budget, setBudget] = useState(initial?.budget || "");

  const pricedItems = rows.filter((r) => r.item.trim().length > 0);
  const pricedTotal = pricedItems.reduce((sum, r) => sum + (Number(r.price) || 0) * (Number(r.qty) || 0), 0);
  const budgetLines = budgetText.split("\n").map((l) => l.trim()).filter(Boolean);
  const unstructuredTotal = budgetLines.length > 0 ? Number(budget) || 0 : 0;
  const goodsTotal = pricedTotal + unstructuredTotal;

  const canSubmit =
    pricedItems.length > 0 || (budgetLines.length > 0 && unstructuredTotal > 0);

  function handleSubmit() {
    onContinue({
      goodsTotal,
      pricedTotal,
      unstructuredTotal,
      rows, budgetText, budget, // raw state, so "Edit list" can come back here prefilled
      items: [
        ...pricedItems.map((r) => ({
          description: r.item.trim(),
          listed_price: money((Number(r.price) || 0) * (Number(r.qty) || 0)),
          quantity: Number(r.qty) || 1,
          requested_note: r.note.trim() || null,
        })),
        ...budgetLines.map((l) => ({ description: l })),
      ],
    });
  }

  return (
    <div className="space-y-6">
      <PricedItems rows={rows} setRows={setRows} />
      <div className="border-t border-slate-200 pt-6">
        <BudgetItems text={budgetText} setText={setBudgetText} budget={budget} setBudget={setBudget} />
      </div>

      <div className="rounded-xl bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between text-slate-900">
          <span className="font-semibold">Goods total</span>
          <span className="text-lg font-bold">₦{money(goodsTotal)}</span>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          Prices here are a guide, not a fixed order — your agent still bargains at the market either way.
        </p>
        <Button onClick={handleSubmit} disabled={!canSubmit} fullWidth>
          Continue
        </Button>
        {!canSubmit && (
          <p className="mt-2 text-center text-sm text-slate-500">
            Add at least one priced item, or a budget list with an amount.
          </p>
        )}
      </div>
    </div>
  );
}

export default ListBuilder;
