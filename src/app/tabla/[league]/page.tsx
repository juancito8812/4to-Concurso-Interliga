import TablaLigaClient from "./TablaLigaClient";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { leagueSlugToName } from "@/lib/leagueConfig";

// Slug fuera de la lista = 404 duro, nunca 200 con tabla vacía (soft-404 del
// informe 2026-11-02). En el export estático solo existen las rutas de
// generateStaticParams; esto cubre además `next dev` y `next start`.
export const dynamicParams = false;

// Canonical por liga con metadataBase del layout raíz (fix informe 2026-11-02 #3/#5)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ league: string }>;
}): Promise<Metadata> {
  const { league } = await params;
  if (!(league in leagueSlugToName)) return {};
  const name = leagueSlugToName[league];
  return {
    title: `Tabla ${name} | 4° Concurso Interliga`,
    description: `Clasificación, partidos y pronósticos de la temporada 2026-27 de ${name} en el 4° Concurso Interliga.`,
    alternates: {
      canonical: `https://futbolcamisetapasion.com/tabla/${league}/`,
    },
  };
}

export function generateStaticParams() {
  return [
    { league: "laliga" },
    { league: "premier" },
    { league: "seriea" },
    { league: "bundesliga" },
    { league: "champions" },
    { league: "europa" },
    { league: "conference" },
    { league: "coppaitalia" },
    { league: "facup" },
    { league: "copadelrey" },
    { league: "dfbpokal" },
  ];
}

export default async function TablaLigaPage({
  params,
}: {
  params: Promise<{ league: string }>;
}) {
  const { league } = await params;
  if (!(league in leagueSlugToName)) notFound();
  return <TablaLigaClient />;
}
