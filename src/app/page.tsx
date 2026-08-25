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
        <div className="inline-block px-5 py-2 mb-8 text-xs font-bold tracking-[0.25em] text-gold-bright uppercase border border-gold/30 rounded-full bg-gold/5">
          Temporada 2026-27
        </div>

        <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black tracking-tight leading-none mb-6">
          <span className="text-gold-bright">4º INTERLIGA</span>
        </h1>

        <p className="text-lg sm:text-xl font-semibold tracking-wide text-foreground/70">
          FÚTBOL{" "}
          <span className="text-gold/60 mx-1">•</span>{" "}
          CAMISETA{" "}
          <span className="text-gold/60 mx-1">•</span>{" "}
          <span className="text-emerald">PASIÓN</span>
        </p>
      </section>

      {/* REGLAS */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Reglas de la <span className="text-gold">Competición</span>
          </h2>
          <p className="text-foreground/50 text-center mb-12 max-w-md mx-auto">
            Tres pasos para participar y competir por los premios.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {rules.map((rule) => (
              <div
                key={rule.number}
                className="relative p-8 rounded-2xl bg-card border border-border"
              >
                <span className="block text-5xl font-black text-gold/20 mb-4 leading-none">
                  {rule.number}
                </span>
                <h3 className="text-lg font-bold mb-3 text-foreground">
                  {rule.title}
                </h3>
                <p className="text-sm leading-relaxed text-foreground/60">
                  {rule.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SISTEMA DE PUNTUACIÓN */}
      <section className="py-20 px-6 bg-card/40">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Sistema de <span className="text-gold">Puntuación</span>
          </h2>
          <p className="text-foreground/50 text-center mb-12 max-w-md mx-auto">
            Cada acierto suma puntos. ¡Máximo 3 goleadores por partido!
          </p>

          <div className="space-y-3">
            {scoring.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-5 rounded-xl bg-card border border-border hover:border-gold/20 transition-colors"
              >
                <span className="text-sm font-medium text-foreground/80">
                  {item.label}
                </span>
                <span className="text-lg font-black text-gold-bright min-w-[4rem] text-right">
                  {item.points}
                </span>
              </div>
            ))}
          </div>

          {/* Nota */}
          <div className="mt-6 p-4 rounded-xl bg-gold/5 border border-gold/15">
            <p className="text-sm text-foreground/60 text-center leading-relaxed">
              <span className="text-gold font-semibold">Nota:</span> si pronosticas varios goleadores, los puntos se multiplican a tu favor — máximo 3 jugadores por partido.
            </p>
          </div>
        </div>
      </section>

      {/* PREMIOS */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            <span className="text-gold">Premios</span>
          </h2>
          <p className="text-foreground/50 text-center mb-12 max-w-md mx-auto">
            Los mejores pronosticadores se llevan premios increíbles.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {prizes.map((prize) => (
              <div
                key={prize.place}
                className={`relative p-8 rounded-2xl ${
                  prize.highlight
                    ? "bg-card border-2 border-gold/40 md:-mt-4"
                    : "bg-card border border-border"
                }`}
              >
                {prize.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-bold tracking-wider uppercase bg-gold text-background rounded-full">
                    Destacado
                  </div>
                )}

                <div className="text-center mb-6">
                  <span className="text-3xl mb-2 block">{prize.medal}</span>
                  <h3
                    className={`text-lg font-bold ${
                      prize.highlight ? "text-gold-bright" : "text-foreground"
                    }`}
                  >
                    {prize.place}
                  </h3>
                </div>

                <ul className="space-y-2.5">
                  {prize.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-sm text-foreground/70"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          prize.highlight ? "bg-gold" : "bg-foreground/30"
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
      <footer className="py-16 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-lg sm:text-xl font-bold tracking-widest text-gold/80 mb-3">
            ELIGE TU EQUIPO • PRONOSTICA • GANA
          </p>
          <p className="text-sm text-foreground/40 tracking-wide">
            4º CONCURSO INTERLIGA • TEMPORADA 2026-27
          </p>
        </div>
      </footer>
    </div>
  );
}
