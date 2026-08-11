/** Public market directory — pre-pilot curated list (API markets require auth). */
export type DirectoryMarket = {
  id: string;
  name: string;
  city: string;
  state: string;
  status: "pilot" | "coming_soon";
  blurb: string;
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
    image: "/quika-cat-produce.jpg",
  },
  {
    id: "mile-12",
    name: "Mile 12 Market",
    city: "Ketu",
    state: "Lagos",
    status: "coming_soon",
    blurb: "Wholesale produce hub — peppers, tomatoes, and bulk restocks.",
    image: "/quika-cat-protein.jpg",
  },
  {
    id: "bodija",
    name: "Bodija Market",
    city: "Ibadan",
    state: "Oyo",
    status: "coming_soon",
    blurb: "Classic open-air shopping for families across Ibadan.",
    image: "/quika-cat-pantry.jpg",
  },
  {
    id: "wuse",
    name: "Wuse Market",
    city: "Abuja",
    state: "FCT",
    status: "coming_soon",
    blurb: "Capital city stalls for everyday groceries and specialty finds.",
    image: "/quika-trust-basket.jpg",
  },
];

export function filterDirectoryMarkets(query: string): DirectoryMarket[] {
  const q = query.trim().toLowerCase();
  if (!q) return DIRECTORY_MARKETS;
  return DIRECTORY_MARKETS.filter((m) =>
    [m.name, m.city, m.state, m.blurb].some((v) => v.toLowerCase().includes(q))
  );
}
