"use client";

import type { ReactNode } from "react";
import PageBackgroundAccents from "@/components/PageBackgroundAccents";

/** Header-first shop chrome — clean product surface, no sidebar. */
function ShopShell({ children }: { children: ReactNode }) {
  return (
    // No more flex row / ShopBag here - AppShell now owns both (passed
    // `shopBag` for the Shop route too), so the bag panel is a persistent
    // sibling of AppShell's whole content column instead of unmounting
    // (and losing its open/closed state) the moment you navigate off
    // /shop. This is back to a plain vertical stack.
    <div className="shop-shell">
      {/* Shop renders through this `bare` shell, not AppShell's
          PageContainer - PageBackgroundAccents needs wiring in here
          separately, or it silently never renders on this page at all
          (which is what was happening: not "already covered", just never
          mounted). Same z-0/z-10 pairing as AppShell so the stacking
          comparison stays local and reliable. */}
      <div className="relative z-0 w-full">
        <PageBackgroundAccents activeKey="shop" />
        <main className="relative z-10 w-full">{children}</main>
      </div>
    </div>
  );
}

export default ShopShell;
