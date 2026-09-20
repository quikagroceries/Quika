"use client";

import type { ReactNode } from "react";
import Notifications from "@/screens/Notifications";
import { useAuth } from "@/components/AuthProvider";
import ShopHeader from "./ShopHeader";
import ShopBag from "./ShopBag";

/** Header-first shop chrome — clean product surface, no sidebar. */
function ShopShell({ children, floating = false }: { children: ReactNode; floating?: boolean }) {
  const { token, user } = useAuth();
  const guest = !token || !user;

  return (
    <div
      className={
        "shop-shell" +
        (floating ? " shop-shell--contained md:rounded-[1.25rem]" : "")
      }
    >
      <ShopHeader floating={floating} />
      {!guest && <Notifications />}
      <main className={"w-full" + (floating ? " md:min-h-0 md:flex-1 md:overflow-y-auto" : "")}>
        {children}
      </main>
      <ShopBag />
    </div>
  );
}

export default ShopShell;
