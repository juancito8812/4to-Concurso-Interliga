"use client";

const basePath = "/4to-Concurso-Interliga";

const leagues = [
  { name: "LaLiga", logo: `${basePath}/logos/laliga.png` },
  { name: "Serie A", logo: `${basePath}/logos/seriea.png` },
  { name: "Champions League", logo: `${basePath}/logos/champions.png` },
  { name: "Europa League", logo: `${basePath}/logos/europa.png` },
  { name: "Conference League", logo: `${basePath}/logos/conference.png` },
  { name: "Copa Italia", logo: `${basePath}/logos/coppaitalia.png` },
];

const rules = [
  {
    number: "01",
    text: 'Escoge tu club favorito para representarlo durante toda la temporada.',
    highlight: "club favorito",
  },
  {
    number: "02",
    text: 'Envía tu pronóstico de resultado y marcador antes de cada partido de Liga, Copa Nacional y Copas Europeas.',
    highlight: "resultado y marcador",
  },
  {
    number: "03",
    text: 'Las copas nacionales son de eliminación directa: si fallas tu pronóstico en fase de Knock-out, quedas fuera de esa ronda.',
    highlight: "eliminación directa",
  },
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
      {/* HERO */}
      <section className="flex flex-col items-center justify-center min-h-[85vh] px-6 text-center">
        <div className="inline-block px-6 py-2 mb-8 text-xs font-bold tracking-[0.25em] text-navy-black uppercase bg-gold rounded-full">
          Temporada 2026-27
        </div>

        <h1 className="mb-4">
          <span className="block text-4xl sm:text-5xl lg:text-6xl font-black text-white">4°</span>
          <span className="block text-6xl sm:text-8xl lg:text-9xl font-black tracking-tight text-gold">INTERLIGA</span>
        </h1>

        <p className="text-sm sm:text-base font-semibold tracking-[0.15em] text-silver uppercase mb-12">
          FÚTBOL{" "}
          <span className="text-gold mx-2">•</span>{" "}
          CAMISETA{" "}
          <span className="text-gold mx-2">•</span>{" "}
          <span className="text-green">PASIÓN</span>
        </p>

        {/* League Logos */}
        <div className="flex flex-wrap justify-center gap-4 max-w-2xl">
          {leagues.map((league) => (
            <div
              key={league.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white flex items-center justify-center p-2 hover:scale-105 transition-transform"
            >
              <img
                src={league.logo}
                alt={league.name}
                className="w-full h-full object-contain"
              />
            </div>
          ))}
        </div>
      </section>

      {/* REGLAS */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-navy-black">1</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
              Reglas de la <span className="text-gold">Competición</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
            {rules.map((rule) => {
              const parts = rule.text.split(rule.highlight);
              return (
                <div
                  key={rule.number}
                  className="relative p-7 rounded-2xl bg-navy-mid border border-border"
                >
                  <span className="block text-5xl font-black text-gold/20 mb-3 leading-none">
                    {rule.number}
                  </span>
                  <p className="text-sm leading-relaxed text-silver">
                    {parts[0]}
                    <span className="text-gold font-semibold">{rule.highlight}</span>
                    {parts[1]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SISTEMA DE PUNTUACIÓN */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-navy-black">2</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
              Sistema de <span className="text-gold">Puntuación</span>
            </h2>
          </div>

          <p className="text-silver text-sm mb-10">
            Cada acierto suma puntos. ¡Máximo <span className="text-gold font-bold">3 goleadores</span> por partido!
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {scoring.map((item, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-navy-mid border border-border text-center"
              >
                <span className="block text-2xl font-black text-gold mb-2">
                  {item.points}
                </span>
                <span className="text-xs text-silver leading-snug block">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 px-6 py-4 rounded-xl bg-gold/10 border border-gold/20">
            <p className="text-xs text-silver leading-relaxed">
              <span className="text-gold font-bold">Nota:</span>{" "}
              si pronosticas varios goleadores, los puntos se multiplican a tu favor — máximo <span className="text-gold font-bold">3 jugadores</span> por partido.
            </p>
          </div>
        </div>
      </section>

      {/* PREMIOS */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-navy-black">3</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-wider text-gold">
              Premios
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
            {prizes.map((prize) => (
              <div
                key={prize.place}
                className={`relative p-7 rounded-2xl flex flex-col items-center text-center ${
                  prize.highlight
                    ? "bg-navy-mid border-2 border-gold/40 shadow-[0_0_30px_rgba(201,168,76,0.1)]"
                    : "bg-navy-mid border border-border"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-gold flex items-center justify-center mb-4">
                  <span className="text-lg font-bold text-navy-black">{prize.number}</span>
                </div>
                <h3 className="text-sm font-bold tracking-wider uppercase text-gold mb-4">
                  {prize.place}
                </h3>
                <ul className="space-y-1">
                  {prize.items.map((item) => (
                    <li key={item} className="text-sm text-silver">
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
      <footer className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-base sm:text-lg font-bold tracking-[0.15em] uppercase text-white mb-3">
            ELIGE TU EQUIPO • PRONOSTICA • GANA
          </p>
          <p className="text-xs text-silver tracking-wider uppercase">
            4° CONCURSO INTERLIGA • TEMPORADA 2026-27
          </p>
        </div>
      </footer>
    </div>
  );
}
