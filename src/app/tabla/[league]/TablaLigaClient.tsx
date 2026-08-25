"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

const leagueData: Record<string, { name: string; espnCode: string }> = {
  laliga: { name: "LaLiga", espnCode: "esp.1" },
  premier: { name: "Premier League", espnCode: "eng.1" },
  seriea: { name: "Serie A", espnCode: "ita.1" },
  bundesliga: { name: "Bundesliga", espnCode: "ger.1" },
  champions: { name: "Champions League", espnCode: "uefa.champions" },
  europa: { name: "Europa League", espnCode: "uefa.europa" },
  conference: { name: "Conference League", espnCode: "uefa.europa.conf" },
  coppaitalia: { name: "Copa Italia", espnCode: "ita.coppa" },
};

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
  const [standings, setStandings] = useState<Standing[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("standings");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!data) return;

    const fetchStandings = async () => {
      try {
        const res = await fetch(
          `https://site.api.espn.com/apis/v2/sports/soccer/${data.espnCode}/standings`
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

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-8 sm:pb-12 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-silver hover:text-white mb-6 sm:mb-8 transition-colors text-sm">
          <span className="text-gold">←</span> Volver al inicio
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">{data.name}</h1>
        <p className="text-silver text-xs sm:text-sm mb-6 sm:mb-8">Estadísticas - Temporada 2025-26</p>

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
              {/* Standings Tab */}
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

              {/* Scorers Tab */}
              {activeTab === "scorers" && (
                <div className="p-8 sm:p-12 text-center">
                  <span className="text-4xl mb-4 block">⚽</span>
                  <h3 className="text-white font-bold text-lg mb-2">Goleadores</h3>
                  <p className="text-silver text-sm mb-4">Estadísticas de goleadores de la {data.name}</p>
                  <div className="inline-block px-4 py-2 bg-gold/10 border border-gold/20 rounded-full">
                    <span className="text-gold text-xs font-medium">Próximamente disponible</span>
                  </div>
                </div>
              )}

              {/* Assists Tab */}
              {activeTab === "assists" && (
                <div className="p-8 sm:p-12 text-center">
                  <span className="text-4xl mb-4 block">🅰️</span>
                  <h3 className="text-white font-bold text-lg mb-2">Asistencias</h3>
                  <p className="text-silver text-sm mb-4">Top asistidores de la {data.name}</p>
                  <div className="inline-block px-4 py-2 bg-gold/10 border border-gold/20 rounded-full">
                    <span className="text-gold text-xs font-medium">Próximamente disponible</span>
                  </div>
                </div>
              )}

              {/* Cards Tab */}
              {activeTab === "cards" && (
                <div className="p-8 sm:p-12 text-center">
                  <span className="text-4xl mb-4 block">🟨</span>
                  <h3 className="text-white font-bold text-lg mb-2">Tarjetas</h3>
                  <p className="text-silver text-sm mb-4">Jugadores con más tarjetas de la {data.name}</p>
                  <div className="inline-block px-4 py-2 bg-gold/10 border border-gold/20 rounded-full">
                    <span className="text-gold text-xs font-medium">Próximamente disponible</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
