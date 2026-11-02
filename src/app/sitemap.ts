import { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE_URL = "https://futbolcamisetapasion.com";

// Los slugs deben coincidir con generateStaticParams() de
// src/app/tabla/[league]/page.tsx — cualquier slug fuera de esa lista da 404
// y Google penaliza el sitemap entero (hallazgo #1 del informe 2026-11-02).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  // Static pages (las reglas viven en la landing: NO existe /reglas/)
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
  ];

  // League tables — mismos slugs de generateStaticParams.
  // Sincronizar con la lista lógica (-leagueSlugs) de src/lib/leagueConfig.ts.
  const leagues = [
    "laliga",
    "premier",
    "seriea",
    "bundesliga",
    "champions",
    "europa",
    "conference",
    "coppaitalia",
    "facup",
    "copadelrey",
    "dfbpokal",
  ];

  const leaguePages = leagues.map((league) => ({
    url: `${BASE_URL}/tabla/${league}/`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...leaguePages];
}
