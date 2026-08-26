"use client";

import Link from "next/link";

const basePath = "/4to-Concurso-Interliga";

const ligas = [
  { name: "LaLiga", slug: "laliga" },
  { name: "Premier League", slug: "premier" },
  { name: "Serie A", slug: "seriea" },
  { name: "Bundesliga", slug: "bundesliga" },
  { name: "Champions League", slug: "champions" },
  { name: "Europa League", slug: "europa" },
  { name: "Conference League", slug: "conference" },
  { name: "Copa Italia", slug: "coppaitalia" },
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
            <div className="flex gap-3">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-navy-mid border border-border flex items-center justify-center text-silver hover:text-gold hover:border-gold transition-colors">
                <span className="text-xs">IG</span>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-navy-mid border border-border flex items-center justify-center text-silver hover:text-gold hover:border-gold transition-colors">
                <span className="text-xs">X</span>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-navy-mid border border-border flex items-center justify-center text-silver hover:text-gold hover:border-gold transition-colors">
                <span className="text-xs">FB</span>
              </a>
            </div>
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
        </div>
      </div>
    </footer>
  );
}
