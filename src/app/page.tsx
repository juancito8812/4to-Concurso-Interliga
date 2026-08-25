"use client";

const rules = [
  {
    number: "01",
    title: "Elige tu Equipo",
    text: "Escoge tu club favorito para representarlo durante toda la temporada.",
  },
  {
    number: "02",
    title: "Pronostica",
    text: "Envía tu pronóstico de resultado y marcador antes de cada partido de Liga, Copa Nacional y Copas Europeas.",
  },
  {
    number: "03",
    title: "Eliminación Directa",
    text: "Las copas nacionales son de eliminación directa: si fallas tu pronóstico en fase de Knock-out, quedas fuera de esa ronda.",
  },
];

const scoring = [
  { points: "3 pts", label: "Resultado correcto" },
  { points: "2 pts", label: "Marcador exacto" },
  { points: "1 pt", label: "Diferencia de 1 gol en el marcador" },
  { points: "1 pt", label: "Goleador acertado (nombre)" },
  { points: "2 pts", label: "Cantidad de goles del goleador" },
];

const prizes = [
  {
    place: "2DO LUGAR",
    medal: "🥈",
    items: ["Camiseta", "Short", "Gorra", "Bandera", "Jarra", "Gafas", "Póster"],
    highlight: false,
  },
  {
    place: "1ER LUGAR",
    medal: "🥇",
    items: ["Camiseta", "Short", "Balón", "Jarra", "Gafas", "Bandera", "Revista de tu equipo"],
    highlight: true,
  },
  {
    place: "3ER LUGAR",
    medal: "🥉",
    items: ["Camiseta", "Short", "Gorra", "Bandera", "Jarra"],
    highlight: false,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="flex flex-col items-center justify-center min-h-[90vh] px-6 text-center">
        <div className="inline-block px-6 py-2.5 mb-8 text-xs font-bold tracking-[0.2em] text-spotify-black uppercase bg-spotify-green rounded-full">
          Temporada 2026-27
        </div>

        <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black tracking-tight leading-none mb-6">
          <span className="text-spotify-white">4º INTER</span>
          <span className="text-spotify-green">LIGA</span>
        </h1>

        <p className="text-base sm:text-lg font-semibold tracking-wide text-spotify-silver uppercase">
          FÚTBOL{" "}
          <span className="text-spotify-green mx-1">•</span>{" "}
          CAMISETA{" "}
          <span className="text-spotify-green mx-1">•</span>{" "}
          <span className="text-spotify-green">PASIÓN</span>
        </p>
      </section>

      {/* REGLAS */}
      <section className="py-20 px-6 bg-spotify-dark">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Reglas de la{" "}
            <span className="text-spotify-green">Competición</span>
          </h2>
          <p className="text-spotify-silver text-center mb-12 max-w-md mx-auto text-sm">
            Tres pasos para participar y competir por los premios.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rules.map((rule) => (
              <div
                key={rule.number}
                className="relative p-7 rounded-lg bg-spotify-mid transition-colors hover:bg-spotify-card"
              >
                <span className="block text-5xl font-black text-spotify-green/15 mb-3 leading-none">
                  {rule.number}
                </span>
                <h3 className="text-base font-bold mb-2 text-spotify-white">
                  {rule.title}
                </h3>
                <p className="text-sm leading-relaxed text-spotify-silver">
                  {rule.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SISTEMA DE PUNTUACIÓN */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Sistema de{" "}
            <span className="text-spotify-green">Puntuación</span>
          </h2>
          <p className="text-spotify-silver text-center mb-12 max-w-md mx-auto text-sm">
            Cada acierto suma puntos. ¡Máximo 3 goleadores por partido!
          </p>

          <div className="space-y-2">
            {scoring.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-6 py-4 rounded-lg bg-spotify-dark hover:bg-spotify-mid transition-colors"
              >
                <span className="text-sm text-spotify-silver">
                  {item.label}
                </span>
                <span className="text-base font-bold text-spotify-white min-w-[4rem] text-right">
                  {item.points}
                </span>
              </div>
            ))}
          </div>

          {/* Nota */}
          <div className="mt-5 px-6 py-4 rounded-lg bg-spotify-mid">
            <p className="text-xs text-spotify-silver leading-relaxed">
              <span className="text-spotify-green font-bold">Nota:</span>{" "}
              si pronosticas varios goleadores, los puntos se multiplican a tu
              favor — máximo 3 jugadores por partido.
            </p>
          </div>
        </div>
      </section>

      {/* PREMIOS */}
      <section className="py-20 px-6 bg-spotify-dark">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            <span className="text-spotify-green">Premios</span>
          </h2>
          <p className="text-spotify-silver text-center mb-12 max-w-md mx-auto text-sm">
            Los mejores pronosticadores se llevan premios increíbles.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {prizes.map((prize) => (
              <div
                key={prize.place}
                className={`relative p-7 rounded-lg ${
                  prize.highlight
                    ? "bg-spotify-mid shadow-[rgba(30,215,96,0.15)] shadow-lg md:-mt-4"
                    : "bg-spotify-mid"
                }`}
              >
                {prize.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-[10px] font-bold tracking-[0.15em] uppercase bg-spotify-green text-spotify-black rounded-full">
                    Destacado
                  </div>
                )}

                <div className="text-center mb-5">
                  <span className="text-3xl mb-2 block">{prize.medal}</span>
                  <h3
                    className={`text-sm font-bold tracking-wider uppercase ${
                      prize.highlight ? "text-spotify-green" : "text-spotify-white"
                    }`}
                  >
                    {prize.place}
                  </h3>
                </div>

                <ul className="space-y-2">
                  {prize.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-sm text-spotify-silver"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          prize.highlight ? "bg-spotify-green" : "bg-spotify-border"
                        }`}
                      />
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
      <footer className="py-16 px-6 border-t border-spotify-border/30">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-base sm:text-lg font-bold tracking-[0.15em] uppercase text-spotify-white mb-3">
            ELIGE TU EQUIPO • PRONOSTICA • GANA
          </p>
          <p className="text-xs text-spotify-silver tracking-wider uppercase">
            4º CONCURSO INTERLIGA • TEMPORADA 2026-27
          </p>
        </div>
      </footer>
    </div>
  );
}
