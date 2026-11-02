import type { ReactNode } from "react";
import type { Metadata } from "next";

// Server wrapper para metadatos: la page de esta ruta es un componente cliente
// y no puede exportar `metadata`. Con metadataBase del layout raíz, el canonical
// "./" resuelve a la URL de esta ruta (fix informe 2026-11-02 hallazgo #3).
export const metadata: Metadata = {
  title: "Pronosticar | 4° Concurso Interliga",
  description:
    "Predice marcadores y goleadores de tus 3 partidos por jornada antes del pitazo. El ranking recalcula con el motor oficial del 4° Concurso Interliga.",
  alternates: { canonical: "/pronosticar/" },
};

export default function PronosticarLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
