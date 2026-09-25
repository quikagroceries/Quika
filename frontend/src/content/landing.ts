import { mailto } from "@/lib/contact";

export const LAUNCH_MODE = "pre-launch" as const; // toggle to "live" when real data exists

export const LANDING = {
  announcement: {
    text: "Now live in Ibadan · Lagos Mainland coming soon",
    link: { label: "Join the list", href: "/#waitlist" },
  },

  hero: {
    variants: {
      A: {
        headline: "Your personal shopper at the market.",
        sub: "Send your list. A real person in the market picks it fresh, negotiates fairly, and brings it to your door.",
      },
      B: {
        headline: "Market prices. Doorstep convenience.",
        sub: "A real human shops your list at the market you choose — fresh produce, fair prices, delivered.",
      },
      C: {
        headline: "Someone you can chat with is shopping for you right now.",
        sub: "Watch them pick, approve prices, and get it delivered — all from your phone.",
      },
    },
    activeVariant: "A" as "A" | "B" | "C",
    eyebrow: "agents shopping right now", // prepended with live count or "●"
    eyebrowFallback: "Real people, real markets",
    primaryCta: { label: "Start your list", href: "/shop" },
    secondaryCta: { label: "See how it works", href: "#how-it-works" },
    trustLine: [
      "No sign-up to start",
      "Pay only for what's bought",
      "Refunds on unused cash",
    ],
  },

  socialProof: {
    headline: (city: string) => `Trusted by households in ${city}`,
    headlineFallback: "Launching soon in your city",
    stats: [
      { value: 0, suffix: "+", label: "orders delivered", liveKey: "totalOrders" },
      { value: 45, suffix: " min", label: "avg delivery time", liveKey: "avgDeliveryMins" },
      { value: 15, suffix: "%", label: "avg saving vs supermarket", liveKey: "avgSavingPct" },
    ],
  },

  howItWorks: {
    eyebrow: "How it works",
    title: "From list to doorstep in four steps.",
    lede: "No browsing catalogues. No minimum orders. Just write what you need.",
    steps: [
      {
        number: 1,
        title: "Write your list",
        body: "Type or paste from WhatsApp. Add photos. Choose a market or supermarket.",
        fragment: "list-builder",
      },
      {
        number: 2,
        title: "Meet your agent",
        body: "Matched by area and rating. Chat before they shop. See another if you prefer.",
        fragment: "agent-proposal",
      },
      {
        number: 3,
        title: "They shop, you watch",
        body: "Live photos, price confirmations, substitutions you approve in real time.",
        fragment: "live-chat",
      },
      {
        number: 4,
        title: "Pay and receive",
        body: "Pay for what's actually bought. Overage refunded. Rider brings it to your door.",
        fragment: "receipt-delivery",
      },
    ],
    cta: { label: "Start step 1 now", href: "/shop" },
  },

  valuePillars: {
    eyebrow: "Why Qyka",
    title: "Built different from delivery apps.",
    lede: "A human at the market, not an algorithm in a warehouse.",
    cards: [
      {
        title: "Fresher than delivery apps",
        body: "Picked by a human who can see and touch it — not pulled from warehouse stock.",
        illustration: "produce-crate",
        stat: null,
      },
      {
        title: "Fair market prices",
        body: "You see the real price paid. Receipts attached to every purchase.",
        illustration: "weighing-scale",
        stat: null,
      },
      {
        title: "Your agent, your chat",
        body: "Voice, photo, and text chat with the person shopping for you.",
        illustration: "agent-customer-conversation",
        stat: null,
      },
      {
        title: "Pay for what's bought",
        body: "Held float returned. Unspent cash refunded within 24 hours.",
        illustration: "wallet",
        stat: null,
      },
      {
        title: "Track everything",
        body: "Five-step live rail from agent assignment to doorstep delivery.",
        illustration: "track",
        stat: null,
      },
      {
        title: "Lists you can reuse",
        body: "Save drafts, edit, and reorder with one tap — your weekly shop, memorised.",
        illustration: "person-shopping-list",
        stat: null,
      },
    ],
  },

  pricing: {
    eyebrow: "Pricing",
    title: "What it costs — no surprises.",
    lede: "Transparent fees. You see exactly what you pay for.",
    tiers: [
      { label: "Small basket", amount: 10000 },
      { label: "Medium basket", amount: 25000 },
      { label: "Large basket", amount: 50000 },
    ],
    fees: {
      serviceFeePercent: 7.5,
      deliveryFee: 1500,
      addItemFee: 500,
    },
    included: [
      "Groceries at market cost",
      "Agent bargaining on your behalf",
      "Photo proof of every purchase",
      "Live chat during shopping",
      "Refund of unspent deposit",
    ],
    notIncluded: [
      "Markup on grocery prices",
      "Hidden platform fees",
      "Surge pricing",
    ],
  },

  trust: {
    eyebrow: "Trust & safety",
    title: "Built for markets with no catalogue and no receipts.",
    lede: "Qyka's differentiator isn't speed — it's how money moves when there's no storefront to fall back on.",
    points: [
      {
        title: "Verified agents",
        body: "ID, phone, and address checked. Market registration verified. Rated after every order.",
        icon: "shield-check",
      },
      {
        title: "Pay for what's bought",
        body: "Payment held until shopping is complete. Unspent funds refunded automatically.",
        icon: "wallet",
      },
      {
        title: "Photo proof on every spend",
        body: "Every purchase evidenced by photo and receipt in your chat thread.",
        icon: "camera",
      },
      {
        title: "Vetted delivery riders",
        body: "Live tracking with handoff confirmation. Identity verified before first ride.",
        icon: "truck",
      },
      {
        title: "24/7 support",
        body: "Chat and WhatsApp support. Disputes resolved within 48 hours.",
        icon: "headset",
      },
    ],
    incidentHandling: {
      title: "If something goes wrong",
      cases: [
        { issue: "Item missing", resolution: "Full refund for the item" },
        { issue: "Late delivery", resolution: "Service fee credit" },
        { issue: "Quality issue", resolution: "Photo review + replacement or refund" },
        { issue: "Agent concern", resolution: "Report → investigation → action within 24h" },
      ],
    },
  },

  testimonials: [
    {
      name: "Funke",
      area: "Bodija, Ibadan",
      orderType: "Weekly groceries",
      quote: "I used to spend my whole Saturday at the market. Now I send my list and it arrives before lunch.",
      rating: 5,
      founding: true,
    },
    {
      name: "Chidi",
      area: "Lekki, Lagos",
      orderType: "Family provisions",
      quote: "The chat with photos convinced me — I can see exactly what they're buying and the prices.",
      rating: 5,
      founding: true,
    },
    {
      name: "Aisha",
      area: "Wuse, Abuja",
      orderType: "Diaspora order for parents",
      quote: "I order from London for my mum in Abuja. She gets fresh food, I get peace of mind.",
      rating: 4,
      founding: true,
    },
  ],

  earn: {
    eyebrow: "Earn with Qyka",
    title: "Turn your market knowledge into income.",
    agents: {
      headline: "Become an agent",
      pitch: "Shop markets you already know. Flexible hours. Weekly payouts.",
      cta: { label: "Apply as an agent", href: "/for-agents" },
      steps: [
        "Apply and verify your identity",
        "Complete a short training",
        "Accept your first order",
      ],
    },
    riders: {
      headline: "Become a rider",
      pitch: "Pick up packed orders at the market gate. Deliver and earn per trip.",
      cta: { label: "Apply as a rider", href: "/for-riders" },
      steps: [
        "Apply with your vehicle details",
        "Pass the verification check",
        "Start delivering",
      ],
    },
  },

  faq: {
    eyebrow: "FAQ",
    title: "Questions, answered.",
    lede: "Everything about lists, money, agents, and delivery.",
    groups: [
      {
        name: "Ordering",
        questions: [
          { q: "How do I place an order?", a: "Write a free-text list of what you need — just like you'd text a friend. Choose a market or supermarket, set your delivery address, and deposit to start. Your agent picks up from there." },
          { q: "Can I add items after placing my order?", a: "Yes, for a ₦500 add-item fee per addition. Your agent will confirm availability and price before purchasing." },
          { q: "What if something on my list isn't available?", a: "Your agent chats with you in real time. They'll suggest substitutions, send photos, and wait for your approval before buying anything different." },
        ],
      },
      {
        name: "Payment",
        questions: [
          { q: "How does payment work?", a: "You deposit upfront based on your estimated list. Your agent pays vendors by bank transfer — never cash. After shopping, you pay only for what was actually bought. Unspent funds are refunded to your wallet within 24 hours." },
          { q: "What if the price is higher than my budget?", a: "Your agent will contact you before exceeding your deposit. You can approve the extra spend, reduce quantities, or skip items — you're always in control." },
          { q: "What are the fees?", a: "Groceries at market cost (no markup), a service fee, a delivery fee, and a ₦500 fee only if you add items after the run starts. That's it — no hidden charges." },
        ],
      },
      {
        name: "Delivery",
        questions: [
          { q: "How long does delivery take?", a: "Typically 45-90 minutes depending on the market size and your distance. You can track your order in real time from agent assignment to doorstep." },
          { q: "Can I schedule a delivery?", a: "Not yet — orders are fulfilled as soon as an agent is matched. Scheduled orders are coming soon." },
          { q: "What if I'm not home when the rider arrives?", a: "The rider will call you. You can designate a neighbour, gateman, or safe spot for drop-off in your delivery instructions." },
        ],
      },
      {
        name: "Safety",
        questions: [
          { q: "How are agents vetted?", a: "Every agent undergoes ID verification, phone and address confirmation, and market registration checks. They're rated by customers after every order, and low-rated agents are reviewed." },
          { q: "What if I'm not happy with my order?", a: "Report it through the app. Missing items get a full refund. Quality issues are reviewed with photo evidence. Late deliveries earn service fee credits. We aim to resolve all disputes within 48 hours." },
          { q: "Is my payment information safe?", a: "Absolutely. Payments are processed through secure banking rails. Agents never see your card details and never handle cash — all vendor payments are by verified bank transfer." },
        ],
      },
    ],
  },

  finalCta: {
    eyebrow: "Ready?",
    title: "Your market list, handled.",
    body: "Start a list, pick a market, and let a real person do the rest.",
    primaryCta: { label: "Start your list", href: "/shop" },
    reassurance: [
      "No sign-up required",
      "Pay for what's bought",
      "Refunds on unused cash",
    ],
  },

  footer: {
    tagline: "Real groceries — open-air markets and supermarkets — shopped by local agents, paid by transfer, delivered to your door.",
    social: [
      { platform: "Instagram", href: "https://instagram.com/qykagroceries", label: "Follow Qyka on Instagram" },
      { platform: "X", href: "https://x.com/qykagroceries", label: "Follow Qyka on X" },
      { platform: "TikTok", href: "https://tiktok.com/@qykagroceries", label: "Follow Qyka on TikTok" },
      { platform: "LinkedIn", href: "https://linkedin.com/company/qyka", label: "Follow Qyka on LinkedIn" },
      { platform: "WhatsApp", href: "https://wa.me/2348000000000", label: "Chat with Qyka on WhatsApp" },
    ],
    columns: {
      product: {
        title: "Product",
        links: [
          { label: "Shop", href: "/shop" },
          { label: "How it works", href: "/#how-it-works" },
          { label: "Markets", href: "/markets" },
          { label: "Pricing", href: "/#pricing" },
        ],
      },
      earn: {
        title: "Earn",
        links: [
          { label: "Agents", href: "/for-agents" },
          { label: "Riders", href: "/for-riders" },
          { label: "Vendors", href: "#", comingSoon: true },
        ],
      },
      company: {
        title: "Company",
        links: [
          { label: "About", href: "/about" },
          { label: "Trust & Safety", href: "/trust-and-safety" },
          { label: "Careers", href: mailto("Careers") },
          { label: "Press", href: mailto("Press") },
          { label: "Contact", href: mailto("Contact") },
        ],
      },
      help: {
        title: "Help",
        links: [
          { label: "FAQ", href: "/#faq" },
          { label: "WhatsApp support", href: "https://wa.me/2348000000000" },
          { label: "Report a problem", href: mailto("Report a problem") },
        ],
      },
    },
    legal: {
      businessName: "Qyka Technologies Ltd",
      address: "Ibadan, Nigeria",
      links: [
        { label: "Terms", href: "/legal/terms" },
        { label: "Privacy", href: "/legal/privacy" },
        { label: "NDPR Notice", href: "/legal/ndpr" },
      ],
    },
  },
} as const;

export type HeroVariant = keyof typeof LANDING.hero.variants;
export type FaqGroup = typeof LANDING.faq.groups[number];
