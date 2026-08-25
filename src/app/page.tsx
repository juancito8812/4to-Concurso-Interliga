"use client";

import { useState } from "react";

const competitions = [
  { name: "Serie A", emoji: "🇮🇹" },
  { name: "Champions League", emoji: "🏆" },
  { name: "Europa League", emoji: "⚽" },
];

const scoringRules = [
  { action: "Resultado correcto el marcador", points: 10 },
  { action: "Marcador exacto", points: 15 },
  { action: "Diferencia de 1 gol en el goleador", points: 5 },
  { action: "Goleador acertado", points: 10 },
  { action: "Cantidad de goles del goleador", points: 5 },
];

const prizes = {
  first: [
    "Camiseta",
    "Gorra",
    "Jarra",
    "Gafas",
    "Bandera",
    "Póster",
    "Revista de tu equipo",
  ],
  second: ["Balón", "Jarra", "Gafas", "Bandera"],
  third: ["Camiseta", "Short", "Gorra", "Bandera", "Jarra", "Gafas", "Póster"],
};

export default function Home() {
  const [selectedCompetition, setSelectedCompetition] = useState<string | null>(null);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center overflow-hidden">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-tertiary/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-block px-4 py-2 mb-6 text-sm font-semibold tracking-widest text-accent uppercase bg-accent/10 rounded-full border border-accent/20">
            4° Edición — Temporada 2026-27
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-none mb-6">
            <span className="block text-foreground">INTER</span>
            <span className="block text-tertiary">LIGA</span>
          </h1>

          <p className="text-xl sm:text-2xl font-medium text-foreground/80 mb-4">
            FÚTBOL + CAMISETA + PASIÓN
          </p>

          <p className="text-lg text-foreground/60 max-w-2xl mx-auto mb-10">
            Elige tu club favorito, pronostica los resultados y compite por increíbles premios
            durante toda la temporada 2026-27.
          </p>

          <a
            href="#como-funciona"
            className="inline-flex items-center gap-3 px-8 py-4 text-lg font-bold text-white bg-tertiary rounded-full hover:bg-tertiary/80 transition-all duration-200 hover:scale-105"
          >
            Empezar Ahora
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Competitions Section */}
      <section className="py-20 px-6 bg-secondary/50">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Elige tu <span className="text-accent">Competición</span>
          </h2>
          <p className="text-foreground/60 mb-10 max-w-xl mx-auto">
            Representa a tu club en cualquiera de estas competiciones europeas.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {competitions.map((comp) => (
              <button
                key={comp.name}
                onClick={() => setSelectedCompetition(comp.name)}
                className={`p-8 rounded-2xl border-2 transition-all duration-200 hover:scale-105 ${
                  selectedCompetition === comp.name
                    ? "border-tertiary bg-tertiary/10"
                    : "border-foreground/10 bg-secondary hover:border-foreground/20"
                }`}
              >
                <span className="text-4xl block mb-4">{comp.emoji}</span>
                <span className="text-xl font-bold">{comp.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="como-funciona" className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            ¿Cómo <span className="text-tertiary">Funciona</span>?
          </h2>
          <p className="text-foreground/60 mb-12 max-w-xl mx-auto">
            Tres pasos sencillos para participar y ganar.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-secondary border border-foreground/10">
              <div className="w-14 h-14 rounded-full bg-tertiary/20 flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl">🏟️</span>
              </div>
              <h3 className="text-xl font-bold mb-3">1. Elige tu Equipo</h3>
              <p className="text-foreground/60">
                Escoge tu club favorito para representarlo durante toda la temporada.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-secondary border border-foreground/10">
              <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-bold mb-3">2. Pronostica</h3>
              <p className="text-foreground/60">
                Envía tu pronóstico de resultado y marcador antes de cada partido.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-secondary border border-foreground/10">
              <div className="w-14 h-14 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="text-xl font-bold mb-3">3. Gana</h3>
              <p className="text-foreground/60">
                Acumula puntos y gana increíbles premios. Las copas son de eliminación directa.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Scoring System Section */}
      <section className="py-20 px-6 bg-secondary/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Sistema de <span className="text-accent">Puntuación</span>
          </h2>
          <p className="text-foreground/60 mb-10 max-w-xl mx-auto">
            Cada acierto suma puntos. ¡Máximo 3 goleadores por partido!
          </p>

          <div className="bg-secondary rounded-2xl border border-foreground/10 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="p-5 text-sm font-semibold text-foreground/60 uppercase tracking-wider">
                    Acción
                  </th>
                  <th className="p-5 text-sm font-semibold text-foreground/60 uppercase tracking-wider text-right">
                    Puntos
                  </th>
                </tr>
              </thead>
              <tbody>
                {scoringRules.map((rule, i) => (
                  <tr key={i} className="border-b border-foreground/5 last:border-0">
                    <td className="p-5 font-medium">{rule.action}</td>
                    <td className="p-5 text-right">
                      <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-1 text-sm font-bold text-accent bg-accent/10 rounded-full">
                        {rule.points} pts
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Prizes Section */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            <span className="text-accent">Premios</span>
          </h2>
          <p className="text-foreground/60 mb-12 max-w-xl mx-auto">
            Los mejores pronosticadores se llevan premios increíbles.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1st Place */}
            <div className="relative p-8 rounded-2xl bg-gradient-to-b from-accent/10 to-secondary border-2 border-accent/30">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-sm font-bold text-primary bg-accent rounded-full">
                🥇 1er LUGAR
              </div>
              <ul className="mt-4 space-y-3 text-left">
                {prizes.first.map((prize) => (
                  <li key={prize} className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                    <span className="font-medium">{prize}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2nd Place */}
            <div className="relative p-8 rounded-2xl bg-secondary border border-foreground/10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-sm font-bold text-primary bg-foreground/60 rounded-full">
                🥈 2DO LUGAR
              </div>
              <ul className="mt-4 space-y-3 text-left">
                {prizes.second.map((prize) => (
                  <li key={prize} className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-foreground/40 shrink-0" />
                    <span className="font-medium">{prize}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3rd Place */}
            <div className="relative p-8 rounded-2xl bg-secondary border border-foreground/10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-sm font-bold text-primary bg-tertiary/60 rounded-full">
                🥉 3ER LUGAR
              </div>
              <ul className="mt-4 space-y-3 text-left">
                {prizes.third.map((prize) => (
                  <li key={prize} className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-tertiary/60 shrink-0" />
                    <span className="font-medium">{prize}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-tertiary">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            ELIGE TU EQUIPO — PRONOSTICA — GANA
          </h2>
          <p className="text-white/80 text-lg mb-8">
            4° Concurso Interliga + Temporada 2026-27
          </p>
          <a
            href="#"
            className="inline-flex items-center gap-2 px-8 py-4 text-lg font-bold text-tertiary bg-white rounded-full hover:bg-white/90 transition-all duration-200 hover:scale-105"
          >
            Participar Ahora
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-foreground/10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-foreground/40">
          <span className="font-bold text-foreground/60">INTERLIGA</span>
          <span>© 2026 Interliga. Todos los derechos reservados.</span>
        </div>
      </footer>
    </div>
  );
}
