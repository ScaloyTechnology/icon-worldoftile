import type { MetadataRoute } from "next";

import { primaryNavigation, siteConfig } from "@/constants/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [...new Set([...primaryNavigation.map((item) => item.href), "/products/export"])];

  return routes.map((route) => ({
    url: new URL(route, siteConfig.url).toString(),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
