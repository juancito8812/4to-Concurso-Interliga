import { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE_URL = "https://futbolcamisetapasion.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  // Static pages
  const staticPages = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/pronosticar/`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/ranking/`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/mis-pronosticos/`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/reglas/`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
  ];

  // League tables
  const leagues = [
    "laliga",
    "premier",
    "serie-a",
    "bundesliga",
    "champions",
    "europa",
    "conference",
    "copa-italia",
    "fa-cup",
    "copa-del-rey",
    "dfb-pokal",
  ];

  const leaguePages = leagues.map((league) => ({
    url: `${BASE_URL}/tabla/${league}/`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...leaguePages];
}
