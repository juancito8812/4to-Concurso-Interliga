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
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
}

interface Player {
  rank: number;
  name: string;
  team: string;
  teamLogo: string;
  value: number;
}

type Tab = "standings" | "scorers" | "assists" | "cards";

export default function TablaLigaClient() {
  const params = useParams();
  const league = params.league as string;
  const data = leagueData[league];
  const [standings, setStandings] = useState<Standing[]>([]);
  const [scorers, setScorers] = useState<Player[]>([]);
  const [assists, setAssists] = useState<Player[]>([]);
  const [cards, setCards] = useState<Player[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("standings");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!data) return;

    const fetchAll = async () => {
      try {
        // Fetch standings
        const standingsRes = await fetch(
          `https://site.api.espn.com/apis/v2/sports/soccer/${data.espnCode}/standings`
        );
        const standingsJson = await standingsRes.json();
        if (standingsJson.children?.[0]?.standings) {
          setStandings(
            standingsJson.children[0].standings.entries.map((entry: any, i: number) => ({
              rank: entry.stats.find((s: any) => s.name === "rank")?.value || i + 1,
              team: {
                name: entry.team.displayName || entry.team.shortDisplayName,
                logo: entry.team.logos?.[0]?.href || "",
              },
              points: entry.stats.find((s: any) => s.name === "points")?.value || 0,
              goalsDiff: entry.stats.find((s: any) => s.name === "pointDifferential")?.value || 0,
              all: {
                played: entry.stats.find((s: any) => s.name === "gamesPlayed")?.value || 0,
                win: entry.stats.find((s: any) => s.name === "wins")?.value || 0,
                draw: entry.stats.find((s: any) => s.name === "ties")?.value || 0,
                lose: entry.stats.find((s: any) => s.name === "losses")?.value || 0,
                goals: { for: 0, against: 0 },
              },
            }))
          );
        }

        // Fetch leaders (scorers)
        const leadersRes = await fetch(
          `https://site.api.espn.com/apis/v2/sports/soccer/${data.espnCode}/leaders?season=2025`
        );
        const leadersJson = await leadersRes.json();
        if (leadersJson.leaders) {
          const extractLeaders = (categoryName: string): Player[] => {
            const cat = leadersJson.leaders.find((c: any) => c.name?.toLowerCase().includes(categoryName));
            if (!cat) return [];
            return cat.leaders.slice(0, 15).map((l: any, i: number) => ({
              rank: i + 1,
              name: l.athlete?.displayName || l.athlete?.shortName || "",
              team: l.athlete?.team?.displayName || l.athlete?.team?.abbreviation || "",
              teamLogo: l.athlete?.team?.logos?.[0]?.href || "",
              value: l.averages ? l.averages[0]?.value : l.categories?.[0]?.value || 0,
            }));
          };
          setScorers(extractLeaders("goal"));
          setAssists(extractLeaders("assist"));
          setCards(extractLeaders("card") || extractLeaders("yellow") || extractLeaders("foul"));
        }
      } catch {
        setError("Error al cargar datos");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
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

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "standings", label: "Tabla", icon: "📊" },
    { id: "scorers", label: "Goleadores", icon: "⚽" },
    { id: "assists", label: "Asistencias", icon: "🅰️" },
    { id: "cards", label: "Tarjetas", icon: "🟨" },
  ];

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
              <p className="text-silver text-sm">Cargando estadísticas...</p>
            </div>
          ) : error ? (
            <div className="p-8 sm:p-12 text-center">
              <p className="text-silver text-sm">{error}</p>
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
                              <img src={s.team.logo} alt={s.team.name} className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
                              <span className="text-white text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-none">{s.team.name}</span>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3 text-center text-silver text-sm">{s.all.played}</td>
                          <td className="hidden sm:table-cell px-4 py-3 text-center text-silver text-sm">{s.all.win}</td>
                          <td className="hidden sm:table-cell px-4 py-3 text-center text-silver text-sm">{s.all.draw}</td>
                          <td className="hidden sm:table-cell px-4 py-3 text-center text-silver text-sm">{s.all.lose}</td>
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
                <div>
                  {scorers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[300px]">
                        <thead>
                          <tr className="border-b border-border text-[10px] sm:text-xs text-silver uppercase">
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left w-8 sm:w-12">#</th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">Jugador</th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-bold text-gold">Goles</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scorers.map((p) => (
                            <tr key={p.rank} className="border-b border-border/50 hover:bg-navy-card transition-colors">
                              <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-silver text-xs sm:text-sm">{p.rank}</td>
                              <td className="px-2 sm:px-4 py-2.5 sm:py-3">
                                <div className="flex items-center gap-2 sm:gap-3">
                                  {p.teamLogo && <img src={p.teamLogo} alt="" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />}
                                  <div>
                                    <span className="text-white text-xs sm:text-sm font-medium block">{p.name}</span>
                                    <span className="text-silver text-[10px] sm:text-xs">{p.team}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center text-gold font-bold text-xs sm:text-sm">{p.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 sm:p-12 text-center">
                      <span className="text-3xl mb-3 block">⚽</span>
                      <p className="text-silver text-sm">Estadísticas de goleadores no disponibles para esta liga</p>
                    </div>
                  )}
                </div>
              )}

              {/* Assists Tab */}
              {activeTab === "assists" && (
                <div>
                  {assists.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[300px]">
                        <thead>
                          <tr className="border-b border-border text-[10px] sm:text-xs text-silver uppercase">
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left w-8 sm:w-12">#</th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">Jugador</th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-bold text-gold">Asist.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assists.map((p) => (
                            <tr key={p.rank} className="border-b border-border/50 hover:bg-navy-card transition-colors">
                              <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-silver text-xs sm:text-sm">{p.rank}</td>
                              <td className="px-2 sm:px-4 py-2.5 sm:py-3">
                                <div className="flex items-center gap-2 sm:gap-3">
                                  {p.teamLogo && <img src={p.teamLogo} alt="" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />}
                                  <div>
                                    <span className="text-white text-xs sm:text-sm font-medium block">{p.name}</span>
                                    <span className="text-silver text-[10px] sm:text-xs">{p.team}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center text-gold font-bold text-xs sm:text-sm">{p.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 sm:p-12 text-center">
                      <span className="text-3xl mb-3 block">🅰️</span>
                      <p className="text-silver text-sm">Estadísticas de asistencias no disponibles para esta liga</p>
                    </div>
                  )}
                </div>
              )}

              {/* Cards Tab */}
              {activeTab === "cards" && (
                <div>
                  {cards.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[300px]">
                        <thead>
                          <tr className="border-b border-border text-[10px] sm:text-xs text-silver uppercase">
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left w-8 sm:w-12">#</th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">Jugador</th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-bold text-gold">Tarjetas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cards.map((p) => (
                            <tr key={p.rank} className="border-b border-border/50 hover:bg-navy-card transition-colors">
                              <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-silver text-xs sm:text-sm">{p.rank}</td>
                              <td className="px-2 sm:px-4 py-2.5 sm:py-3">
                                <div className="flex items-center gap-2 sm:gap-3">
                                  {p.teamLogo && <img src={p.teamLogo} alt="" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />}
                                  <div>
                                    <span className="text-white text-xs sm:text-sm font-medium block">{p.name}</span>
                                    <span className="text-silver text-[10px] sm:text-xs">{p.team}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center text-gold font-bold text-xs sm:text-sm">{p.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 sm:p-12 text-center">
                      <span className="text-3xl mb-3 block">🟨</span>
                      <p className="text-silver text-sm">Estadísticas de tarjetas no disponibles para esta liga</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
