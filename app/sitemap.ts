import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/suite";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteUrl("prereqs"), changeFrequency: "monthly", priority: 1 }];
}
