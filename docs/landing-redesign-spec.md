# Qyka landing page — full rebuild & redesign spec (nav → footer)

Scope: `app/page.tsx` → `screens/MarketingPage.tsx` (671 lines: hero, get-started tiles, orange action band, feature cards, trust, help, FAQ, final CTA), plus `components/marketing/*` (Header, Footer, Marquee, TickerStrip, BoltBasket, DeviceMockup, MarketShopPicker, HelpWidget, CustomCursor, motion helpers) and the four sub-pages (`/about`, `/for-agents`, `/for-riders`, `/markets`, `/trust-and-safety`).

Constraints that already exist and must be respected (from prior decisions):
- Cream/white surfaces only; **no dark sections** (no `bg-ink` bands, dark footer included).
- Peach/burnt-orange (#EE9A5A, dark #D9702F, soft #F6C4A0) is the dominant brand + CTA colour. Olive is a rare success-only accent.
- Flat line-art illustration set (86 assets in `assets/illustrations/`), "hyperlocal market with human agents" vision.
- Shared primitives: `Card` shape rule, `SectionHeader` icon-well, `HeroBanner`, `FilterPills` segmented control, `Button`, `Chip`, `WavyDivider`.
- The redesign must look *visibly different*, not token polish.

---

## 0. Strategy first (why the page exists)

**One job:** convert a first-time Nigerian visitor (mostly on a phone, mostly on mobile data, often arriving from WhatsApp/Instagram/TikTok/a friend's link) into *"I built my first list and picked a market"* within ~60 seconds, without forcing sign-up first (the app already supports guest `/shop`).

**Three audiences, ranked**
1. Customers (busy professionals, families, diaspora ordering for family, small food businesses) — 80% of the page.
2. Agents / shoppers (earning side) — supply, so a strong secondary path.
3. Riders + vendors + press/investors — quiet paths in nav/footer only.

**Core message hierarchy** (one idea per screen-height):
1. *What*: "Your own person at the market." A real human shops your list.
2. *How*: list → agent shops → you pay for what's actually bought → delivered.
3. *Why trust it*: named agent, live chat/photos, pay-for-what's-bought, refunds of overage, ratings.
4. *Where*: which markets/cities right now (honest coverage, not vague).
5. *What it costs*: transparent fees (₦500 add-item, delivery, service fee) — no surprises is the brand promise.
6. *Do it now*: start a list.

**Success metrics to instrument** (PostHog/GA4 events): hero CTA click, list-started-from-landing, market chosen on landing, waitlist submit, agent-apply click, scroll depth 25/50/75/100, FAQ opens, video/demo plays, LCP/INP/CLS, mobile vs desktop split, source (utm/ref) → first order conversion.

---

## 1. Design system layer for the landing (so it's coherent, not a one-off)

**Type scale (fluid, mobile-first)**
- Display: `clamp(2.5rem, 7vw, 5rem)`, weight 800, tight tracking (-0.03em), line-height 1.02. Font-display face already in use.
- H2: `clamp(1.875rem, 4vw, 3rem)`. H3: 1.25–1.5rem. Body 1rem/1.6 (18px on desktop hero lead). Eyebrows: 0.75rem, uppercase, +0.12em tracking, peach-dark.
- Rule: max 12 words per headline line, max 65ch line length, no orphan words (`text-wrap: balance` on headings, `pretty` on paragraphs).

**Colour roles on the landing**
- Backgrounds alternate: `canvas` (cream) ↔ `surface` (white) ↔ **`canvas-deep`** (one band per page max) ↔ **one full-bleed peach band** (the "action" moment, ink text #1A1A1A on peach — contrast ≥ 7:1).
- Text: ink for headings, muted for body, faint for meta. Never peach text below 18px on cream (contrast fails) — use `orange-dark` for text, `orange` for fills.
- Illustration tints: reuse the illustration palette; never recolour art.

**Spacing/rhythm**: 8-pt grid. Section padding `py-16 sm:py-24 lg:py-32`. Container max 1200px, 16px mobile gutter (24 at sm, 32 at lg). Alternate section shapes with `WavyDivider` **only** between cream↔white transitions (not every seam) so it doesn't become a gimmick.

**Components to add/standardise** (put in `components/marketing/`)
- `Section` (eyebrow + title + lede + slot, handles anchor id/scroll-margin).
- `FeatureRow` (alternating text/illustration, mobile stacked with illustration first).
- `Stat` (count-up, reduced-motion safe).
- `StepRail` (numbered vertical on mobile, horizontal with connecting dashed path on desktop).
- `LogoCloud`/`PressStrip`, `TestimonialCard`, `PriceRow`, `CoverageMap`, `AppStoreBadges`, `StickyCta`.
- Reuse the in-app `Card` shape rule so landing cards ≡ app cards (brand continuity when the user enters the app).

**Motion principles**: purposeful, 200–450ms, `ease-premium`; scroll reveal = opacity+translateY 16px once; parallax max 24px; **everything honours `prefers-reduced-motion`**; no motion on above-the-fold LCP element. Retire `CustomCursor` (desktop-only gimmick, hurts a11y and adds JS) or keep it strictly opt-in for fine pointers and never over form fields.

---

## 2. Section-by-section blueprint

### 2.1 Announcement bar (optional, dismissible, above nav)
- One line: "Now live in Ibadan · Lagos Mainland opens 12 Oct — Join the list →". Cream-deep background, 36px tall, dismiss stores `sessionStorage`.
- Use for launch/coverage news only; remove when nothing to say (an empty bar is worse than none).

### 2.2 Navigation (rebuild `MarketingHeader`)
**Desktop (≥1024px)**
- Left: logo (wordmark + mark), 28px. Centre: **Shop**, **How it works**, **Markets**, **Pricing**, **Become an agent**, **Help**. Right: `Sign in` (ghost) + `Start a list` (peach solid, pill).
- "Become an agent" and "Ride with us" live under a **"Earn with Qyka" mega-menu** (2 columns: Agents [icon, 1-line pitch], Riders [icon, pitch], plus "Vendors" coming soon). Hover-intent delay 120ms; keyboard: Enter/Space toggles, Esc closes, arrow keys move; `aria-expanded`, focus trap not required (non-modal).
- Transparent over hero → on scroll >8px becomes white/blurred (`backdrop-blur-md bg-white/80`) with hairline border and drops height 80→64px. Use `IntersectionObserver` sentinel, not a scroll listener.
- Active-section highlighting (scroll-spy) for in-page anchors; sub-pages highlight their own item.
- If signed in: replace CTAs with avatar+name chip → "Go to app" (the page currently redirects; keep redirect but show it only after hydration to avoid flash).

**Mobile (<1024px)** — mirror the app's mobile-first system:
- 56px bar: logo left, `Start a list` compact pill + menu button right.
- Full-height sheet (same slide easing as ShopBag mobile), large tappable rows (min 52px), grouped: Product / Earn / Company, sign-in row at bottom, WhatsApp support link, language/currency later.
- Lock body scroll, restore focus to trigger on close, close on route change.
- **Sticky bottom CTA** appears after the hero leaves the viewport ("Start your list — free, no sign-up"), hides near the final CTA/footer, respects `safe-area-inset-bottom`.

### 2.3 Hero (the most important 100vh)
**Layout**: two-column ≥lg (copy 6/12, visual 6/12); stacked on mobile with visual *below* CTAs but the CTA block above the fold on a 667px-tall phone.

**Copy** (test 3 variants):
- A: "Your personal shopper at the market." / sub: "Send your list. A real person in the market picks it fresh, negotiates fairly, and brings it to your door."
- B: "Market prices. Doorstep convenience."
- C (trust-led): "Someone you can chat with is shopping for you right now."
- Eyebrow chip with live pulse: "● 42 agents shopping right now" (real number from the API, fallback to a static phrase; never fake numbers).

**CTAs**: primary "Start your list" (peach, 56px tall on mobile) → `/shop` (guest allowed); secondary "See how it works" (ghost, smooth-scroll). Micro-trust line under: "No sign-up to start · Pay only for what's bought · Refunds on unused cash". Below: stars + "4.8 from 1,200 orders" only when real.

**Visual** (this is where "visibly different" happens): a **layered product scene**, not a stock illustration:
- Centre: phone `DeviceMockup` showing the real ListBuilder (static, animated typing: "tomatoes basket", "garri 2 cups"…), items tick/strike as the agent "buys" them (same struck-through paper style as the app).
- Around it, floating cards with gentle parallax: agent chip ("Ngozi · 4.9 ★ · at Bodija Market"), chat bubble ("Fresh tomatoes ₦4,500 — take?" + photo thumbnail), live delivery pill with ETA, receipt row ("Saved ₦1,300 vs. supermarket").
- Illustration accents from the set (basket, produce crate, scooter rider) placed behind at 100% opacity, offset from the phone so it reads as a scene.
- Replace the current generic hero art; keep `BoltBasket`/`Marquee` only if they serve the story.
- Mobile: phone scales to 80vw, floating cards reduced to 2, no parallax.

**Beneath hero (still visible on desktop fold)**: "Shop by market" quick picker — 3–5 market tiles (name, distance, "open now" status, image) using the existing `MarketShopPicker` data. Click = start a list with that market preselected (deep link `/shop?market=…`). This turns the hero into a live funnel step.

**Performance**: hero image `priority`, AVIF/WebP, explicit dimensions; no layout shift; fonts `display: swap` with metric-matched fallback; LCP < 2.0s on 4G.

### 2.4 Social proof strip (immediately under hero)
- Left: "Trusted by 3,400+ households in Ibadan" (real). Middle: 3–4 rating/press logos if they exist (do **not** fake logos). Right: 3 micro-stats (orders delivered, avg delivery time, avg saving). Horizontally scrollable on mobile with snap; count-up on first view.
- If pre-launch with no data → replace with "Founding members" waitlist counter and honest "Launching in …" message.

### 2.5 How it works (replace tiles with a StepRail)
Four steps, each with icon-well, 8-word title, 20-word body, and a *real* UI fragment (small screenshot card):
1. **Write your list** — type or paste from WhatsApp; add photos; choose a market. (Fragment: ListBuilder.)
2. **Meet your agent** — matched by area & rating; chat before they shop. (Fragment: agent proposal card w/ Accept / See another.)
3. **They shop, you watch** — live photos, price confirmations, substitutions you approve. (Fragment: chat with image.)
4. **Pay & receive** — pay for what's actually bought; overage refunded; rider brings it. (Fragment: receipt + map w/ market & delivery pins.)
- Desktop: sticky left column (step text) + right column (device swaps its screen as you scroll — "scrollytelling", implemented with IntersectionObserver, no heavy library). Mobile: simple vertical rail with connector line.
- CTA at the end: "Start step 1 now".

### 2.6 Why Qyka / value pillars (bento grid)
Bento of 6 cards, asymmetric sizes, each with one illustration + one number/claim:
- **Fresher than delivery apps** — picked by a human who can see/touch it (illustration: produce crate).
- **Fair market prices** — you see the real price paid, receipts attached (weighing scale).
- **Your agent, your chat** — voice/video/photo chat (agent-customer conversation).
- **Pay for what's bought** — held float; unspent cash refunded (wallet).
- **Track everything** — five-step live rail: Agent → Shopping → Payment → Packing → Delivery (delivery-map-route).
- **Lists you can reuse** — drafts, edit, "use again" (person-shopping-list).
- Hover: card lifts 4px + illustration nudges; on touch: no hover dependence.
- Compare row beneath (see 2.8).

### 2.7 Markets & coverage
- Interactive **coverage map** (Leaflet + OSM tiles, already in the codebase): pins for each active market with popup (name, hours, categories, agents online), a shaded delivery polygon. Legend: Live / Opening soon (dashed). "Not in your area? Join the waitlist" input (existing `WaitlistInline`) that captures area.
- Right/below: horizontally scrolling market cards (photo, "Open now · closes 6pm", typical basket price, specialty chips: Fresh produce, Grains, Fish, Provisions).
- Local vs Supermarket toggle (the same segmented control as the app) previews both modes and their difference (price/speed).
- SEO: each market gets its own indexable page `/markets/[slug]` with LocalBusiness/Place structured data.

### 2.8 Pricing transparency
- "What it costs" calculator: choose basket size (₦10k / 25k / 50k) → live breakdown: groceries at cost, service fee, delivery, add-item fee (₦500, additions only) → total, vs. a typical delivery-app markup comparison (label as illustrative, with methodology in a tooltip — no unverifiable claims).
- Small table "What's included / What isn't". Link to full fee policy.
- Reduces the #1 objection ("what's the catch?").

### 2.9 Trust & safety (its own full-width white section; no dark)
Five trust proofs with icons:
- Verified agents (ID + phone + address check, market registration), rated after every order.
- Pay-for-what's-bought & refunds; **payment held until shopping done**.
- Every purchase evidenced by photo/receipt in chat.
- Delivery by vetted riders with live tracking and handoff confirmation.
- Support: 24/7 chat, disputes resolved within X hours (state the real SLA).
- Add a real **incident-handling** panel: "If something goes wrong" (item missing → refund, late → credit, rude agent → report). Links to `/trust-and-safety`.

### 2.10 Testimonials / stories
- 3 cards (photo, first name + area, order type, quote ≤ 30 words, star rating) + one longer **video/story** (30–45s, captions, poster image, lazy loaded; no autoplay with sound). Pre-launch fallback: "Founding tester" quotes clearly labelled.
- Include agent testimonials ("I earned ₦85k last month") only if substantiated; add an earnings disclaimer.

### 2.11 Earn with Qyka (agents & riders)
- Split band: **Agents** (illustration: agent with laptop) — "Turn your market knowledge into income": flexible hours, weekly payout, how it works in 3 steps, earnings estimator slider (orders/week → est. income, labelled illustrative). **Riders** (scooter) — similar. CTAs → `/for-agents`, `/for-riders` with pre-filled apply form.
- Peach solid band is a natural spot here (the one "action" band).

### 2.12 Download / continue on phone
- Web-first PWA: "Add to Home Screen" prompt explainer with 3-step visuals (iOS Safari vs Android Chrome variants, detect UA). QR code on desktop → phone. App-store badges only when they exist.
- Optional WhatsApp entry: "Or send your list on WhatsApp" (deep link `wa.me`), a strong fit for the audience (pairs with the OTP WhatsApp channel).

### 2.13 FAQ
- 10–12 questions in 4 groups (Ordering, Payment, Delivery, Safety). Accordion with `aria-controls`, single-open on mobile. Search filter above list (reuse `SearchField`). Add `FAQPage` JSON-LD. Top questions: fees, substitutions, what if price is higher than my budget, how agents are vetted, refund timeline, coverage, delivery time, cancelling.
- "Still stuck?" → chat widget / WhatsApp.

### 2.14 Final CTA
- Full-width, cream-deep card with large illustration cluster (basket + produce), headline "Your market list, handled.", primary button, and the inline waitlist/email-or-phone capture for non-covered users. Include reassurance chips (no sign-up, pay for what's bought, refunds).

### 2.15 Footer (rebuild `MarketingFooter`)
- Light (white/cream) footer, **not dark**. Top row: logo + one-line promise + social icons (Instagram, X, TikTok, LinkedIn, WhatsApp) with aria-labels.
- 4 link columns: **Product** (Shop, How it works, Markets, Pricing, Lists), **Earn** (Agents, Riders, Vendors), **Company** (About, Trust & safety, Careers, Press, Contact), **Help** (FAQ, WhatsApp support, Report a problem, Status).
- Newsletter/WhatsApp-broadcast opt-in (single field, consent text).
- Bottom bar: © year, Terms, Privacy, Cookies, NDPR notice, registered business name/RC number, address (Nigerian trust signal), language/currency (₦ NGN) selector placeholder, "Made in Nigeria 🇳🇬".
- Big faded wordmark or illustration strip above the bottom bar for personality; keep contrast AA.

### 2.16 Persistent extras
- `HelpWidget`: restyle to match app chat; hide on the sticky-CTA overlap; load after idle.
- Cookie/consent banner (NDPR): compact bottom card, not modal; granular toggle in footer.
- Back-to-top button after 1.5 screens; scroll progress hairline in header (optional).
- 404 and error pages restyled to the same illustrated system.

---

## 3. Sub-pages (same system, same nav/footer)
- **/about**: story timeline (why markets, why humans), team grid, values, numbers, press kit, careers CTA.
- **/for-agents**: hero + earnings estimator, "a day in the life", requirements checklist, onboarding steps (apply → verify → training → first order), FAQ, application form (multi-step, saves progress, phone OTP with the new SMS→WhatsApp→Call fallback).
- **/for-riders**: similar, plus zones/vehicle requirements/payout schedule.
- **/markets** (+ `/markets/[slug]`): directory with map + filter chips (city, category, open now), per-market pages.
- **/trust-and-safety**: policies as scannable cards, agent vetting explained, dispute flow diagram, contact.
- **/pricing** (new), **/help** (searchable help centre, new), **/legal/*** (terms/privacy with sticky ToC).
- Consistent page hero via the existing `HeroBanner` (compact) so marketing sub-pages and in-app pages share DNA.

---

## 4. Interaction, motion & micro-details
- Buttons: 44px+ hit area, pressed scale .98, loading spinners inline, focus ring 2px peach-dark with 2px offset.
- Scroll reveals via a single shared `IntersectionObserver` hook (`motion.tsx` already exists — consolidate `ClipReveal`, `SplitReveal`, `TiltCard` to 2 primitives: `Reveal` and `Stagger`; drop tilt on touch).
- Number count-ups only once, skip under reduced motion.
- Marquee/ticker: pause on hover/focus, `aria-hidden` duplicate track, respects reduced motion; use it only for market names or ingredient words, not as filler.
- Smooth in-page anchors with header offset (`scroll-margin-top` = header height + 16).
- Skeletons/placeholder blur for images; no spinners on the landing.
- Page transitions between marketing pages: fade only (same `animate-page-in` as the app).

---

## 5. Content & copy system
- Voice: warm, direct, Nigerian-English friendly; light Pidgin sparingly in microcopy ("No wahala") — test, don't force.
- Every section: eyebrow (2–3 words) → headline (benefit) → one sentence → proof/visual → CTA.
- Numbers must be real or omitted; label estimates ("Typical", "Illustrative").
- Currency `₦` with thousands separators; dates local; times WAT.
- i18n-ready structure (copy in a `content/landing.ts` object) so Yoruba/Hausa/Pidgin variants can follow.
- Localised OG images per market for sharing on WhatsApp (preview card matters a lot here).

---

## 6. Accessibility (WCAG 2.2 AA target)
- Semantic landmarks (`header/nav/main/section aria-labelledby/footer`), one `h1`, logical heading order, skip-to-content link.
- Contrast: ink on peach ≥ 7:1; peach-dark text only ≥18px or bold ≥14px; check every muted-on-cream pair.
- Keyboard: full menu/accordion/map operability; visible focus; no traps; map has "list view" alternative.
- Motion: reduced-motion honoured; no auto-playing media with sound; pause control for marquee.
- Forms: labels always visible, `autocomplete` (tel, email, name), inline errors with `aria-live`, phone input with +234 handling.
- Images: meaningful alt for informative art, `alt=""` for decorative; captions/transcripts for video.
- Touch targets ≥ 44px; text scales to 200% without loss; no horizontal scroll at 320px.

---

## 7. Performance budget (mobile 4G, mid-range Android)
- LCP ≤ 2.0s, INP ≤ 200ms, CLS ≤ 0.05, JS on landing ≤ 150KB gz, total transfer ≤ 900KB above the fold.
- Server-render the landing (turn the client-side redirect in `app/page.tsx` into a small client island; keep the page itself a server component so HTML is instant).
- Images: AVIF/WebP via `next/image`, responsive `sizes`, lazy below fold; convert the 86 PNG illustrations to optimised WebP/SVG where possible (many are large PNGs today — biggest quick win).
- Dynamic-import heavy pieces: Leaflet map, `DeviceMockup` animations, `HelpWidget`, video.
- Preconnect to Cloudinary/tile server only when the map is near viewport; font subsetting (Latin only) with preload for the display font.
- Remove unused marketing components (`CustomCursor`, `BoltBasket` if unused) to cut JS.
- Measure with Lighthouse CI in the pipeline; fail PR on budget regression.

---

## 8. SEO, sharing & analytics
- Title/description per page, canonical, `og:image` (1200×630, per-market), Twitter card, `lang="en-NG"`.
- JSON-LD: Organization, WebSite (SearchAction), FAQPage, LocalBusiness per market, BreadcrumbList on sub-pages.
- Sitemap + robots, clean URLs, hreflang later, internal linking (footer + market pages).
- Target keywords: "grocery delivery Ibadan/Lagos", "market shopping agent", "buy foodstuff online Nigeria", "send someone to market for me".
- Analytics: privacy-friendly (consent-gated), event taxonomy above, UTM capture stored on the user at sign-up for attribution, A/B testing for hero copy/CTA (edge config or simple cookie split).

---

## 9. Responsive rules
- Breakpoints: 360 (min design), 640, 768, 1024, 1280, 1536. Design mobile first; desktop gets *more*, not different, content.
- Mobile: single column, big CTAs, sticky bottom CTA, horizontally scrolling rails with snap and partial peek (16px) so scrollability is obvious *without* visible scrollbars/lines (matches the earlier "hide overflow lines" fix).
- Tablet: 2-column grids; nav becomes mobile sheet until 1024.
- Large: cap width at 1200 (1320 for the hero/bento), generous whitespace, don't stretch illustrations.

---

## 10. Security, privacy & compliance touches
- NDPR consent banner + privacy policy link on every form that collects data.
- Waitlist/lead forms: rate-limited, honeypot + Turnstile, double opt-in for email, no PII in query strings.
- CSP that allows only Cloudinary, map tiles, analytics; `rel="noopener"` on external links.
- Phone capture uses the new OTP delivery path (SMS first; WhatsApp/voice fallback after 45s; 30s resend cooldown).

---

## 11. Suggested build order (so credits are spent where impact is highest)
1. **Foundation (½ day)**: `Section`, `Reveal`, type scale tokens, motion consolidation, remove dead components.
2. **Nav + sticky mobile CTA + footer (1 day)** — visible everywhere, immediate "new site" feel.
3. **Hero + market quick-picker + social-proof strip (1–1.5 days)** — biggest conversion lever.
4. **How it works StepRail + bento (1 day)**.
5. **Markets/coverage map + pricing calculator (1–1.5 days)**.
6. **Trust, testimonials, Earn band, FAQ, final CTA (1 day)**.
7. **Sub-pages restyle to the shared system (1–2 days)**.
8. **SEO/JSON-LD/OG images, analytics, a11y audit, performance pass (1 day)**.
9. **A/B test hero copy and iterate from data.**

## 12. Definition of done
- Lighthouse mobile ≥ 90 (Perf), 100 (A11y/SEO/Best-practices); axe: zero serious/critical.
- Playwright tests: nav (desktop + mobile sheet), hero CTAs deep-link, market picker preselects, FAQ accordion, waitlist submit, sticky CTA show/hide, sub-page nav/footer parity, 320px no-overflow, reduced-motion.
- Visual regression snapshots at 375 / 768 / 1280.
- Every claim/number on the page traceable to real data or labelled illustrative.

---

## 13. Open decisions for the owner
1. Real launch numbers available (orders, agents, ratings) or pre-launch honesty mode?
2. Cities live at launch, and is the coverage map public now?
3. Is there video/photo content of real agents/markets (huge trust lever) or do we stay illustrated for v1?
4. WhatsApp-first entry ("send your list on WhatsApp") — in scope for v1?
5. Pricing calculator: publish exact fee rules or ranges?
6. Retire `CustomCursor`/heavy motion? (recommended: yes.)
