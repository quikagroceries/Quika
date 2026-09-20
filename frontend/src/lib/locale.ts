"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DICTS, type Dict, type Locale } from "@/content/i18n";

// The language choice lives in a cookie (so the server could read it later
// for per-language pages) mirrored in localStorage. A tiny external store,
// not a React context: any component - header, footer, page - can read it
// with no provider to mount, and pages that never opt in stay English.
//
// The server (and the first client render) always see "en"; the stored
// choice is applied right after hydration via useSyncExternalStore, which
// React treats as a normal update, not a hydration mismatch.
const COOKIE = "qyka_lang";
const listeners = new Set<() => void>();

function read(): Locale {
  try {
    const m = document.cookie.match(/(?:^|; )qyka_lang=(en|pcm)/);
    if (m) return m[1] as Locale;
    const ls = localStorage.getItem(COOKIE);
    if (ls === "en" || ls === "pcm") return ls;
  } catch {
    /* blocked storage: stay English */
  }
  return "en";
}

function applyDocLang(l: Locale) {
  // "pcm" is the BCP-47 code for Nigerian Pidgin.
  document.documentElement.lang = l === "pcm" ? "pcm" : "en-NG";
}

export function setLocale(l: Locale) {
  try {
    document.cookie = `${COOKIE}=${l}; path=/; max-age=31536000; SameSite=Lax`;
    localStorage.setItem(COOKIE, l);
  } catch {
    /* ignore */
  }
  applyDocLang(l);
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useLocale(): [Locale, (l: Locale) => void] {
  const locale = useSyncExternalStore(subscribe, read, () => "en" as Locale);
  return [locale, useCallback((l: Locale) => setLocale(l), [])];
}

export function useT(): Dict {
  const [locale] = useLocale();
  return DICTS[locale];
}

/** Keeps <html lang> in step with the saved choice on first load. */
export function syncDocLang() {
  applyDocLang(read());
}
