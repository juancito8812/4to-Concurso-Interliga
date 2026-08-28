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

interface PrizeItem {
  icon: string;
  name: string;
}

interface PodiumPrize {
  rank: 1 | 2 | 3;
  placeTitle: string;
  badgeTitle: string;
  badgeIcon: string;
  theme: "gold" | "silver" | "bronze";
  cardBorder: string;
  cardGlow: string;
  badgeBg: string;
  textColor: string;
  orderClass: string;
  items: PrizeItem[];
}

const podiumPrizes: PodiumPrize[] = [
  {
    rank: 2,
    placeTitle: "2° LUGAR",
    badgeTitle: "SUBCAMPEÓN",
    badgeIcon: "🥈",
    theme: "silver",
    cardBorder: "border-slate-400/50 hover:border-slate-300",
    cardGlow: "shadow-[0_0_30px_rgba(203,213,225,0.12)]",
    badgeBg: "bg-gradient-to-r from-slate-300 via-gray-200 to-slate-400 text-navy-black",
    textColor: "text-slate-200",
    orderClass: "order-2 md:order-1 md:mt-6",
    items: [
      { icon: "🎽", name: "Camiseta Oficial del Club" },
      { icon: "🩳", name: "Short Oficial de Juego" },
      { icon: "🧢", name: "Gorra Oficial del Club" },
      { icon: "🚩", name: "Bandera Oficial del Club" },
      { icon: "🍺", name: "Jarra Oficial de Colección" },
      { icon: "🕶️", name: "Gafas de Sol Deportivas" },
      { icon: "🖼️", name: "Póster de Campeones" },
    ],
  },
  {
    rank: 1,
    placeTitle: "1° LUGAR",
    badgeTitle: "GRAN CAMPEÓN",
    badgeIcon: "👑",
    theme: "gold",
    cardBorder: "border-2 border-gold shadow-[0_0_40px_rgba(201,168,76,0.25)] hover:border-gold-light",
    cardGlow: "shadow-[0_0_50px_rgba(201,168,76,0.25)]",
    badgeBg: "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-navy-black",
    textColor: "text-gold",
    orderClass: "order-1 md:order-2 md:-translate-y-4 md:mb-4 z-10",
    items: [
      { icon: "🎽", name: "Camiseta Oficial del Club" },
      { icon: "🩳", name: "Short Oficial de Juego" },
      { icon: "⚽", name: "Balón Oficial de Fútbol" },
      { icon: "🍺", name: "Jarra Oficial de Colección" },
      { icon: "🚩", name: "Bandera Oficial del Club" },
      { icon: "🕶️", name: "Gafas de Sol Deportivas" },
      { icon: "📖", name: "Revista / Anuario Exclusivo" },
    ],
  },
  {
    rank: 3,
    placeTitle: "3° LUGAR",
    badgeTitle: "TERCER LUGAR",
    badgeIcon: "🥉",
    theme: "bronze",
    cardBorder: "border-amber-700/50 hover:border-amber-600",
    cardGlow: "shadow-[0_0_30px_rgba(180,83,9,0.12)]",
    badgeBg: "bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 text-white",
    textColor: "text-amber-400",
    orderClass: "order-3 md:order-3 md:mt-8",
    items: [
      { icon: "🎽", name: "Camiseta Oficial del Club" },
      { icon: "🩳", name: "Short Oficial de Juego" },
      { icon: "🧢", name: "Gorra Oficial del Club" },
      { icon: "🚩", name: "Bandera Oficial del Club" },
      { icon: "🍺", name: "Jarra Oficial de Colección" },
    ],
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
                  width={64}
                  height={64}
                  loading="lazy"
                  decoding="async"
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
                Pronosticá los <span className="text-gold font-semibold">partidos de tu equipo</span> en cada jornada, indicando el marcador exacto y goleadores.
              </p>
              <ul className="text-[11px] text-silver/80 space-y-1 mb-4 flex-1">
                <li>• Seleccioná el marcador exacto de cada encuentro</li>
                <li>• Elegí hasta <span className="text-gold">3 goleadores</span> por partido</li>
                <li>• Sumá puntos y competí por los primeros puestos</li>
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

      {/* PREMIOS - PODIO ESTILO CHAMPIONS LEAGUE */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-14">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gold flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(201,168,76,0.4)]">
                <span className="text-xs sm:text-sm font-black text-navy-black">3</span>
              </div>
              <div>
                <h2 className="text-xl sm:text-3xl font-black uppercase tracking-wider text-gold">
                  Premios Oficiales
                </h2>
                <p className="text-xs sm:text-sm text-silver font-medium mt-0.5">
                  Temporada 2026-27 · Kits y recompensas para los mejores pronosticadores
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-navy-card/80 border border-border text-xs font-semibold text-silver">
              <span>🏆</span> 3 Podios Exclusivos
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-6 items-end mt-4">
            {podiumPrizes.map((prize) => (
              <div
                key={prize.rank}
                className={`relative flex flex-col bg-navy-mid/90 backdrop-blur-sm rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:scale-[1.02] ${prize.cardBorder} ${prize.cardGlow} ${prize.orderClass}`}
              >
                {/* Crown/Trophy Top Ribbon for 1st Place */}
                {prize.rank === 1 && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 via-gold to-amber-500 text-navy-black font-black text-[11px] uppercase tracking-widest px-4 py-1 rounded-full shadow-lg flex items-center gap-1.5 shrink-0 select-none">
                    <span>👑</span> MÁXIMO GALARDÓN
                  </div>
                )}

                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2 mb-4 pt-1">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-lg sm:text-xl shadow-md shrink-0 ${prize.badgeBg}`}>
                      {prize.badgeIcon}
                    </div>
                    <div>
                      <h3 className={`text-base sm:text-lg font-black uppercase tracking-wider ${prize.textColor}`}>
                        {prize.placeTitle}
                      </h3>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-silver">
                        {prize.badgeTitle}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-silver/80 bg-navy-card/80 border border-border/60 px-2.5 py-1 rounded-lg">
                      {prize.items.length} premios
                    </span>
                  </div>
                </div>

                {/* Prize Items Chips Grid */}
                <div className="space-y-2 my-2 flex-1">
                  {prize.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-navy-card/50 border border-border/40 hover:bg-navy-card/90 transition-colors"
                    >
                      <span className="text-base select-none shrink-0">{item.icon}</span>
                      <span className="text-xs sm:text-sm font-semibold text-white/90">
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer Tag */}
                <div className="mt-4 pt-3 border-t border-border/40 text-center">
                  <span className="text-[11px] font-semibold text-silver/60 uppercase tracking-wider">
                    {prize.rank === 1 ? "Kit Completo de Campeón" : prize.rank === 2 ? "Kit de Subcampeón" : "Kit de Podio"}
                  </span>
                </div>
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
