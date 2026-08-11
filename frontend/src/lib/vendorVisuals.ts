/**
 * Shop cover tones — solid, mature fields for monogram cards.
 * PLACEHOLDER until real market photography ships.
 */
export type MarketArtTone = "produce" | "provisions" | "protein" | "mixed";

export function marketTone(name?: string, city?: string): MarketArtTone {
  const hay = `${name || ""} ${city || ""}`.toLowerCase();
  if (/mile\s*12|bodija|pepper|tomato|produce/.test(hay)) return "produce";
  if (/wuse|provision|pantry/.test(hay)) return "provisions";
  if (/protein|fish|meat/.test(hay)) return "protein";
  return "mixed";
}

export function stallTone(description?: string | null, name?: string): MarketArtTone {
  const hay = `${name || ""} ${description || ""}`.toLowerCase();
  if (/fish|meat|chicken|turkey|goat|protein|suya|beef/.test(hay)) return "protein";
  if (/rice|bean|oil|garri|pantry|grain|provision|spice|season/.test(hay)) return "provisions";
  if (/pepper|tomato|onion|green|ugwu|fruit|yam|cassava|leaf|produce/.test(hay)) return "produce";
  return "mixed";
}

/** Flat cover colors — no rainbow gradients, no “stock photo” pretence. */
export const TONE_COVER: Record<MarketArtTone, { bg: string; fg: string }> = {
  produce: { bg: "#1F4D2E", fg: "#E8F2E4" },
  provisions: { bg: "#5C3A1E", fg: "#F5E6D3" },
  protein: { bg: "#6B2A22", fg: "#F8E4DC" },
  mixed: { bg: "#C2430F", fg: "#FFF0E8" },
};

export function vendorTags(description?: string | null): string[] {
  if (!description) return [];
  return description
    .split(/[,&]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((t) => (t.length > 16 ? `${t.slice(0, 14)}…` : t));
}

export function marketInitials(name?: string) {
  const parts = String(name || "M")
    .replace(/\bMarket\b/gi, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || "M").slice(0, 2).toUpperCase();
}
