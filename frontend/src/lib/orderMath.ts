/**
 * Client-side money math for the live shopping view. The backend leaves
 * order.items_total / grand_total at 0.00 until finish_shopping runs, so a
 * "running bill" and a "savings so far" have to be summed from the items:
 * each item carries the customer's own estimate (listed_price) and, once the
 * agent buys it, the real price (confirmed_price).
 */

export type SavingsSummary = {
  /** Items with a confirmed real price. */
  boughtCount: number;
  totalCount: number;
  /** Σ listed_price of the items bought so far (their estimate). */
  estSoFar: number;
  /** Σ confirmed_price of the items bought so far (what was actually paid). */
  actualSoFar: number;
  /** estSoFar − actualSoFar. Positive = under the customer's estimate. */
  saved: number;
  /** Σ listed_price of every item that carries one. */
  listEstimate: number;
  /** actualSoFar + Σ listed_price of items still to be bought — a live
      projection of the goods total once shopping finishes. */
  projectedGoods: number;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** An item is "settled and won't be bought" — excluded from the projection. */
function isDropped(item: any): boolean {
  return item?.availability === "dropped";
}

export function computeSavings(items: any[] | null | undefined): SavingsSummary {
  const list = items || [];
  let estSoFar = 0;
  let actualSoFar = 0;
  let boughtCount = 0;
  let listEstimate = 0;
  let pendingEstimate = 0;

  for (const it of list) {
    const listed = it?.listed_price != null ? num(it.listed_price) : 0;
    listEstimate += listed;

    const bought = it?.confirmed_price != null;
    if (bought) {
      boughtCount += 1;
      actualSoFar += num(it.confirmed_price);
      estSoFar += listed;
    } else if (!isDropped(it)) {
      pendingEstimate += listed;
    }
  }

  return {
    boughtCount,
    totalCount: list.length,
    estSoFar,
    actualSoFar,
    saved: estSoFar - actualSoFar,
    listEstimate,
    projectedGoods: actualSoFar + pendingEstimate,
  };
}

/** ₦ with thousands separators, no decimals unless there are kobo. */
export function naira(v: unknown): string {
  const n = num(v);
  const hasKobo = Math.round(n * 100) % 100 !== 0;
  return (
    "₦" +
    n.toLocaleString(undefined, {
      minimumFractionDigits: hasKobo ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}
