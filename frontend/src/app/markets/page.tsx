import { Metadata } from "next";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import AnnouncementBar from "@/components/marketing/AnnouncementBar";
import StickyCta from "@/components/marketing/StickyCta";
import HelpWidget from "@/components/marketing/HelpWidget";
import { MarketsDirectory } from "./MarketsDirectory";

export const metadata: Metadata = {
  title: "Markets Directory — Qyka Groceries",
  description: "Browse the local markets and supermarkets available on Qyka across Nigeria.",
};

export default function MarketsPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col selection:bg-brand-orange/20">
      <AnnouncementBar />
      <MarketingHeader />
      <main className="flex-1">
        <MarketsDirectory />
      </main>
      <MarketingFooter />
      <StickyCta />
      <HelpWidget />
    </div>
  );
}
