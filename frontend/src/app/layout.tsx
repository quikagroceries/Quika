import "./globals.css";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--font-bricolage",
});

export const metadata = {
  title: "Quika Groceries — Real market shopping, without going yourself",
  description:
    "A remote personal shopper for Nigerian open-air markets. Free-text lists, negotiated prices, transfer to vendors, courier delivery. Pre-pilot waitlist open.",
  icons: { icon: "/favicon.png" },
  openGraph: {
    title: "Quika Groceries",
    description:
      "Real market shopping without going yourself. Built for how Nigerian traditional markets actually work.",
    type: "website",
  },
};

export default function RootLayout({ children }: any) {
  return (
    <html lang="en">
      <body className={`${plusJakarta.variable} ${bricolage.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
