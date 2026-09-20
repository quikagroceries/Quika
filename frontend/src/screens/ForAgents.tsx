"use client";

import EarnPage, { type EarnConfig } from "@/components/marketing/EarnPage";
import agentScene from "@/assets/illustrations/scene-agent-laptop-delivery.png";
import conversation from "@/assets/illustrations/agent-customer-conversation.png";
import scale from "@/assets/illustrations/vendor-weighing-scale.png";
import phoneList from "@/assets/illustrations/phone-shopping-list.png";
import handoff from "@/assets/illustrations/order-handoff-vendor-customer.png";
import tomatoes from "@/assets/illustrations/tomatoes.png";
import garlic from "@/assets/illustrations/garlic.png";
import crate from "@/assets/illustrations/produce-crate.png";
import badgeHuman from "@/assets/illustrations/badge-human-first-shopping.png";
import badgeLive from "@/assets/illustrations/badge-real-time-updates.png";
import badgeFresh from "@/assets/illustrations/badge-fresh-guarantee.png";
import riderBike from "@/assets/illustrations/rider-bicycle.png";

const CFG: EarnConfig = {
  eyebrow: "For agents",
  title: "Earn shopping a market",
  titleAccent: "you already know.",
  lede: "Customers send lists. You bargain the stalls, pay by transfer, pack with proof, and get paid when the run is done.",
  cta: "Apply as an agent",
  hero: {
    main: agentScene,
    alt: "An agent shopping the market from a laptop",
    extras: [
      { src: tomatoes, cls: "left-[2%] top-[26%] w-[15%] -rotate-12" },
      { src: garlic, cls: "right-[3%] top-[10%] w-[13%] rotate-12" },
      { src: crate, cls: "bottom-[8%] right-[6%] w-[26%] rotate-6" },
    ],
  },
  perks: [
    { title: "Your hours", body: "Only see and accept runs for the markets you registered for.", art: badgeHuman },
    { title: "Paid per completed run", body: "Earnings are tracked in the app and paid to your linked account.", art: badgeLive },
    { title: "No cash out of pocket", body: "You shop with transfer float authorised for that run.", art: badgeFresh },
  ],
  dayTitle: "A run, start to finish.",
  day: [
    { title: "Accept a run", body: "A customer list lands for your market. You accept only what you can shop well.", art: phoneList },
    { title: "Bargain the stalls", body: "Shop the way you already do: weight, freshness, fair price.", art: scale },
    { title: "Transfer and prove", body: "Pay vendors by transfer and snap photo proof. No unauthorised cash.", art: conversation },
    { title: "Pack and hand off", body: "The final bill lands in the app, the courier takes the haul, you earn.", art: handoff },
  ],
  fit: [
    { title: "You know the market", body: "Stalls, seasons and who sells what, not a warehouse aisle." },
    { title: "You're phone-fluent", body: "Transfers, photos and chat while you move through the market." },
    { title: "You keep it clean", body: "No side cash. Proof on every spend. Customers trust the trail." },
  ],
  requirements: [
    "A smartphone with data, for chat, photos and transfers on the run",
    "A bank account or wallet the run's transfer float can move through",
    "A specific market you already shop and know the stalls at",
    "Valid ID for verification before your first run",
  ],
  faq: [
    { q: "Do I shop with my own money?", a: "No. You shop using transfer float authorised for that run, never your own cash upfront." },
    { q: "How am I paid?", a: "Earnings are tracked per completed run in the app and paid out to your linked account." },
    { q: "Can I pick which runs I take?", a: "Yes. You only see and accept orders for the market(s) you've registered for." },
  ],
  form: {
    mailTo: "agents@quika.ng",
    subject: "Qyka agent application",
    heading: "Apply as an agent",
    fields: [
      { key: "name", label: "Full name", required: true },
      { key: "phone", label: "Phone", required: true },
      { key: "market", label: "Market you know best" },
    ],
    art: conversation,
  },
  estimator: { perUnit: 3500, unit: "Orders", min: 5, max: 30, start: 15 },
  other: {
    label: "Got wheels instead? Deliver with Qyka",
    href: "/for-riders",
    art: riderBike,
    blurb: "Short trips from the market gate to a customer's door.",
  },
};

export default function ForAgents() {
  return <EarnPage cfg={CFG} />;
}
