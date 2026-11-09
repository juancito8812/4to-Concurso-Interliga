import type { ReactNode } from "react";
import type { Metadata } from "next";

// Server wrapper para metadatos: la page de esta ruta es un componente cliente
// y no puede exportar `metadata` (fix informe 2026-11-02 hallazgos #3 y #5).
export const metadata: Metadata = {
  title: "Ranking | 4° Concurso Interliga",
  description:
    "Ranking general con los puntos recalculados del motor oficial: marcadores exactos, scorers, paneles de MC y penca de goleadores.",
  alternates: { canonical: "/ranking/" },
};

export default function RankingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
