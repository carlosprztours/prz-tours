import type { MetadataRoute } from "next";

const BASE = "https://pereztours.cloud";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/es/", "/en/"],
        // El panel y el login no se indexan.
        disallow: ["/es/admin", "/en/admin", "/es/login", "/en/login", "/api/"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
