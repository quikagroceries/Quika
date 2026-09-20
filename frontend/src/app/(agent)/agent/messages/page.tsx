"use client";

import Messages from "@/screens/Messages";

export default function AgentMessagesPage() {
  return <Messages orderHref={(id) => `/agent/orders/${id}`} agent />;
}
