"use client";

import Link from "next/link";

const ligas = [
  { name: "LaLiga", slug: "laliga" },
  { name: "Premier League", slug: "premier" },
  { name: "Serie A", slug: "seriea" },
  { name: "Bundesliga", slug: "bundesliga" },
  { name: "Champions League", slug: "champions" },
  { name: "Europa League", slug: "europa" },
  { name: "Conference League", slug: "conference" },
  { name: "Copa Italia", slug: "coppaitalia" },
  { name: "FA Cup", slug: "facup" },
  { name: "Copa del Rey", slug: "copadelrey" },
  { name: "DFB-Pokal", slug: "dfbpokal" },
];

const paginas = [
  { name: "Inicio", href: "/" },
  { name: "Pronosticar", href: "/pronosticar/" },
  { name: "Mis Pronósticos", href: "/mis-pronosticos/" },
  { name: "Ranking", href: "/ranking/" },
];

const reglas = [
  "Resultado correcto: 3 puntos",
  "Marcador exacto: 2 puntos",
  "Diferencia de 1 gol: 1 punto",
  "Goleador acertado: 1 punto",
  "Goles del goleador: 2 puntos",
];

export default function Footer() {
  return (
    <footer className="bg-navy-black border-t border-border">
      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6">
          {/* Logo + Descripción */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="text-gold font-black text-xl tracking-tight mb-3">INTERLIGA</h3>
            <p className="text-silver text-xs leading-relaxed mb-4">
              4° Concurso de pronósticos de fútbol. Elegí tu equipo, pronosticá resultados y ganá premios.
            </p>
            <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-navy-mid border border-border text-silver hover:text-[#25D366] hover:border-[#25D366] transition-colors">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          </div>

          {/* Ligas */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3">Ligas</h4>
            <ul className="space-y-1.5">
              {ligas.map((liga) => (
                <li key={liga.slug}>
                  <Link href={`/tabla/${liga.slug}/`} className="text-silver text-xs hover:text-gold transition-colors">
                    {liga.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Navegación */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3">Navegación</h4>
            <ul className="space-y-1.5">
              {paginas.map((page) => (
                <li key={page.name}>
                  <Link href={page.href} className="text-silver text-xs hover:text-gold transition-colors">
                    {page.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sistema de Puntos */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3">Puntuación</h4>
            <ul className="space-y-1.5">
              {reglas.map((regla, i) => (
                <li key={i} className="text-silver text-xs flex items-start gap-2">
                  <span className="text-gold font-bold text-[10px] mt-0.5">•</span>
                  {regla}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Línea divisora */}
        <div className="border-t border-border mt-8 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-white text-xs font-bold tracking-[0.1em] uppercase">
                ELIGE TU EQUIPO • PRONOSTICA • GANA
              </p>
              <p className="text-silver text-[10px] tracking-wider uppercase mt-1">
                4° CONCURSO INTERLIGA • TEMPORADA 2026-27
              </p>
            </div>
            <div className="flex items-center gap-4 text-silver text-[10px]">
              <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">
                Powered by Supabase
              </a>
              <span>•</span>
              <a href="https://nextjs.org" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">
                Next.js
              </a>
              <span>•</span>
              <a href="https://github.com/juancito8812/4to-Concurso-Interliga" target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">
                GitHub
              </a>
            </div>
          </div>
          <div className="text-center mt-4 pt-4 border-t border-border/50">
            <p className="text-silver text-[10px] tracking-wider">
              © {new Date().getFullYear()} Interliga
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
