/**
 * Best-effort price + quantity extraction for one free-typed shopping-list
 * line, e.g. "3 packs of milk 2000" -> { description: "packs of milk",
 * price: 2000, quantity: 3 }. Lets the layman just type naturally instead
 * of filling separate item/price/qty fields.
 *
 * The extracted price is always treated as the line's FULL stated amount,
 * never a per-unit rate to multiply by quantity — same as everywhere else
 * in this app, quantity is a display label only (see OrderItem.quantity),
 * it never factors into any total.
 */

export type ParsedLine = { description: string; price: number | null; quantity: number | null };

// A number only counts as a price when it's clearly separated from the item
// text (space/dash/colon/@, or attached to a currency marker) - this keeps
// "3in1" or "2kg" glued mid-word from being misread. And it must be
// plausible as a Naira price (>= 20) - this keeps "Tomatoes 2" (almost
// certainly a quantity) from being misread as a ₦2 price, while still
// catching "Rice 2000", "Pepper - 1500", "₦800 onions".
const MIN_PRICE = 20;
const NUM = "\\d[\\d,]*(?:\\.\\d{1,2})?";
const CUR = "(?:₦|N|NGN)";

// Lazy on the description (.*?) so a greedy match doesn't pull the
// separator itself (e.g. the dash in "rice - 2000") into the item text.
// Comma is deliberately excluded from the separator class — it's also the
// thousands mark inside the number itself, and keeping both meanings in one
// character class makes "Rice 2,000" ambiguous to match.
const TRAILING = new RegExp(`^(.*?\\S)[\\s:\\-@]+${CUR}?\\s*(${NUM})\\s*(?:naira)?$`, "i");
const LEADING = new RegExp(`^${CUR}\\s*(${NUM})\\s*(?:naira)?[\\s,:\\-@]+(\\S.*)$`, "i");

// A bare 1-2 digit number at the very START of the line, with more text
// after it - "3 packs of milk", "2 tomatoes". Deliberately narrow: only the
// leading position (a mid-line number like "2kg" is never touched), and
// capped at 2 digits since real shopping quantities are small — a
// 3+-digit leading number is almost always meant as a price instead (see
// the currency-marked LEADING match above for that case).
const LEADING_QTY = /^([1-9]\d?)\s+(\S.*)$/;

function clean(description: string): string {
  return description.replace(/[,:\-]+$/, "").trim();
}

function splitLeadingQty(text: string): { quantity: number | null; description: string } {
  const m = text.match(LEADING_QTY);
  if (m) return { quantity: Number(m[1]), description: m[2] };
  return { quantity: null, description: text };
}

export function parseListLine(raw: string): ParsedLine {
  const line = raw.trim();
  if (!line) return { description: "", price: null, quantity: null };

  const trailing = line.match(TRAILING);
  if (trailing) {
    const price = Number(trailing[2].replace(/,/g, ""));
    if (price >= MIN_PRICE) {
      const { quantity, description } = splitLeadingQty(clean(trailing[1]));
      return { description, price, quantity };
    }
  }

  const leading = line.match(LEADING);
  if (leading) {
    const price = Number(leading[1].replace(/,/g, ""));
    if (price >= MIN_PRICE) {
      const { quantity, description } = splitLeadingQty(clean(leading[2]));
      return { description, price, quantity };
    }
  }

  // No price found either way — still worth pulling a leading quantity out
  // (e.g. "3 packs of milk" with no price yet, covered by the budget field).
  const { quantity, description } = splitLeadingQty(line);
  return { description, price: null, quantity };
}
