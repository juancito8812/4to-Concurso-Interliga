import type { ReactNode } from "react";
import type { Metadata } from "next";

// Server wrapper para metadatos: la page de esta ruta es un componente cliente
// y no puede exportar `metadata` (fix informe 2026-11-02 hallazgos #3 y #5).
// Ruta privada: es el detalle de pronósticos del usuario logueado.
export const metadata: Metadata = {
  title: "Mis pronósticos | 4° Concurso Interliga",
  description:
    "Tu historial de pronósticos por jornada: marcadores guardados, goleadores y puntos otorgados.",
  alternates: { canonical: "/mis-pronosticos/" },
};

export default function MisPronosticosLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
