/**
 * Quika shop design tokens — locked for /shop and all funnel steps.
 *
 * Colors (tailwind): ink #211A14 · canvas #EFE6D9 · canvas-deep #E4D8C6 ·
 * chalk #F4F0E6 · brand.orange #E8541E · brand.green #0E7A3C · gold #F2B705
 * Fonts: sans = Plus Jakarta · display = Bricolage Grotesque
 * Radius: rounded-shop (1.25rem) · rounded-shop-lg (1.5rem) · pills = rounded-full
 * Spacing: shop-1…shop-8 scale in tailwind.config.js
 *
 * Do not introduce slate-* or dashboard chrome on shop surfaces.
 */

export const SHOP = {
  maxWidth: "w-full",
  headerH: "h-16",
} as const;
