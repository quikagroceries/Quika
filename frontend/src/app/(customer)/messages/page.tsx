"use client";

import Messages from "@/screens/Messages";

export default function MessagesPage() {
  return <Messages orderHref={(id) => `/orders/${id}`} />;
}
