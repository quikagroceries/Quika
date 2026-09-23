import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { DIRECTORY_MARKETS, DirectoryMarket } from "@/lib/marketDirectory";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { Section } from "@/components/marketing/Section";
import Card from "@/components/Card";
import WavyDivider from "@/components/WavyDivider";
import { HeroIn, Reveal, Stagger, StaggerItem } from "@/components/marketing/motion";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return DIRECTORY_MARKETS.map((m) => ({
    slug: m.id,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const market = DIRECTORY_MARKETS.find((m) => m.id === slug);
  if (!market) {
    return {
      title: "Market Not Found — Qyka Groceries",
    };
  }

  return {
    title: `${market.name} — Qyka Groceries`,
    description: market.blurb,
    alternates: {
      canonical: `https://qyka.com/markets/${market.id}`,
    },
  };
}

export default async function MarketPage({ params }: PageProps) {
  const { slug } = await params;
  const market = DIRECTORY_MARKETS.find((m) => m.id === slug);

  if (!market) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": market.venueType === "supermarket" ? "GroceryStore" : "Market",
    name: market.name,
    description: market.blurb,
    address: {
      "@type": "PostalAddress",
      addressLocality: market.city,
      addressRegion: market.state,
      addressCountry: "NG",
    },
    image: `https://qyka.com${market.image}`,
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col selection:bg-brand-orange/20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingHeader />

      <main className="flex-1 pb-16">
        <HeroIn>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
            <div className="flex flex-col lg:flex-row gap-12 items-start">
              <div className="w-full lg:w-1/2 rounded-3xl overflow-hidden aspect-[4/3] relative shadow-sm border border-line bg-canvas-deep">
                <Image
                  src={market.image}
                  alt={market.name}
                  fill
                  className="object-cover"
                  priority
                />
              </div>

              <div className="w-full lg:w-1/2 flex flex-col pt-4">
                <Link href="/markets" className="text-sm font-semibold text-brand-orange-dark mb-6 inline-flex items-center hover:underline">
                  &larr; Back to all markets
                </Link>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="bg-surface text-ink text-xs font-bold px-3 py-1.5 rounded-full border border-line shadow-sm">
                    {market.venueType === "supermarket" ? "Supermarket" : "Open-air Market"}
                  </span>
                  {market.status === "pilot" ? (
                    <span className="bg-brand-green/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                      Live Now
                    </span>
                  ) : (
                    <span className="bg-ink/80 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                      Coming Soon
                    </span>
                  )}
                </div>

                <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-ink mb-4 text-balance">
                  {market.name}
                </h1>
                <p className="text-lg text-muted mb-8">{market.city}, {market.state}</p>

                <p className="text-xl text-ink leading-relaxed mb-10 max-w-lg">
                  {market.blurb}
                </p>

                {market.status === "pilot" ? (
                  <Link 
                    href={`/shop?market=${market.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-8 min-h-[56px] font-semibold text-lg transition-all duration-150 select-none active:scale-[0.98] focus:outline-none bg-brand-orange text-[#1A1A1A] shadow-sm hover:bg-brand-orange-dark hover:shadow active:bg-brand-orange-dark max-w-sm w-full"
                  >
                    Shop this market now
                  </Link>
                ) : (
                  <form className="max-w-sm w-full flex flex-col gap-3">
                    <label className="text-sm font-semibold text-ink">Join the waitlist for {market.name}</label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="Your email address"
                        className="flex-1 h-[50px] rounded-2xl px-4 border border-line bg-surface text-ink focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                        required
                      />
                      <button 
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 min-h-[50px] font-semibold text-base transition-all duration-150 select-none active:scale-[0.98] bg-ink text-white hover:bg-ink/90"
                      >
                        Join
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </HeroIn>

        <WavyDivider />

        <Section
          bg="surface"
          title="What you'll find here"
          lede="The categories available when shopping at this location."
        >
          <div className="flex flex-wrap gap-4 mt-8">
            {market.categories.map((cat) => (
              <div key={cat} className="flex flex-col items-center p-6 border border-line rounded-3xl bg-canvas shadow-sm w-[120px] sm:w-[150px]">
                <div className="w-12 h-12 rounded-full bg-brand-orange/20 mb-4 flex items-center justify-center">
                  <span className="font-logo text-brand-orange-dark text-xl">{cat[0].toUpperCase()}</span>
                </div>
                <span className="font-semibold text-ink capitalize">{cat}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          bg="canvas-deep"
          title="How a Qyka agent shops this market"
          lede="Our trained personal shoppers navigate the stalls and aisles so you don't have to."
        >
          <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {[
              { title: "Careful Selection", desc: "Agents check for freshness and quality just like you would, picking the best produce." },
              { title: "Real-time Chat", desc: "If an item is out of stock, they message you directly in the app to find a replacement." },
              { title: "Safe Packaging", desc: "Items are packed carefully so nothing gets crushed or spoiled on the way to your door." }
            ].map((step, i) => (
              <StaggerItem key={i}>
                <Card className="h-full">
                  <div className="w-10 h-10 rounded-full bg-brand-orange text-[#1A1A1A] flex items-center justify-center font-bold text-lg mb-4">
                    {i + 1}
                  </div>
                  <h3 className="font-display font-bold text-xl mb-2">{step.title}</h3>
                  <p className="text-muted">{step.desc}</p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </Section>

      </main>

      <MarketingFooter />
    </div>
  );
}
