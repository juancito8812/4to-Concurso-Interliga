"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

const leagueData: Record<string, { name: string; espnCode: string; country: string }> = {
  laliga: { name: "LaLiga", espnCode: "esp.1", country: "ESP" },
  premier: { name: "Premier League", espnCode: "eng.1", country: "GBR" },
  seriea: { name: "Serie A", espnCode: "ita.1", country: "ITA" },
  bundesliga: { name: "Bundesliga", espnCode: "ger.1", country: "GER" },
  champions: { name: "Champions League", espnCode: "uefa.champions", country: "EUR" },
  europa: { name: "Europa League", espnCode: "uefa.europa", country: "EUR" },
  conference: { name: "Conference League", espnCode: "uefa.europa.conf", country: "EUR" },
  coppaitalia: { name: "Copa Italia", espnCode: "ita.coppa", country: "ITA" },
};

// Sample data for 2026-27 season
const sampleData: Record<string, { scorers: any[]; assists: any[]; cards: any[] }> = {
  premier: {
    scorers: [
      { rank: 1, name: "Erling Haaland", team: "Manchester City", value: 32 },
      { rank: 2, name: "Mohamed Salah", team: "Liverpool", value: 26 },
      { rank: 3, name: "Alexander Isak", team: "Newcastle", value: 23 },
      { rank: 4, name: "Bukayo Saka", team: "Arsenal", value: 21 },
      { rank: 5, name: "Jhon Durán", team: "Aston Villa", value: 19 },
      { rank: 6, name: "Cole Palmer", team: "Chelsea", value: 18 },
      { rank: 7, name: "Christopher Nkunku", team: "Chelsea", value: 17 },
      { rank: 8, name: "Son Heung-min", team: "Tottenham", value: 16 },
      { rank: 9, name: "Ollie Watkins", team: "Aston Villa", value: 15 },
      { rank: 10, name: "Dominic Solanke", team: "Tottenham", value: 14 },
    ],
    assists: [
      { rank: 1, name: "Mohamed Salah", team: "Liverpool", value: 18 },
      { rank: 2, name: "Kevin De Bruyne", team: "Manchester City", value: 16 },
      { rank: 3, name: "Bukayo Saka", team: "Arsenal", value: 15 },
      { rank: 4, name: "Florian Wirtz", team: "Arsenal", value: 13 },
      { rank: 5, name: "Bernardo Silva", team: "Manchester City", value: 12 },
      { rank: 6, name: "Martin Ødegaard", team: "Arsenal", value: 11 },
      { rank: 7, name: "Cole Palmer", team: "Chelsea", value: 10 },
      { rank: 8, name: "James Maddison", team: "Tottenham", value: 9 },
      { rank: 9, name: "Bruno Fernandes", team: "Man United", value: 9 },
      { rank: 10, name: "Anthony Gordon", team: "Newcastle", value: 8 },
    ],
    cards: [
      { rank: 1, name: "João Palhinha", team: "Tottenham", value: 15 },
      { rank: 2, name: "Cristian Romero", team: "Tottenham", value: 13 },
      { rank: 3, name: "William Saliba", team: "Arsenal", value: 12 },
      { rank: 4, name: "Virgil van Dijk", team: "Liverpool", value: 11 },
      { rank: 5, name: "Lewis Dunk", team: "Brighton", value: 10 },
      { rank: 6, name: "James Tarkowski", team: "Everton", value: 9 },
      { rank: 7, name: "Marcos Senesi", team: "Bournemouth", value: 9 },
      { rank: 8, name: "Issa Diop", team: "Fulham", value: 8 },
      { rank: 9, name: "Conor Gallagher", team: "Chelsea", value: 8 },
      { rank: 10, name: "Ezri Konsa", team: "Aston Villa", value: 7 },
    ],
  },
  esp: {
    scorers: [
      { rank: 1, name: "Robert Lewandowski", team: "Barcelona", value: 27 },
      { rank: 2, name: "Lamine Yamal", team: "Barcelona", value: 22 },
      { rank: 3, name: "Kylian Mbappé", team: "Real Madrid", value: 21 },
      { rank: 4, name: "Vinícius Jr.", team: "Real Madrid", value: 19 },
      { rank: 5, name: "Jude Bellingham", team: "Real Madrid", value: 17 },
      { rank: 6, name: "Artem Dovbyk", team: "Girona", value: 16 },
      { rank: 7, name: "Alexander Sørloth", team: "Atlético Madrid", value: 15 },
      { rank: 8, name: "Ayoze Pérez", team: "Villarreal", value: 14 },
      { rank: 9, name: "Mikel Oyarzabal", team: "Real Sociedad", value: 13 },
      { rank: 10, name: "Antoine Griezmann", team: "Atlético Madrid", value: 12 },
    ],
    assists: [
      { rank: 1, name: "Lamine Yamal", team: "Barcelona", value: 15 },
      { rank: 2, name: "Vinícius Jr.", team: "Real Madrid", value: 13 },
      { rank: 3, name: "Jude Bellingham", team: "Real Madrid", value: 12 },
      { rank: 4, name: "Dani Olmo", team: "Barcelona", value: 10 },
      { rank: 5, name: "Pedri", team: "Barcelona", value: 10 },
      { rank: 6, name: "Antoine Griezmann", team: "Atlético Madrid", value: 9 },
      { rank: 7, name: "Federico Valverde", team: "Real Madrid", value: 8 },
      { rank: 8, name: "Isco", team: "Real Betis", value: 8 },
      { rank: 9, name: "Rodrigo Hernández", team: "Barcelona", value: 7 },
      { rank: 10, name: "Takefusa Kubo", team: "Real Sociedad", value: 7 },
    ],
    cards: [
      { rank: 1, name: "Stefan Savić", team: "Atlético Madrid", value: 14 },
      { rank: 2, name: "Ronald Araújo", team: "Barcelona", value: 12 },
      { rank: 3, name: "Éder Militão", team: "Real Madrid", value: 11 },
      { rank: 4, name: "Jules Koundé", team: "Barcelona", value: 10 },
      { rank: 5, name: "José Giménez", team: "Atlético Madrid", value: 9 },
      { rank: 6, name: "Dani Carvajal", team: "Real Madrid", value: 9 },
      { rank: 7, name: "Alejandro Grimaldo", team: "Atlético Madrid", value: 8 },
      { rank: 8, name: "Nacho Fernández", team: "Real Madrid", value: 8 },
      { rank: 9, name: "Marcos Llorente", team: "Atlético Madrid", value: 7 },
      { rank: 10, name: "Frenkie de Jong", team: "Barcelona", value: 7 },
    ],
  },
  ita: {
    scorers: [
      { rank: 1, name: "Lautaro Martínez", team: "Inter Milan", value: 25 },
      { rank: 2, name: "Marcus Thuram", team: "Inter Milan", value: 20 },
      { rank: 3, name: "Dušan Vlahović", team: "Juventus", value: 18 },
      { rank: 4, name: "Rafael Leão", team: "AC Milan", value: 17 },
      { rank: 5, name: "Romelu Lukaku", team: "Napoli", value: 16 },
      { rank: 6, name: "Mattia Retegui", team: "Atalanta", value: 15 },
      { rank: 7, name: "Khvicha Kvaratskhelia", team: "Napoli", value: 14 },
      { rank: 8, name: "Patrick Schick", team: "Bayer Leverkusen", value: 13 },
      { rank: 9, name: "Federico Chiesa", team: "Juventus", value: 12 },
      { rank: 10, name: "Nico Paz", team: "Como", value: 11 },
    ],
    assists: [
      { rank: 1, name: "Nicolò Barella", team: "Inter Milan", value: 13 },
      { rank: 2, name: "Hakan Çalhanoğlu", team: "Inter Milan", value: 12 },
      { rank: 3, name: "Khvicha Kvaratskhelia", team: "Napoli", value: 11 },
      { rank: 4, name: "Rafael Leão", team: "AC Milan", value: 10 },
      { rank: 5, name: "Paulo Dybala", team: "Roma", value: 9 },
      { rank: 6, name: "Piotr Zieliński", team: "Inter Milan", value: 8 },
      { rank: 7, name: "Lucas Paquetá", team: "West Ham", value: 8 },
      { rank: 8, name: "Andrea Belotti", team: "Fiorentina", value: 7 },
      { rank: 9, name: "Domenico Berardi", team: "Sassuolo", value: 7 },
      { rank: 10, name: "Samuel Chukwueze", team: "AC Milan", value: 6 },
    ],
    cards: [
      { rank: 1, name: "Gleison Bremer", team: "Juventus", value: 14 },
      { rank: 2, name: "Francesco Acerbi", team: "Inter Milan", value: 12 },
      { rank: 3, name: "Kim Min-jae", team: "Bayern Munich", value: 11 },
      { rank: 4, name: "Alessio Romagnoli", team: "Lazio", value: 10 },
      { rank: 5, name: "Rrahmani", team: "Napoli", value: 9 },
      { rank: 6, name: "Theo Hernández", team: "AC Milan", value: 9 },
      { rank: 7, name: "Nicolò Rovella", team: "Lazio", value: 8 },
      { rank: 8, name: "Sandro Tonali", team: "Newcastle", value: 8 },
      { rank: 9, name: "Nicolò Zaniolo", team: "Galatasaray", value: 7 },
      { rank: 10, name: "Davide Calabria", team: "AC Milan", value: 7 },
    ],
  },
  ger: {
    scorers: [
      { rank: 1, name: "Harry Kane", team: "Bayern Munich", value: 35 },
      { rank: 2, name: "Omar Marmoush", team: "Eintracht Frankfurt", value: 23 },
      { rank: 3, name: "Serhou Guirassy", team: "Borussia Dortmund", value: 20 },
      { rank: 4, name: "Florian Wirtz", team: "Bayer Leverkusen", value: 18 },
      { rank: 5, name: "Loïs Openda", team: "RB Leipzig", value: 17 },
      { rank: 6, name: "Victor Boniface", team: "Bayer Leverkusen", value: 16 },
      { rank: 7, name: "Jonathan Burkardt", team: "Mainz", value: 15 },
      { rank: 8, name: "Deniz Undav", team: "Stuttgart", value: 14 },
      { rank: 9, name: "Jamal Musiala", team: "Bayern Munich", value: 13 },
      { rank: 10, name: "Mathys Tel", team: "Bayern Munich", value: 12 },
    ],
    assists: [
      { rank: 1, name: "Florian Wirtz", team: "Bayer Leverkusen", value: 16 },
      { rank: 2, name: "Jamal Musiala", team: "Bayern Munich", value: 13 },
      { rank: 3, name: "Omar Marmoush", team: "Eintracht Frankfurt", value: 12 },
      { rank: 4, name: "Xavi Simons", team: "RB Leipzig", value: 11 },
      { rank: 5, name: "Julian Brandt", team: "Borussia Dortmund", value: 10 },
      { rank: 6, name: "Martin Terrier", team: "Bayer Leverkusen", value: 9 },
      { rank: 7, name: "Chris Führich", team: "Stuttgart", value: 8 },
      { rank: 8, name: "Raphaël Guerreiro", team: "Bayern Munich", value: 8 },
      { rank: 9, name: "Joshua Kimmich", team: "Bayern Munich", value: 7 },
      { rank: 10, name: "Karim Adeyemi", team: "Borussia Dortmund", value: 7 },
    ],
    cards: [
      { rank: 1, name: "Jonathan Tah", team: "Bayer Leverkusen", value: 13 },
      { rank: 2, name: "Waldemar Anton", team: "Borussia Dortmund", value: 11 },
      { rank: 3, name: "Edmond Tapsoba", team: "Bayer Leverkusen", value: 10 },
      { rank: 4, name: "Nico Schlotterbeck", team: "Borussia Dortmund", value: 10 },
      { rank: 5, name: "David Raum", team: "RB Leipzig", value: 9 },
      { rank: 6, name: "Minjae Kim", team: "Bayern Munich", value: 9 },
      { rank: 7, name: "Niklas Süle", team: "Borussia Dortmund", value: 8 },
      { rank: 8, name: "Mats Hummels", team: "Roma", value: 8 },
      { rank: 9, name: "Jeremie Frimpong", team: "Bayer Leverkusen", value: 7 },
      { rank: 10, name: "Malick Thiaw", team: "AC Milan", value: 7 },
    ],
  },
};

// Generate empty data for leagues without sample data
const emptyData = { scorers: [], assists: [], cards: [] };

interface Standing {
  rank: number;
  team: { name: string; logo: string };
  points: number;
  goalsDiff: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
}

interface PlayerStat {
  rank: number;
  name: string;
  team: string;
  value: number;
}

type Tab = "standings" | "scorers" | "assists" | "cards";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "standings", label: "Tabla", icon: "📊" },
  { id: "scorers", label: "Goleadores", icon: "⚽" },
  { id: "assists", label: "Asistencias", icon: "🅰️" },
  { id: "cards", label: "Tarjetas", icon: "🟨" },
];

export default function TablaLigaClient() {
  const params = useParams();
  const league = params.league as string;
  const data = leagueData[league];
  const leagueSample = sampleData[league] || emptyData;
  const [standings, setStandings] = useState<Standing[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("standings");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!data) return;

    const fetchStandings = async () => {
      try {
        const res = await fetch(
          `https://site.api.espn.com/apis/v2/sports/soccer/${data.espnCode}/standings?season=2026`
        );
        const json = await res.json();

        if (json.children?.[0]?.standings) {
          const entries = json.children[0].standings.entries;
          const mapped = entries.map((entry: any) => {
            const getStat = (name: string) =>
              entry.stats.find((s: any) => s.name === name)?.value || 0;
            return {
              rank: getStat("rank"),
              team: {
                name: entry.team?.displayName || "Unknown",
                logo: entry.team?.logos?.[0]?.href || "",
              },
              points: getStat("points"),
              goalsDiff: getStat("pointDifferential"),
              played: getStat("gamesPlayed"),
              win: getStat("wins"),
              draw: getStat("ties"),
              lose: getStat("losses"),
              goalsFor: getStat("pointsFor"),
              goalsAgainst: getStat("pointsAgainst"),
            };
          });
          mapped.sort((a: Standing, b: Standing) => a.rank - b.rank);
          setStandings(mapped);
        } else {
          setError("No se pudo cargar la clasificación");
        }
      } catch {
        setError("Error al conectar con la API");
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, [data]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-4">Liga no encontrada</h1>
          <Link href="/" className="text-gold hover:underline text-sm">← Volver al inicio</Link>
        </div>
      </div>
    );
  }

  const renderPlayerTable = (players: PlayerStat[], valueLabel: string) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[280px]">
        <thead>
          <tr className="border-b border-border text-[10px] sm:text-xs text-silver uppercase">
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left w-8 sm:w-12">#</th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">Jugador</th>
            <th className="hidden sm:table-cell px-4 py-3 text-left">Equipo</th>
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-center w-16 font-bold text-gold">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.rank} className="border-b border-border/50 hover:bg-navy-card transition-colors">
              <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-silver text-xs sm:text-sm">{p.rank}</td>
              <td className="px-2 sm:px-4 py-2.5 sm:py-3">
                <span className="text-white text-xs sm:text-sm font-medium">{p.name}</span>
              </td>
              <td className="hidden sm:table-cell px-4 py-3 text-silver text-xs sm:text-sm">{p.team}</td>
              <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center text-gold font-bold text-xs sm:text-sm">{p.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-8 sm:pb-12 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-silver hover:text-white mb-6 sm:mb-8 transition-colors text-sm">
          <span className="text-gold">←</span> Volver al inicio
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">{data.name}</h1>
        <p className="text-silver text-xs sm:text-sm mb-6 sm:mb-8">Estadísticas - Temporada 2026-27</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-gold text-navy-black"
                  : "bg-navy-mid text-silver border border-border hover:bg-navy-card"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-border bg-navy-mid">
          {loading ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="inline-block w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-silver text-sm">Cargando clasificación...</p>
            </div>
          ) : error ? (
            <div className="p-8 sm:p-12 text-center">
              <span className="text-3xl mb-3 block">⚠️</span>
              <p className="text-silver text-sm">{error}</p>
              <Link href="/" className="inline-block mt-4 text-gold text-sm hover:underline">← Volver al inicio</Link>
            </div>
          ) : (
            <>
              {activeTab === "standings" && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px]">
                    <thead>
                      <tr className="border-b border-border text-[10px] sm:text-xs text-silver uppercase">
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left w-8 sm:w-12">#</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">Equipo</th>
                        <th className="hidden sm:table-cell px-4 py-3 text-center w-12">PJ</th>
                        <th className="hidden sm:table-cell px-4 py-3 text-center w-12">G</th>
                        <th className="hidden sm:table-cell px-4 py-3 text-center w-12">E</th>
                        <th className="hidden sm:table-cell px-4 py-3 text-center w-12">P</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center w-10 sm:w-12">GF</th>
                        <th className="hidden sm:table-cell px-4 py-3 text-center w-12">GC</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center w-12 sm:w-16">DG</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center w-10 sm:w-14 font-bold text-gold">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s) => (
                        <tr key={s.rank} className="border-b border-border/50 hover:bg-navy-card transition-colors">
                          <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-silver text-xs sm:text-sm">{s.rank}</td>
                          <td className="px-2 sm:px-4 py-2.5 sm:py-3">
                            <div className="flex items-center gap-2 sm:gap-3">
                              {s.team.logo && <img src={s.team.logo} alt="" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />}
                              <span className="text-white text-xs sm:text-sm font-medium truncate max-w-[140px] sm:max-w-none">{s.team.name}</span>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3 text-center text-silver text-sm">{s.played}</td>
                          <td className="hidden sm:table-cell px-4 py-3 text-center text-silver text-sm">{s.win}</td>
                          <td className="hidden sm:table-cell px-4 py-3 text-center text-silver text-sm">{s.draw}</td>
                          <td className="hidden sm:table-cell px-4 py-3 text-center text-silver text-sm">{s.lose}</td>
                          <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center text-silver text-xs sm:text-sm">{s.goalsFor}</td>
                          <td className="hidden sm:table-cell px-4 py-3 text-center text-silver text-sm">{s.goalsAgainst}</td>
                          <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center text-silver text-xs sm:text-sm">{s.goalsDiff > 0 ? `+${s.goalsDiff}` : s.goalsDiff}</td>
                          <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center text-gold font-bold text-xs sm:text-sm">{s.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "scorers" && (
                leagueSample.scorers.length > 0
                  ? renderPlayerTable(leagueSample.scorers, "Goles")
                  : (
                    <div className="p-8 sm:p-12 text-center">
                      <span className="text-4xl mb-3 block">⚽</span>
                      <p className="text-silver text-sm">Goleadores no disponibles para esta liga</p>
                    </div>
                  )
              )}

              {activeTab === "assists" && (
                leagueSample.assists.length > 0
                  ? renderPlayerTable(leagueSample.assists, "Asist.")
                  : (
                    <div className="p-8 sm:p-12 text-center">
                      <span className="text-4xl mb-3 block">🅰️</span>
                      <p className="text-silver text-sm">Asistencias no disponibles para esta liga</p>
                    </div>
                  )
              )}

              {activeTab === "cards" && (
                leagueSample.cards.length > 0
                  ? renderPlayerTable(leagueSample.cards, "Tarjetas")
                  : (
                    <div className="p-8 sm:p-12 text-center">
                      <span className="text-4xl mb-3 block">🟨</span>
                      <p className="text-silver text-sm">Tarjetas no disponibles para esta liga</p>
                    </div>
                  )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
