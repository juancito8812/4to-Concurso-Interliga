import TablaLigaClient from "./TablaLigaClient";
import type { Metadata } from "next";
import { leagueSlugToName } from "@/lib/leagueConfig";

// Canonical por liga con metadataBase del layout raíz (fix informe 2026-11-02 #3/#5)
export async function generateMetadata({
  params,
}: {
  params: Promise<{ league: string }>;
}): Promise<Metadata> {
  const { league } = await params;
  const name = leagueSlugToName[league] ?? league;
  return {
    title: `Tabla ${name} | 4° Concurso Interliga`,
    description: `Clasificación, partidos y pronósticos de la temporada 2026-27 de ${name} en el 4° Concurso Interliga.`,
    alternates: league in leagueSlugToName
      ? { canonical: `https://futbolcamisetapasion.com/tabla/${league}/` }
      : {},
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

export default function TablaLigaPage() {
  return <TablaLigaClient />;
}
