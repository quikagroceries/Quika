/** Typical market price ranges (₦) — soft confidence hints, not catalogue prices. */
export type PriceHint = { min: number; max: number; unit?: string };

const HINTS: Record<string, PriceHint> = {
  tomato: { min: 600, max: 900, unit: "paint" },
  tomatoes: { min: 600, max: 900, unit: "paint" },
  pepper: { min: 400, max: 800, unit: "paint" },
  peppers: { min: 400, max: 800, unit: "paint" },
  onion: { min: 500, max: 900, unit: "paint" },
  onions: { min: 500, max: 900, unit: "paint" },
  rice: { min: 1200, max: 1800, unit: "paint" },
  beans: { min: 1000, max: 1600, unit: "paint" },
  garri: { min: 800, max: 1400, unit: "paint" },
  yam: { min: 1500, max: 3500, unit: "tuber" },
  plantain: { min: 800, max: 1500, unit: "bunch" },
  egg: { min: 1800, max: 2500, unit: "crate" },
  eggs: { min: 1800, max: 2500, unit: "crate" },
  fish: { min: 2000, max: 4500 },
  chicken: { min: 3500, max: 6000 },
  oil: { min: 2500, max: 4500, unit: "gallon" },
  palm: { min: 2000, max: 4000 },
  crayfish: { min: 800, max: 1500 },
  okra: { min: 300, max: 600 },
  spinach: { min: 200, max: 500 },
  ugu: { min: 200, max: 500 },
};

export function priceHintForItem(name: string): PriceHint | null {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (HINTS[key]) return HINTS[key];
  const hit = Object.keys(HINTS).find((k) => key.includes(k) || k.includes(key));
  return hit ? HINTS[hit] : null;
}

export function formatPriceHint(hint: PriceHint): string {
  const range = `usually ₦${hint.min.toLocaleString()}–${hint.max.toLocaleString()}`;
  return hint.unit ? `${range}/${hint.unit}` : range;
}

/** Common “smart chip” items — lightly keyed by market name when useful. */
const DEFAULT_CHIPS = [
  "Tomatoes",
  "Pepper",
  "Onions",
  "Rice",
  "Beans",
  "Garri",
  "Yam",
  "Plantain",
  "Eggs",
  "Palm oil",
];

const BY_MARKET: Record<string, string[]> = {
  balogun: ["Pepper", "Onions", "Crayfish", "Palm oil", "Rice", "Beans", "Tomatoes", "Ugu"],
  "mile 12": ["Tomatoes", "Pepper", "Onions", "Okra", "Spinach", "Plantain", "Yam"],
  bodija: ["Yam", "Garri", "Beans", "Rice", "Pepper", "Eggs", "Palm oil"],
  wuse: ["Rice", "Beans", "Eggs", "Chicken", "Tomatoes", "Pepper", "Oil"],
};

export function smartChipsForMarket(marketName?: string | null): string[] {
  if (!marketName) return DEFAULT_CHIPS;
  const key = marketName.toLowerCase();
  const hit = Object.keys(BY_MARKET).find((k) => key.includes(k));
  return hit ? BY_MARKET[hit] : DEFAULT_CHIPS;
}
