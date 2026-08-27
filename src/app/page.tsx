"use client";

import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import TeamSelectorCard from "./TeamSelectorCard";
import CompetitionStatusCard from "./CompetitionStatusCard";

const basePath = "/4to-Concurso-Interliga";

const leagues = [
  { name: "LaLiga", logo: `${basePath}/logos/laliga.png`, slug: "laliga" },
  { name: "Premier League", logo: `${basePath}/logos/premier.png`, slug: "premier" },
  { name: "Serie A", logo: `${basePath}/logos/seriea.png`, slug: "seriea" },
  { name: "Bundesliga", logo: `${basePath}/logos/bundesliga.png`, slug: "bundesliga" },
  { name: "Champions League", logo: `${basePath}/logos/champions.png`, slug: "champions" },
  { name: "Europa League", logo: `${basePath}/logos/europa.png`, slug: "europa" },
  { name: "Conference League", logo: `${basePath}/logos/conference.png`, slug: "conference" },
  { name: "Copa Italia", logo: `${basePath}/logos/coppaitalia.png`, slug: "coppaitalia" },
];

const scoring = [
  { points: "3pts", label: "Resultado correcto" },
  { points: "2pts", label: "Marcador exacto" },
  { points: "1pt", label: "Diferencia de 1 gol en el marcador" },
  { points: "1pt", label: "Goleador acertado (nombre)" },
  { points: "2pts", label: "Cantidad de goles del goleador" },
];

const prizes = [
  {
    place: "2DO LUGAR",
    number: "2",
    items: ["Camiseta · Short", "Gorra · Bandera", "Jarra · Gafas · Póster"],
  },
  {
    place: "1ER LUGAR",
    number: "1",
    items: ["Camiseta · Short", "Balón · Jarra", "Gafas · Bandera", "Revista de tu equipo"],
    highlight: true,
  },
  {
    place: "3ER LUGAR",
    number: "3",
    items: ["Camiseta · Short", "Gorra · Bandera", "Jarra"],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      {/* HERO */}
      <section className="flex flex-col items-center justify-center min-h-[70vh] sm:min-h-[85vh] px-4 sm:px-6 pt-20 sm:pt-24 text-center">
        <div className="inline-block px-5 py-1.5 sm:px-6 sm:py-2 mb-6 sm:mb-8 text-[10px] sm:text-xs font-bold tracking-[0.25em] text-navy-black uppercase bg-gold rounded-full">
          Temporada 2026-27
        </div>

        <h1 className="mb-3 sm:mb-4">
          <span className="block text-3xl sm:text-5xl lg:text-6xl font-black text-white">4°</span>
          <span className="block text-5xl sm:text-8xl lg:text-9xl font-black tracking-tight text-gold">INTERLIGA</span>
        </h1>

        <p className="text-xs sm:text-base font-semibold tracking-[0.15em] text-silver uppercase mb-8 sm:mb-12">
          FÚTBOL{" "}
          <span className="text-gold mx-1 sm:mx-2">•</span>{" "}
          CAMISETA{" "}
          <span className="text-gold mx-1 sm:mx-2">•</span>{" "}
          <span className="text-green">PASIÓN</span>
        </p>

        {/* League Logos */}
        <div className="grid grid-cols-4 gap-2.5 sm:gap-4 max-w-md sm:max-w-2xl">
          {leagues.map((league) => (
            <Link
              key={league.name}
              href={`/tabla/${league.slug}`}
              title={league.name}
              className="group aspect-square rounded-xl sm:rounded-2xl bg-navy-mid/90 border border-border/80 hover:border-gold/70 p-2 sm:p-2.5 flex items-center justify-center hover:scale-105 hover:shadow-[0_0_20px_rgba(201,168,76,0.15)] transition-all"
            >
              <div className="w-full h-full bg-white rounded-lg sm:rounded-xl p-1.5 sm:p-2 flex items-center justify-center shadow-inner">
                <img
                  src={league.logo}
                  alt={league.name}
                  className="w-full h-full object-contain transition-transform group-hover:scale-105"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* REGLAS */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gold flex items-center justify-center shrink-0">
              <span className="text-xs sm:text-sm font-bold text-navy-black">1</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-bold uppercase tracking-wider text-white">
              Reglas de la <span className="text-gold">Competición</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-10">
            <TeamSelectorCard />

            {/* Tarjeta 2: Cómo pronosticar */}
            <div className="relative p-5 sm:p-7 rounded-xl sm:rounded-2xl bg-navy-mid border border-border flex flex-col">
              <span className="block text-4xl sm:text-5xl font-black text-gold/20 mb-2 sm:mb-3 leading-none">
                2
              </span>
              <p className="text-sm leading-relaxed text-silver mb-3">
                Elegí <span className="text-gold font-semibold">10 partidos</span> por jornada y pronosticá el resultado exacto de cada uno.
              </p>
              <ul className="text-[11px] text-silver/80 space-y-1 mb-4 flex-1">
                <li>• Seleccioná el marcador de cada partido</li>
                <li>• Elegí hasta <span className="text-gold">3 goleadores</span> por partido</li>
                <li>• Sumá puntos con cada acierto</li>
              </ul>
              <Link
                href="/pronosticar/"
                className="block text-center bg-gold/10 border border-gold/30 text-gold font-bold py-2.5 rounded-full text-xs hover:bg-gold/20 transition-colors"
              >
                Ir a Pronosticar →
              </Link>
            </div>

            {/* Tarjeta 3 */}
            <CompetitionStatusCard />
          </div>
        </div>
      </section>

      {/* SISTEMA DE PUNTUACIÓN */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gold flex items-center justify-center shrink-0">
              <span className="text-xs sm:text-sm font-bold text-navy-black">2</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-bold uppercase tracking-wider text-white">
              Sistema de <span className="text-gold">Puntuación</span>
            </h2>
          </div>

          <p className="text-silver text-xs sm:text-sm mb-6 sm:mb-10">
            Cada acierto suma puntos. ¡Máximo <span className="text-gold font-bold">3 goleadores</span> por partido!
          </p>

          <div className="flex gap-3 overflow-x-auto pb-2 sm:pb-0 sm:grid sm:grid-cols-3 md:grid-cols-5 sm:overflow-visible">
            {scoring.map((item, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[140px] sm:w-auto p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-navy-mid border border-border text-center"
              >
                <span className="block text-xl sm:text-2xl font-black text-gold mb-1 sm:mb-2">
                  {item.points}
                </span>
                <span className="text-[11px] sm:text-xs text-silver leading-snug block">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 sm:mt-5 px-4 sm:px-6 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gold/10 border border-gold/20">
            <p className="text-[11px] sm:text-xs text-silver leading-relaxed">
              <span className="text-gold font-bold">Nota:</span>{" "}
              si pronosticas varios goleadores, los puntos se multiplican a tu favor — máximo <span className="text-gold font-bold">3 jugadores</span> por partido.
            </p>
          </div>
        </div>
      </section>

      {/* PREMIOS */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gold flex items-center justify-center shrink-0">
              <span className="text-xs sm:text-sm font-bold text-navy-black">3</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-bold uppercase tracking-wider text-gold">
              Premios
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-10">
            {prizes.map((prize) => (
              <div
                key={prize.place}
                className={`relative p-5 sm:p-7 rounded-xl sm:rounded-2xl flex flex-col items-center text-center ${
                  prize.highlight
                    ? "bg-navy-mid border-2 border-gold/40 shadow-[0_0_30px_rgba(201,168,76,0.1)]"
                    : "bg-navy-mid border border-border"
                }`}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gold flex items-center justify-center mb-3 sm:mb-4">
                  <span className="text-base sm:text-lg font-bold text-navy-black">{prize.number}</span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-gold mb-3 sm:mb-4">
                  {prize.place}
                </h3>
                <ul className="space-y-0.5 sm:space-y-1">
                  {prize.items.map((item) => (
                    <li key={item} className="text-xs sm:text-sm text-silver">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
