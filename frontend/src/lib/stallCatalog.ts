/**
 * Stall catalogue + suggested items.
 * Catalogue = what this stall typically sells (honest inventory shape).
 * Suggested = featured subset that seeds the list fast.
 * Prices = bargaining estimates (not fixed shelf tags).
 */

import { priceHintForItem } from "@/lib/marketHints";
import { stallTone, type MarketArtTone } from "@/lib/vendorVisuals";

export type StallCatalogItem = {
  id: string;
  name: string;
  category: string;
  unit?: string;
  bargainMin: number;
  bargainMax: number;
  featured?: boolean;
  image: string;
};

export type StallCategoryNav = { id: string; label: string };

const IMG = {
  produce: "/quika-cat-produce.jpg",
  protein: "/quika-cat-protein.jpg",
  provisions: "/quika-cat-pantry.jpg",
  spices: "/quika-trust-basket.jpg",
} as const;

function item(
  id: string,
  name: string,
  category: string,
  image: string,
  featured = false,
  unit?: string
): StallCatalogItem {
  const hint = priceHintForItem(name);
  return {
    id,
    name,
    category,
    unit: unit || hint?.unit,
    bargainMin: hint?.min ?? 500,
    bargainMax: hint?.max ?? 2000,
    featured,
    image,
  };
}

/** Full catalogues by stall tone — real browseable inventory for the stall type. */
const CATALOG_BY_TONE: Record<MarketArtTone, StallCatalogItem[]> = {
  produce: [
    item("tomatoes", "Tomatoes", "Fresh produce", IMG.produce, true, "paint"),
    item("pepper", "Pepper (atarodo)", "Fresh produce", IMG.produce, true, "paint"),
    item("onions", "Onions", "Fresh produce", IMG.produce, true, "paint"),
    item("okra", "Okra", "Fresh produce", IMG.produce, false),
    item("ugwu", "Ugwu", "Leafy greens", IMG.produce, true),
    item("spinach", "Spinach", "Leafy greens", IMG.produce, false),
    item("scent-leaf", "Scent leaf", "Leafy greens", IMG.produce, false),
    item("plantain", "Plantain", "Tubers & fruit", IMG.produce, true, "bunch"),
    item("yam", "Yam", "Tubers & fruit", IMG.produce, false, "tuber"),
    item("fruit-mix", "Seasonal fruit", "Tubers & fruit", IMG.produce, false),
  ],
  protein: [
    item("chicken", "Chicken", "Poultry", IMG.protein, true),
    item("turkey", "Turkey", "Poultry", IMG.protein, true),
    item("goat", "Goat meat", "Meat", IMG.protein, true),
    item("beef", "Beef", "Meat", IMG.protein, false),
    item("fish-fresh", "Fresh fish", "Fish", IMG.protein, true),
    item("fish-smoked", "Smoked fish", "Fish", IMG.protein, true),
    item("stockfish", "Stockfish", "Fish", IMG.protein, false),
    item("eggs", "Eggs", "Poultry", IMG.protein, false, "crate"),
  ],
  provisions: [
    item("rice", "Rice", "Grains", IMG.provisions, true, "paint"),
    item("beans", "Beans", "Grains", IMG.provisions, true, "paint"),
    item("garri", "Garri", "Grains", IMG.provisions, true, "paint"),
    item("palm-oil", "Palm oil", "Oils", IMG.provisions, true, "gallon"),
    item("groundnut-oil", "Groundnut oil", "Oils", IMG.provisions, false, "gallon"),
    item("crayfish", "Crayfish", "Seasoning", IMG.spices, true),
    item("seasoning", "Seasoning cubes", "Seasoning", IMG.spices, false),
  ],
  mixed: [
    item("tomatoes", "Tomatoes", "Produce", IMG.produce, true, "paint"),
    item("pepper", "Pepper", "Produce", IMG.produce, true, "paint"),
    item("onions", "Onions", "Produce", IMG.produce, false, "paint"),
    item("rice", "Rice", "Provisions", IMG.provisions, true, "paint"),
    item("beans", "Beans", "Provisions", IMG.provisions, false, "paint"),
    item("palm-oil", "Palm oil", "Provisions", IMG.provisions, true, "gallon"),
    item("eggs", "Eggs", "Protein", IMG.protein, false, "crate"),
    item("fish-fresh", "Fresh fish", "Protein", IMG.protein, true),
  ],
};

const SPICE_EXTRA: StallCatalogItem[] = [
  item("dry-pepper", "Dry pepper", "Spices", IMG.spices, true),
  item("ginger", "Ginger", "Spices", IMG.spices, false),
  item("garlic", "Garlic", "Spices", IMG.spices, false),
  item("curry", "Curry powder", "Spices", IMG.spices, true),
  item("thyme", "Thyme", "Spices", IMG.spices, false),
  item("crayfish-spice", "Crayfish", "Spices", IMG.spices, true),
];

export function catalogForStall(
  stallDescription?: string | null,
  stallName?: string
): StallCatalogItem[] {
  const tone = stallTone(stallDescription, stallName);
  const hay = `${stallName || ""} ${stallDescription || ""}`.toLowerCase();
  let items = [...CATALOG_BY_TONE[tone]];
  if (/spice|season|herb|pepper/.test(hay) && tone !== "produce") {
    items = [...items, ...SPICE_EXTRA.filter((s) => !items.some((i) => i.id === s.id))];
  }
  if (/spice|season|herb/.test(hay) && tone === "mixed") {
    items = [...SPICE_EXTRA, ...items.filter((i) => i.category !== "Spices")];
  }
  return items;
}

export function suggestedForStall(
  stallDescription?: string | null,
  stallName?: string
): StallCatalogItem[] {
  return catalogForStall(stallDescription, stallName).filter((i) => i.featured);
}

export function categoriesForCatalog(items: StallCatalogItem[]): StallCategoryNav[] {
  const seen = new Set<string>();
  const cats: StallCategoryNav[] = [{ id: "featured", label: "Suggested" }];
  for (const it of items) {
    if (seen.has(it.category)) continue;
    seen.add(it.category);
    cats.push({ id: it.category, label: it.category });
  }
  cats.push({ id: "all", label: "All items" });
  return cats;
}

export function bargainMid(item: StallCatalogItem): number {
  return Math.round((item.bargainMin + item.bargainMax) / 2);
}

export function formatBargainRange(item: StallCatalogItem): string {
  const range = `₦${item.bargainMin.toLocaleString()}–${item.bargainMax.toLocaleString()}`;
  return item.unit ? `${range}/${item.unit}` : range;
}

export function stallTypeLabel(stallDescription?: string | null, stallName?: string): string {
  const tone = stallTone(stallDescription, stallName);
  if (tone === "produce") return "Produce stall";
  if (tone === "protein") return "Protein stall";
  if (tone === "provisions") return "Provisions stall";
  return "Market stall";
}
