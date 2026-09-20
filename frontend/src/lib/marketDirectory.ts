/** Public market directory — marketing + shop enrichment (slugs map onto API markets). */

export type VenueType = "local_market" | "supermarket";

export type FoodCategory =
  | "produce"
  | "provisions"
  | "protein"
  | "spices"
  | "fish"
  | "grains"
  | "household";

export type DirectoryMarket = {
  id: string;
  name: string;
  city: string;
  state: string;
  status: "pilot" | "coming_soon";
  blurb: string;
  venueType: VenueType;
  categories: FoodCategory[];
  /**
   * Cover imagery used on marketing + shop browse cards.
   * Atmospheric / category photography — not claimed as venue storefront shots.
   */
  image: string;
};

export const DIRECTORY_MARKETS: DirectoryMarket[] = [
  {
    id: "balogun",
    name: "Balogun Market",
    city: "Lagos Island",
    state: "Lagos",
    status: "pilot",
    blurb: "Dense stalls, sharp bargaining, provisions and produce in one dense loop.",
    venueType: "local_market",
    categories: ["provisions", "produce", "spices"],
    image: "/qyka-cat-produce.jpg",
  },
  {
    id: "mile-12",
    name: "Mile 12 Market",
    city: "Ketu",
    state: "Lagos",
    status: "coming_soon",
    blurb: "Wholesale produce hub — peppers, tomatoes, and bulk restocks.",
    venueType: "local_market",
    categories: ["produce", "fish", "grains"],
    image: "/qyka-cat-protein.jpg",
  },
  {
    id: "bodija",
    name: "Bodija Market",
    city: "Ibadan",
    state: "Oyo",
    status: "coming_soon",
    blurb: "Classic open-air shopping for families across Ibadan.",
    venueType: "local_market",
    categories: ["produce", "provisions", "grains"],
    image: "/qyka-cat-pantry.jpg",
  },
  {
    id: "wuse",
    name: "Wuse Market",
    city: "Abuja",
    state: "FCT",
    status: "coming_soon",
    blurb: "Capital city stalls for everyday groceries and specialty finds.",
    venueType: "local_market",
    categories: ["provisions", "protein", "household"],
    image: "/qyka-trust-basket.jpg",
  },
  {
    id: "shoprite-ikeja",
    name: "Shoprite Ikeja City Mall",
    city: "Ikeja",
    state: "Lagos",
    status: "pilot",
    blurb: "Fixed prices, labelled aisles — faster when you know exactly what you need.",
    venueType: "supermarket",
    categories: ["provisions", "produce", "protein", "household"],
    image: "/qyka-cat-pantry.jpg",
  },
  {
    id: "spar-lekki",
    name: "Spar Lekki",
    city: "Lekki",
    state: "Lagos",
    status: "pilot",
    blurb: "Shelf prices you can trust — Qyka still picks and delivers.",
    venueType: "supermarket",
    categories: ["provisions", "produce", "household"],
    image: "/qyka-trust-basket.jpg",
  },
];

export function filterDirectoryMarkets(query: string): DirectoryMarket[] {
  const q = query.trim().toLowerCase();
  if (!q) return DIRECTORY_MARKETS;
  return DIRECTORY_MARKETS.filter((m) =>
    [m.name, m.city, m.state, m.blurb].some((v) => v.toLowerCase().includes(q))
  );
}

/** Map marketing directory slug (e.g. balogun) onto a live API market row. */
export function matchSlugToApiMarket<T extends { id: string; name: string; city?: string }>(
  slug: string | null | undefined,
  markets: T[]
): T | null {
  if (!slug || !markets?.length) return null;
  const dir = DIRECTORY_MARKETS.find((m) => m.id === slug);
  const needle = (dir?.name || slug).toLowerCase().replace(/\s+market$/, "");
  return (
    markets.find((m) => m.name.toLowerCase().includes(needle)) ||
    markets.find((m) => m.name.toLowerCase().includes(slug.toLowerCase())) ||
    null
  );
}

export function isLocalMarket(m: { venue_type?: string; venueType?: string }) {
  const v = m.venue_type || m.venueType || "local_market";
  return v === "local_market";
}

/** Best-effort match of a live API market row onto its marketing directory entry. */
export function findDirectoryMarket(m: { name?: string | null }): DirectoryMarket | undefined {
  return DIRECTORY_MARKETS.find(
    (d) =>
      m.name?.toLowerCase().includes(d.name.toLowerCase().replace(/\s+market$/, "").slice(0, 8)) ||
      d.name.toLowerCase() === (m.name || "").toLowerCase() ||
      m.name?.toLowerCase().includes(d.name.toLowerCase().slice(0, 10))
  );
}

/** Cover image for any market row — directory photo, falling back by venue type. */
export function coverImageForMarket(m: { name?: string | null; venue_type?: string | null }): string {
  const dir = findDirectoryMarket(m);
  if (dir?.image) return dir.image;
  return (m.venue_type || "") === "supermarket" ? "/qyka-cat-pantry.jpg" : "/qyka-cat-produce.jpg";
}
