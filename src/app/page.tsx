"use client";

import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import TeamSelectorCard from "./TeamSelectorCard";
import CompetitionStatusCard from "./CompetitionStatusCard";

const domesticLeagues = [
  { name: "LaLiga", logo: "/logos/laliga.png", slug: "laliga" },
  { name: "Premier League", logo: "/logos/premier.png", slug: "premier" },
  { name: "Serie A", logo: "/logos/seriea.png", slug: "seriea" },
  { name: "Bundesliga", logo: "/logos/bundesliga.png", slug: "bundesliga" },
];

const domesticCups = [
  { name: "Copa del Rey", logo: "/logos/copadelrey.svg", slug: "copadelrey" },
  { name: "FA Cup", logo: "/logos/facup.svg", slug: "facup" },
  { name: "Copa Italia", logo: "/logos/coppaitalia.svg", slug: "coppaitalia" },
  { name: "DFB-Pokal", logo: "/logos/dfbpokal.svg", slug: "dfbpokal" },
];

const europeanCups = [
  { name: "Champions League", logo: "/logos/champions.png", slug: "champions" },
  { name: "Europa League", logo: "/logos/europa.svg", slug: "europa" },
  { name: "Conference League", logo: "/logos/conference.svg", slug: "conference" },
];

const scoring = [
  { points: "3pts", label: "Resultado correcto" },
  { points: "2pts", label: "Marcador exacto" },
  { points: "1pt", label: "Diferencia de 1 gol en el marcador" },
  { points: "1pt", label: "Goleador acertado (nombre)" },
  { points: "2pts", label: "Cantidad exacta de goleadores del partido" },
];

interface PrizeItem {
  icon: string;
  name: string;
}

interface PodiumPrize {
  rank: 1 | 2 | 3;
  placeTitle: string;
  badgeTitle: string;
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
    rank: 1,
    placeTitle: "1° LUGAR",
    badgeTitle: "GRAN CAMPEÓN",
    theme: "gold",
    cardBorder: "border-2 border-gold shadow-[0_0_40px_rgba(201,168,76,0.25)] hover:border-gold-light",
    cardGlow: "shadow-[0_0_50px_rgba(201,168,76,0.25)]",
    badgeBg: "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-navy-black",
    textColor: "text-gold",
    orderClass: "order-1 md:order-2 md:-translate-y-4 md:mb-4 z-10",
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
    rank: 2,
    placeTitle: "2° LUGAR",
    badgeTitle: "SUBCAMPEÓN",
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
    ],
  },
  {
    rank: 3,
    placeTitle: "3° LUGAR",
    badgeTitle: "TERCER LUGAR",
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

        {/* League Logos - 3 filas */}
        <div className="flex flex-col items-center gap-3 sm:gap-4 max-w-md sm:max-w-3xl w-full">
          {/* Fila 1: Ligas nacionales */}
          <div className="grid grid-cols-4 gap-2.5 sm:gap-4 w-full">
            {domesticLeagues.map((league, idx) => (
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
                    loading={idx === 0 ? "eager" : "lazy"}
                    fetchPriority={idx === 0 ? "high" : undefined}
                    decoding="async"
                    className="w-full h-full object-contain transition-transform group-hover:scale-105"
                  />
                </div>
              </Link>
            ))}
          </div>

          {/* Fila 2: Copas nacionales */}
          <div className="grid grid-cols-4 gap-2.5 sm:gap-4 w-full">
            {domesticCups.map((league) => (
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

          {/* Fila 3: Copas europeas (centradas) */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 w-full max-w-[75%]">
            {europeanCups.map((league) => (
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
                <li>• Elegí hasta <span className="text-gold">5 goleadores</span> por partido</li>
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
      <section className="py-12 sm:py-20 px-4 sm:px-6 content-visibility-auto">
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
            Cada acierto suma puntos. ¡Máximo <span className="text-gold font-bold">5 goleadores</span> por partido!
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
              si pronosticas varios goleadores, los puntos se multiplican a tu favor — máximo <span className="text-gold font-bold">5 jugadores</span> por partido.
            </p>
          </div>
        </div>
      </section>

      {/* PREMIOS - PODIO ESTILO CHAMPIONS LEAGUE */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 relative overflow-hidden content-visibility-auto">
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
              3 Podios Exclusivos
            </div>
          </div>

          {/* Podium Layout - Center 1st, Left 2nd, Right 3rd */}
          <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-6 mt-4 pb-8">
            {/* 2nd Place - Left */}
            <div className="relative flex flex-col w-full md:w-[30%] bg-navy-mid/90 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-slate-400/30 hover:border-slate-300/50 shadow-[0_0_25px_rgba(203,213,225,0.08)] transition-all duration-300 hover:scale-[1.02] md:mt-12">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-300">
                    2° LUGAR
                  </h3>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-silver/80">
                    SUBCAMPEÓN
                  </span>
                </div>
                <span className="text-xs font-bold text-silver/70 bg-navy-card/80 border border-border/50 px-2.5 py-1 rounded-lg">
                  5 premios
                </span>
              </div>

              <div className="space-y-2 my-2 flex-1">
                {podiumPrizes[1].items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-navy-card/40 border border-border/30 hover:bg-navy-card/70 transition-colors"
                  >
                    <span className="text-base select-none shrink-0">{item.icon}</span>
                    <span className="text-sm font-semibold text-white/85">{item.name}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-border/30 text-center">
                <span className="text-[11px] font-semibold text-silver/50 uppercase tracking-wider">
                  Kit de Subcampeón
                </span>
              </div>
            </div>

            {/* 1st Place - Center (Elevated) */}
            <div className="relative flex flex-col w-full md:w-[35%] bg-navy-mid/95 backdrop-blur-sm rounded-2xl p-6 sm:p-7 border-2 border-gold shadow-[0_0_50px_rgba(201,168,76,0.2),0_0_80px_rgba(201,168,76,0.1)] hover:border-gold-light transition-all duration-300 hover:scale-[1.02] z-10 md:-translate-y-6">
              {/* Top Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 via-gold to-amber-500 text-navy-black font-black text-[11px] uppercase tracking-widest px-5 py-1.5 rounded-full shadow-lg select-none">
                MÁXIMO GALARDÓN
              </div>

              <div className="flex items-center justify-between gap-2 mb-4 pt-2">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-gold">
                    1° LUGAR
                  </h3>
                  <span className="text-xs font-bold uppercase tracking-wider text-gold/70">
                    GRAN CAMPEÓN
                  </span>
                </div>
                <span className="text-xs font-bold text-gold/80 bg-gold/10 border border-gold/30 px-2.5 py-1 rounded-lg">
                  7 premios
                </span>
              </div>

              <div className="space-y-2.5 my-2 flex-1">
                {podiumPrizes[0].items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-gold/5 border border-gold/20 hover:bg-gold/10 transition-colors"
                  >
                    <span className="text-lg select-none shrink-0">{item.icon}</span>
                    <span className="text-sm font-bold text-white/90">{item.name}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-gold/20 text-center">
                <span className="text-[11px] font-bold text-gold/60 uppercase tracking-wider">
                  Kit Completo de Campeón
                </span>
              </div>
            </div>

            {/* 3rd Place - Right */}
            <div className="relative flex flex-col w-full md:w-[30%] bg-navy-mid/90 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-amber-700/30 hover:border-amber-600/50 shadow-[0_0_25px_rgba(180,83,9,0.08)] transition-all duration-300 hover:scale-[1.02] md:mt-16">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-black uppercase tracking-wider text-amber-400">
                    3° LUGAR
                  </h3>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-silver/80">
                    TERCER LUGAR
                  </span>
                </div>
                <span className="text-xs font-bold text-silver/70 bg-navy-card/80 border border-border/50 px-2.5 py-1 rounded-lg">
                  5 premios
                </span>
              </div>

              <div className="space-y-2 my-2 flex-1">
                {podiumPrizes[2].items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-navy-card/40 border border-border/30 hover:bg-navy-card/70 transition-colors"
                  >
                    <span className="text-base select-none shrink-0">{item.icon}</span>
                    <span className="text-sm font-semibold text-white/85">{item.name}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-border/30 text-center">
                <span className="text-[11px] font-semibold text-silver/50 uppercase tracking-wider">
                  Kit de Podio
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
