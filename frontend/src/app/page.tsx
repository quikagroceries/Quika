import MarketingPage from "@/screens/MarketingPage";
import AuthRedirect from "@/components/marketing/AuthRedirect";

export const metadata = {
  title: "Qyka Groceries — Your personal shopper at the market",
  description:
    "Send your list. A real person in the market picks it fresh, negotiates fairly, and brings it to your door. Open-air markets and supermarkets across Nigeria.",
  openGraph: {
    title: "Qyka Groceries — Your personal shopper at the market",
    description:
      "Send your list. A real person in the market picks it fresh, negotiates fairly, and brings it to your door.",
    images: [{ url: "/favicon.png", width: 1200, height: 630, alt: "Qyka Groceries" }],
  },
};

export default function HomePage() {
  return (
    <>
      <AuthRedirect />
      <MarketingPage />
    </>
  );
}
