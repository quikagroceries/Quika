"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Page-scoped search. The top bar has ONE search field, but what it searches
// is up to the page you're on: a page that has something worth searching
// (History's orders, Wallet's transactions...) registers a placeholder with
// `usePageSearch` and filters its own data by the returned query; a page with
// nothing to search registers nothing and the top bar shows no search at all
// (rather than a generic box that can't find anything on this page). The
// shop keeps its own search (it drives market browsing), untouched.
type Ctx = {
  query: string;
  setQuery: (q: string) => void;
  placeholder: string | null;
  setPlaceholder: (p: string | null) => void;
};

const PageSearchContext = createContext<Ctx | null>(null);

export function PageSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [placeholder, setPlaceholder] = useState<string | null>(null);
  const value = useMemo(() => ({ query, setQuery, placeholder, setPlaceholder }), [query, placeholder]);
  return <PageSearchContext.Provider value={value}>{children}</PageSearchContext.Provider>;
}

export function usePageSearchContext() {
  return useContext(PageSearchContext);
}

/** Called by a page: turns the top bar's search on for it, returns the
 * (trimmed, lower-cased) query to filter by. Cleans up when the page leaves.
 * Pass `null` to keep it off (e.g. while a screen has nothing to search). */
export function usePageSearch(placeholder: string | null): string {
  const ctx = useContext(PageSearchContext);
  const setPlaceholder = ctx?.setPlaceholder;
  const setQuery = ctx?.setQuery;
  useEffect(() => {
    if (!setPlaceholder || !setQuery) return;
    setPlaceholder(placeholder);
    return () => {
      setPlaceholder(null);
      setQuery("");
    };
  }, [placeholder, setPlaceholder, setQuery]);
  return (ctx?.query || "").trim().toLowerCase();
}
