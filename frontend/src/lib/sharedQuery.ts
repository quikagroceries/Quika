"use client";

import { useEffect, useState } from "react";

// A tiny shared cache + poller, so the same data is fetched ONCE no matter how
// many components ask for it, and survives navigation. Before this, the header
// pill, the tab-bar dot, the banner and the Orders page each ran their own
// interval against the same endpoint, and every page visit started from an
// empty screen while it refetched. Now: one timer per key (only while at least
// one component is subscribed), and a revisit renders the cached data
// instantly, then refreshes it in the background.
type Entry = {
  data: any;
  fetchedAt: number;
  fetcher: () => Promise<any>;
  interval: number;
  subs: Set<() => void>;
  timer: ReturnType<typeof setInterval> | null;
  inflight: Promise<void> | null;
};

const store = new Map<string, Entry>();

function entryFor(key: string, fetcher: () => Promise<any>, interval: number): Entry {
  let e = store.get(key);
  if (!e) {
    e = { data: undefined, fetchedAt: 0, fetcher, interval, subs: new Set(), timer: null, inflight: null };
    store.set(key, e);
  }
  e.fetcher = fetcher;
  e.interval = interval;
  return e;
}

function run(e: Entry): Promise<void> {
  if (e.inflight) return e.inflight; // concurrent callers share one request
  e.inflight = e
    .fetcher()
    .then((d) => {
      e.data = d;
      e.fetchedAt = Date.now();
      e.subs.forEach((notify) => notify());
    })
    .catch(() => {
      // best-effort: a failed background refresh keeps whatever is already shown
    })
    .finally(() => {
      e.inflight = null;
    });
  return e.inflight;
}

/** Refetch a key now (e.g. right after a mutation). Safe if nobody's watching. */
export function refreshShared(key: string): Promise<void> {
  const e = store.get(key);
  return e ? run(e) : Promise.resolve();
}

/** Forget everything cached - on logout, so nobody sees the last user's data. */
export function clearShared() {
  store.forEach((e) => e.timer && clearInterval(e.timer));
  store.clear();
}

export function useSharedQuery<T>(key: string | null, fetcher: () => Promise<T>, interval = 0) {
  const [, rerender] = useState(0);

  useEffect(() => {
    if (!key) return;
    const e = entryFor(key, fetcher, interval);
    const notify = () => rerender((n) => n + 1);
    e.subs.add(notify);
    // Stale (or never fetched)? refresh in the background; fresh data is left alone.
    // Polled data: at most ~5s old on mount. Static-ish data (interval 0, e.g.
    // the market list): good for 5 minutes, then quietly refreshed.
    const maxAge = interval > 0 ? Math.min(interval, 5000) : 5 * 60 * 1000;
    if (Date.now() - e.fetchedAt > maxAge) run(e);
    if (e.subs.size === 1 && interval > 0) e.timer = setInterval(() => run(e), interval);
    return () => {
      e.subs.delete(notify);
      if (e.subs.size === 0 && e.timer) {
        clearInterval(e.timer);
        e.timer = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by `key`; the fetcher is refreshed on every render via entryFor
  }, [key]);

  const e = key ? store.get(key) : undefined;
  return {
    data: e?.data as T | undefined,
    refresh: () => (key ? refreshShared(key) : Promise.resolve()),
  };
}
