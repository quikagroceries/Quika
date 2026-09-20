import "./globals.css";
import { Bagel_Fat_One, Bricolage_Grotesque, DM_Sans, Fraunces } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";

// Logo wordmark only ("Qyka" / "Groceries" beside the mark in the expanded
// sidebar) - a decorative display face, never used for real UI text.
const bagelFatOne = Bagel_Fat_One({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-bagel-fat-one",
});

// Body font — per the design-system spec extracted from the auth reference
// screen (2026-09-17): "bold, rounded sans-serif — geometric grotesk, think
// Poppins Bold, DM Sans Bold, or Quicksand Bold." Replaces IBM Plex Sans
// (which read more structured/technical than the spec's rounder, friendlier
// direction); Fraunces stays as the italic display serif.
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-dm-sans",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
  variable: "--font-bricolage",
});

// Editorial display serif — marketing site only (see tailwind's font-serif
// token). Optical sizing + italic give the "bespoke" headline weight the
// grotesk alone can't; the app shell never uses it.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
  variable: "--font-fraunces",
});

export const metadata = {
  title: "Qyka Groceries — Real groceries, shopped for you",
  description:
    "A remote personal shopper for groceries — Nigerian open-air markets and supermarkets alike. Free-text lists, transfer payments, rider delivery. Pre-pilot waitlist open.",
  icons: { icon: "/favicon.png" },
  openGraph: {
    title: "Qyka Groceries",
    description:
      "Real groceries, shopped for you — from open-air markets to supermarkets. Built for how Nigerian shopping actually works.",
    type: "website",
  },
};

// Applies the saved "reduce motion" preference (Settings → Appearance) to
// <html> before first paint. Mirrors applyPrefs() in Settings.tsx; kept
// tiny and dependency-free. Qyka is light-only (no theme to boot).
const THEME_BOOT = `(function(){try{var p=JSON.parse(localStorage.getItem('qyka_prefs')||'{}');if(p.reduceMotion)document.documentElement.classList.add('reduce-motion');}catch(e){}})();`;

export default function RootLayout({ children }: any) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* suppressHydrationWarning: some browser extensions (ad/privacy
            blockers) rewrite inline <script> tags in <head> before React
            hydrates, which otherwise trips the mismatch check here for a
            reason that has nothing to do with our markup. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} suppressHydrationWarning />
      </head>
      <body className={`${dmSans.variable} ${bricolage.variable} ${fraunces.variable} ${bagelFatOne.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
