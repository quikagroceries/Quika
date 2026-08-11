/** Sticky marketing header clearance */
const HEADER_OFFSET = 96;

export function scrollToSection(id: string, behavior: ScrollBehavior = "smooth") {
  const el = document.getElementById(id);
  if (!el) return false;

  const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
  window.scrollTo({ top: Math.max(0, top), behavior });
  return true;
}

export function hashFromHref(href: string): string | null {
  if (href.startsWith("/#")) return href.slice(2) || null;
  if (href.startsWith("#")) return href.slice(1) || null;
  return null;
}
