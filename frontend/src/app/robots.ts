import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://quika.ng";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/agent",
          "/agent/*",
          "/orders",
          "/orders/*",
          "/track",
          "/track/*",
          "/messages",
          "/messages/*",
          "/wallet",
          "/settings",
          "/setup",
          "/api/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
