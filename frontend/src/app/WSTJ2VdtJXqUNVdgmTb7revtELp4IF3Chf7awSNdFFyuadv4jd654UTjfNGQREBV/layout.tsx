import type { Metadata } from "next";

// Never list the hidden admin sign-in page in search results.
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function HiddenAdminLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
