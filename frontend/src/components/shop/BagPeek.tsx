"use client";

import { useEffect, useRef } from "react";
import { BagBody } from "./ShopBag";

/**
 * A compact dropdown version of the bag - anchored under the header's bag
 * button, not the full sticky docked panel ShopBag's own desktop `<aside>`
 * renders. Needed specifically for the moment the chat dock is already
 * open: chat and the bag both want to be a `sticky`, layout-shifting flex
 * sibling of the page content, and two panels fighting for that same role
 * at once would either overlap or squeeze the actual order/shop content
 * down to nothing. Rather than picking a winner, the bag "peeks" here
 * instead while chat holds the docked slot - same content (BagBody,
 * unchanged), just presented as a small floating card the customer can
 * check and act on without losing their place in chat.
 */
function BagPeek({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Your personal shopping bag"
      className="absolute right-0 top-full z-[1600] mt-2 flex max-h-[75vh] w-96 flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl ring-1 ring-black/5"
    >
      <BagBody onClose={onClose} />
    </div>
  );
}

export default BagPeek;
