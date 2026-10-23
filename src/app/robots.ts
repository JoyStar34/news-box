import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteConfig";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: new URL("/sitemap.xml", baseUrl).href,
    host: baseUrl.origin,
  };
}

