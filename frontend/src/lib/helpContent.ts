import { mailto } from "@/lib/contact";

/** Shared between the homepage FAQ/Help sections and the floating HelpWidget
 * so there's one place to update an answer instead of two. */

export const PILOT = "our first pilot market";

export const FAQS = [
  {
    q: "What is Qyka?",
    a: "Qyka is a remote personal shopper for groceries — open-air markets and supermarkets alike. You send a free-text list, a local agent shops it and pays by transfer, and a rider brings the haul to your door.",
  },
  {
    q: "How do free-text lists work?",
    a: "Write your list the way you’d tell a neighbour — “₦500 of pepper,” “2 wraps of beans,” or “a tin of milk and washing soap.” No catalogue required. At an open-air market your agent bargains it; at a supermarket, it's shopped at shelf price.",
  },
  {
    q: "How do I pay?",
    a: "You deposit wallet balance or bank transfer before shopping starts. That locks the run. The final bill lands in the app with photos; float recycles through the system.",
  },
  {
    q: "Does the agent carry cash?",
    a: "No. Agents pay vendors by bank transfer with photo proof. There’s no unauthorized cash on the run — that’s a core Qyka rule.",
  },
  {
    q: "When can I start ordering?",
    a: `We’re opening carefully with ${PILOT}. Join the waitlist and we’ll tell you when shopping opens in your area.`,
  },
  {
    q: "Can I become a Qyka agent or rider?",
    a: "Yes. Agents apply on the Agent page if they already know a market's stalls and prices; riders apply on the Rider page to run deliveries between markets and doorsteps. Both earn on completed runs.",
  },
  {
    q: "What if something’s wrong with my order?",
    a: "Every run leaves a trail: your list, transfers, and photos. Confirm delivery when it arrives, or raise an issue against that trail. Read Trust & Safety for the full picture.",
  },
] as const;

export const HELP_TOPICS = [
  {
    title: "Orders & tracking",
    body: "Where's my run, what does each status mean, and what to do if it's stalled.",
    href: "/#faq",
  },
  {
    title: "Payments & deposits",
    body: "Wallet balance, bank transfer, deposits, and how the final bill is calculated.",
    href: "/#faq",
  },
  {
    title: "Become an Agent",
    body: "Requirements, how runs are assigned, and how payouts work.",
    href: "/for-agents",
  },
  {
    title: "Become a Rider",
    body: "Pickup points, delivery windows, and how rider earnings are paid out.",
    href: "/for-riders",
  },
  {
    title: "Trust & safety",
    body: "How Qyka keeps cash off the street and every purchase accountable.",
    href: "/trust-and-safety",
  },
  {
    title: "Something else",
    body: "Can't find it here — write to us and a real person will reply.",
    href: mailto("Qyka help"),
  },
] as const;
