import { buildDraft } from "@/components/ListBuilder";
import type { ShopListDraft } from "@/components/shop/ShopContext";

// Turns a saved order's items back into the list builder's own draft shape,
// so a past order or draft can be re-opened for editing or reused as the
// start of a new one. The order stores each priced item as a TOTAL
// (unit price x quantity, see buildDraft), so the unit price is recovered by
// dividing back out. Items with no price were "budget" lines - they go back
// into the free-text box, with the budget figure recovered as whatever part
// of the goods estimate the priced items don't already account for.
export function draftFromOrder(order: any): ShopListDraft {
  const items: any[] = order.items || [];
  const priced = items.filter((it) => it.listed_price != null);
  const unpriced = items.filter((it) => it.listed_price == null);

  const rows = priced.map((it) => {
    const qty = Number(it.quantity) || 1;
    const unit = Number(it.listed_price) / qty;
    return {
      item: it.description,
      price: String(Number.isInteger(unit) ? unit : Number(unit.toFixed(2))),
      qty: String(qty),
      note: it.requested_note || "",
      stallId: it.preferred_stall_id || undefined,
    };
  });

  const pricedSum = priced.reduce((s, it) => s + Number(it.listed_price), 0);
  const budget = Math.max(0, Number(order.goods_estimate || 0) - pricedSum);

  return buildDraft(
    priced.length > 0 ? "detailed" : "freetext",
    rows.length > 0 ? rows : [{ item: "", price: "", qty: "1", note: "" }],
    unpriced.map((it) => it.description).join("\n"),
    unpriced.length > 0 && budget > 0 ? String(budget) : ""
  );
}
