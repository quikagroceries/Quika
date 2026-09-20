/**
 * Landing-page strings, one dictionary per language. `Dict` is derived from
 * English, so a missing or misspelt key in another language is a type error,
 * not a blank on the page.
 *
 * Pidgin (`pcm`, the BCP-47 / ISO 639-3 code for Nigerian Pidgin) is a DRAFT
 * written for tone - it needs a native Pidgin writer to review before launch.
 * Prices, legal text and data that comes from the API (market blurbs) stay in
 * English on purpose.
 */
export type Locale = "en" | "pcm";
export const LOCALES: { key: Locale; label: string; short: string }[] = [
  { key: "en", label: "English", short: "EN" },
  { key: "pcm", label: "Pidgin", short: "Pidgin" },
];

export const en = {
  nav: { how: "How it works", earn: "Earn with us", signIn: "Sign in", start: "Start a list" },
  hero: {
    badge: "Personal shopping at the market",
    titleA: "The market,",
    titleB: "delivered.",
    sub: "Send your list. A real person shops it fresh, you chat as they go, and it lands at your door.",
    listLabel: "What do you need from the market?",
    button: "Find my agent",
    opening: "Opening…",
    fine: "No sign-up to start · Pay only for what's bought",
    tapToAdd: "Tap to add",
    placeholders: ["Tomatoes, 1 basket", "Garri, 2 cups", "Palm oil, 2 litres", "Fresh pepper, 1 paint", "Eggs, 1 crate"],
    pickedFresh: "Picked fresh",
    liveUpdates: "Live updates",
  },
  strip: { title: "What are you cooking?" },
  how: {
    eyebrow: "How it works",
    title: "Three steps. Zero market stress.",
    steps: [
      { title: "Write your list", body: "Type it like you'd text a friend. No sign-up needed to start." },
      { title: "Meet your agent", body: "A real person in the market picks it up, chats with you and sends photos." },
      { title: "Get it delivered", body: "Pay only for what's bought. Track your order all the way to your door." },
    ],
  },
  markets: {
    eyebrow: "Markets",
    title: "Pick your market.",
    sub: (n: number) => `${n} open now, more opening soon. Tap one to start a list there.`,
    all: "See all markets →",
    open: "Open",
    soon: "Opening soon",
    startHere: "Start a list here →",
    notify: "Get notified →",
    local: "Local market",
    supermarket: "Supermarket",
  },
  trust: {
    eyebrow: "Why Qyka",
    title: "Someone you can talk to is shopping for you.",
    points: [
      { title: "Pay for what's bought", body: "Unspent cash goes straight back to your wallet." },
      { title: "Live updates", body: "Photos, prices and swaps, in real time, in chat." },
      { title: "A person, not a robot", body: "Rated agents who know the stalls and bargain fairly." },
      { title: "Help when you need it", body: "Support is a message away, any time." },
    ],
    chat: ["Fresh tomatoes ₦4,500. Take them?", "Yes please 👍", "Bought ✓ photo sent"],
  },
  earn: {
    agent: { title: "Know the market? Shop for others and earn.", body: "Set your own hours. Get paid for every list you shop.", cta: "Become an agent" },
    rider: { title: "Got wheels? Deliver with Qyka.", body: "Short trips from market to door, paid weekly.", cta: "Become a rider" },
  },
  faq: {
    eyebrow: "FAQ",
    title: "Questions, answered.",
    lede: "Lists, money, agents and delivery, in plain words.",
    link: "Visit the help centre →",
    items: [
      { q: "How do I place an order?", a: "Write a free-text list of what you need — just like you'd text a friend. Choose a market or supermarket, set your delivery address, and deposit to start. Your agent picks up from there." },
      { q: "Can I add items after placing my order?", a: "Yes, for a ₦500 add-item fee per addition. Your agent will confirm availability and price before purchasing." },
      { q: "What if something on my list isn't available?", a: "Your agent chats with you in real time. They'll suggest substitutions, send photos, and wait for your approval before buying anything different." },
      { q: "How does payment work?", a: "You deposit upfront based on your estimated list. Your agent pays vendors by bank transfer — never cash. After shopping, you pay only for what was actually bought. Unspent funds are refunded to your wallet within 24 hours." },
      { q: "What if the price is higher than my budget?", a: "Your agent will contact you before exceeding your deposit. You can approve the extra spend, reduce quantities, or skip items — you're always in control." },
      { q: "What are the fees?", a: "Groceries at market cost (no markup), a service fee, a delivery fee, and a ₦500 fee only if you add items after the run starts. That's it — no hidden charges." },
      { q: "How long does delivery take?", a: "Typically 45-90 minutes depending on the market size and your distance. You can track your order in real time from agent assignment to doorstep." },
    ],
  },
  cta: { title: "Your list. Their legwork.", body: "Start with what you need today. We'll find you an agent.", button: "Start your list" },
  footer: {
    tagline: "A real person shops your list at the market and brings it to your door. Pay only for what's bought.",
    cols: { qyka: "Qyka", earn: "Earn with us", company: "Company" },
    links: { how: "How it works", markets: "Markets", pricing: "Pricing", help: "Help", agent: "Become an agent", rider: "Become a rider", about: "About", trust: "Trust & Safety" },
    start: "Start a list",
    language: "Language",
  },
  prompt: { title: "Wan read am for Pidgin?", body: "We fit show this page for Pidgin.", yes: "Yes, use Pidgin", no: "No, thanks" },
};

export type Dict = typeof en;

export const pcm: Dict = {
  nav: { how: "How e dey work", earn: "Make money with us", signIn: "Sign in", start: "Start list" },
  hero: {
    badge: "Person go shop market for you",
    titleA: "Market dey",
    titleB: "come meet you.",
    sub: "Send your list. Person wey sabi market go shop am fresh, you go dey chat with am, and e go reach your door.",
    listLabel: "Wetin you need from market?",
    button: "Find my agent",
    opening: "E dey open…",
    fine: "No need to sign up to start · Pay only for wetin dem buy",
    tapToAdd: "Tap to add",
    placeholders: ["Tomatoes, 1 basket", "Garri, 2 cups", "Palm oil, 2 litres", "Fresh pepper, 1 paint", "Eggs, 1 crate"],
    pickedFresh: "Fresh from market",
    liveUpdates: "Live update",
  },
  strip: { title: "Wetin you wan cook?" },
  how: {
    eyebrow: "How e dey work",
    title: "Three steps. No market wahala.",
    steps: [
      { title: "Write your list", body: "Write am like say you dey text your padi. You no need sign up first." },
      { title: "Meet your agent", body: "Person wey sabi market go pick your things, chat with you and send you pictures." },
      { title: "Get am for your door", body: "Pay only for wetin dem buy. Follow your order until e reach your door." },
    ],
  },
  markets: {
    eyebrow: "Markets",
    title: "Pick your market.",
    sub: (n: number) => `${n} don open, more dey come soon. Tap one make you start list for there.`,
    all: "See all markets →",
    open: "Don open",
    soon: "E dey come soon",
    startHere: "Start list for here →",
    notify: "Make we tell you →",
    local: "Local market",
    supermarket: "Supermarket",
  },
  trust: {
    eyebrow: "Why Qyka",
    title: "Person wey you fit talk to dey shop for you.",
    points: [
      { title: "Pay for wetin dem buy", body: "Money wey dem no spend go enter your wallet back." },
      { title: "Live update", body: "Pictures, price and swaps, live for chat." },
      { title: "Na person, no be robot", body: "Agents wey sabi the stalls and dey bargain well." },
      { title: "Help dey ready", body: "Support dey one message away, anytime." },
    ],
    chat: ["Fresh tomato na ₦4,500. You go take am?", "Yes abeg 👍", "I don buy am ✓ picture don enter"],
  },
  earn: {
    agent: { title: "You sabi market? Shop for people, collect money.", body: "Choose your own time. Dem go pay you for every list wey you shop.", cta: "Become an agent" },
    rider: { title: "You get bike or keke? Deliver with Qyka.", body: "Short trips from market to door, dem go pay you every week.", cta: "Become a rider" },
  },
  faq: {
    eyebrow: "FAQ",
    title: "Wetin people dey ask.",
    lede: "Lists, money, agents and delivery, for simple words.",
    link: "Go help centre →",
    items: [
      { q: "How I go take place order?", a: "Write wetin you need like say you dey text your padi. Choose market or supermarket, put your delivery address, then pay deposit to start. Your agent go take am from there." },
      { q: "I fit add items after I don place order?", a: "Yes, na ₦500 for each item wey you add. Your agent go confirm say e dey and the price before dem buy." },
      { q: "Wetin go happen if something for my list no dey?", a: "Your agent go chat with you live. Dem go suggest another one, send pictures, and wait for your yes before dem buy different thing." },
      { q: "How payment dey work?", a: "You go pay deposit first based on your estimated list. Your agent go pay vendors by bank transfer — no cash. After shopping, you go pay only for wetin dem really buy. Any money wey remain go return to your wallet inside 24 hours." },
      { q: "Wetin if the price pass my budget?", a: "Your agent go contact you before dem pass your deposit. You fit approve the extra, reduce quantity, or skip item — na you dey control." },
      { q: "Wetin be the fees?", a: "Groceries at market price (no markup), service fee, delivery fee, and ₦500 only if you add items after the run don start. That's all — no hidden charges." },
      { q: "How long delivery dey take?", a: "Normally 45 to 90 minutes, e depend on the market size and how far you dey. You fit track your order live from when agent accept am until e reach your door." },
    ],
  },
  cta: { title: "Your list. Dem go do the running.", body: "Start with wetin you need today. We go find agent for you.", button: "Start your list" },
  footer: {
    tagline: "Person go shop your list for market and bring am reach your door. Pay only for wetin dem buy.",
    cols: { qyka: "Qyka", earn: "Make money with us", company: "Company" },
    links: { how: "How e dey work", markets: "Markets", pricing: "Pricing", help: "Help", agent: "Become an agent", rider: "Become a rider", about: "About", trust: "Trust & Safety" },
    start: "Start list",
    language: "Language",
  },
  prompt: { title: "Wan read am for Pidgin?", body: "We fit show this page for Pidgin.", yes: "Yes, use Pidgin", no: "No, thanks" },
};

export const DICTS: Record<Locale, Dict> = { en, pcm };
