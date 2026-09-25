"use client";

import EarnPage, { type EarnConfig } from "@/components/marketing/EarnPage";
import riderBike from "@/assets/illustrations/rider-bicycle.png";
import scooter from "@/assets/illustrations/rider-scooter-basket-1.png";
import route from "@/assets/illustrations/delivery-map-route.png";
import handoff from "@/assets/illustrations/order-handoff-vendor-customer.png";
import phone from "@/assets/illustrations/customer-checking-phone.png";
import netBag from "@/assets/illustrations/net-bag.png";
import basket from "@/assets/illustrations/grocery-basket.png";
import badgeExpress from "@/assets/illustrations/badge-express-delivery.png";
import badgeHuman from "@/assets/illustrations/badge-human-first-shopping.png";
import badgeFresh from "@/assets/illustrations/badge-fresh-guarantee.png";
import earnRiderBikes from "@/assets/illustrations/earn-rider-bikes.webp";
import earnKekeCar from "@/assets/illustrations/earn-keke-car.webp";
import earnPayoutMoment from "@/assets/illustrations/earn-payout-moment.webp";
import agentScene from "@/assets/illustrations/scene-agent-laptop-delivery.png";

const CFG: EarnConfig = {
  eyebrow: "For riders",
  title: "Deliver market hauls,",
  titleAccent: "earn on your schedule.",
  lede: "Pick up packed orders at the market gate and ride them to the door. Paid for every completed delivery.",
  cta: "Apply as a rider",
  hero: {
    main: earnRiderBikes,
    alt: "A Qyka rider with a scooter, an e-bike and a car",
    extras: [
      { src: riderBike, cls: "bottom-[6%] left-[2%] w-[30%]" },
      { src: netBag, cls: "right-[4%] top-[10%] w-[15%] rotate-12" },
      { src: basket, cls: "bottom-[8%] right-[4%] w-[24%] -rotate-6" },
    ],
  },
  perks: [
    { title: "Flexible hours", body: "Come online when it suits you and accept the deliveries that fit your route.", art: badgeExpress },
    { title: "Paid per delivery", body: "Earnings are tied to completed runs, confirmed by the customer.", art: badgeHuman },
    { title: "Already packed and proven", body: "Orders arrive sealed and photographed. You're moving it, not assembling it.", art: badgeFresh },
  ],
  dayTitle: "A delivery, start to finish.",
  day: [
    { title: "Accept a delivery", body: "A packed order needs a ride from a market gate to a customer's door.", art: route },
    { title: "Pick up at the gate", body: "Collect the sealed order from the agent, already packed and photographed.", art: handoff },
    { title: "Ride it home", body: "Bike, keke or car - whatever fits your route.", art: earnKekeCar },
    { title: "Confirm and earn", body: "The customer confirms receipt, the run closes, and your earnings land.", art: phone },
  ],
  fit: [
    { title: "You know the routes", body: "Market exits, traffic patterns and the fastest way to a doorstep." },
    { title: "You have your own ride", body: "Bike, keke or car: whatever gets a packed order there intact." },
    { title: "You're phone-fluent", body: "Confirming pickups, following drop-off details and chatting if plans change." },
  ],
  requirements: [
    "A smartphone with data, since pickup and drop-off details live in the app",
    "Your own bike, keke or car in good working order",
    "A bank account or wallet your delivery earnings can be paid into",
    "Valid ID (and a rider's licence, where your vehicle requires one)",
  ],
  faq: [
    { q: "How am I paid?", a: "Earnings are tracked per completed delivery in the app and paid out to your linked account." },
    { q: "Do I deliver across the whole city?", a: "No. You register for an area or market, and only see deliveries starting near you." },
    { q: "What if I can't find the address?", a: "Drop-off details and the customer's contact are in the app. Chat with them directly if plans change." },
  ],
  form: {
    kind: "rider",
    heading: "Apply as a rider",
    fields: [
      { key: "full_name", label: "Full name", required: true },
      { key: "phone", label: "Phone", required: true, type: "tel" },
      { key: "area", label: "Area you'd cover", required: true },
      { key: "vehicle", label: "Vehicle (bike, keke, car…)" },
    ],
    art: earnPayoutMoment,
  },
  other: {
    label: "Know the market? Shop for others",
    href: "/for-agents",
    art: agentScene,
    blurb: "Become an agent and earn on every list you shop.",
  },
};

export default function ForRiders() {
  return <EarnPage cfg={CFG} />;
}
