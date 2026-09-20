'use client';

import { useConversations } from "@/lib/useConversations";

// A red unread-messages count, or nothing at all. Its own component so only
// the places that show it poll the inbox.
export function UnreadBadge({ className = "" }: { className?: string }) {
  const { unreadTotal } = useConversations();
  if (unreadTotal <= 0) return null;
  return (
    <span className={"flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white " + className}>
      {unreadTotal > 9 ? "9+" : unreadTotal}
    </span>
  );
}

export default UnreadBadge;
