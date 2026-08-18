"use client";

import type { ReactNode } from "react";
import Notifications from "@/screens/Notifications";
import { useAuth } from "@/components/AuthProvider";
import ShopHeader from "./ShopHeader";
import ShopBag from "./ShopBag";

/** Header-first shop chrome — clean product surface, no sidebar. */
function ShopShell({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const guest = !token || !user;

  return (
    <div className="shop-shell">
      <ShopHeader />
      {!guest && <Notifications />}
      <main className="w-full">{children}</main>
      <ShopBag />
    </div>
  );
}

export default ShopShell;
