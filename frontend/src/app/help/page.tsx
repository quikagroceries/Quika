import { Metadata } from "next";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import AnnouncementBar from "@/components/marketing/AnnouncementBar";
import StickyCta from "@/components/marketing/StickyCta";
import HelpWidget from "@/components/marketing/HelpWidget";
import { LANDING } from "@/content/landing";
import HelpClient from "./HelpClient";

export const metadata: Metadata = {
  title: "Help Centre — FAQs & Support | Qyka",
  description: "Get help with your Qyka orders, understand our pricing, and find answers to frequently asked questions.",
};

export default function HelpPage() {
  // Generate FAQPage JSON-LD schema
  const allQuestions = LANDING.faq.groups.flatMap(g => g.questions as readonly {q: string, a: string}[]);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allQuestions.map((q) => ({
      "@type": "Question",
      name: q.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.a,
      },
    })),
  };

  return (
    <div className="bg-canvas text-ink min-h-screen flex flex-col font-sans selection:bg-brand-orange/20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AnnouncementBar />
      <MarketingHeader />
      
      <HelpClient />

      <MarketingFooter />
      <StickyCta />
      <HelpWidget />
    </div>
  );
}
