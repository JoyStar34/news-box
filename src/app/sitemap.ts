import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteConfig";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: getSiteUrl().href,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
  ];
}

