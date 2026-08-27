"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getStandings, getScorers, FDScorer } from "@/lib/footballData";
import { leagueColors, leagueLogos } from "@/lib/leagueConfig";

const leagueData: Record<string, { name: string; fdCode: string; country: string; hasApi: boolean }> = {
  premier: { name: "Premier League", fdCode: "PL", country: "GBR", hasApi: true },
  laliga: { name: "LaLiga", fdCode: "PD", country: "ESP", hasApi: true },
  seriea: { name: "Serie A", fdCode: "SA", country: "ITA", hasApi: true },
  bundesliga: { name: "Bundesliga", fdCode: "BL1", country: "GER", hasApi: true },
  champions: { name: "Champions League", fdCode: "CL", country: "EUR", hasApi: true },
  europa: { name: "Europa League", fdCode: "EL", country: "EUR", hasApi: false },
  conference: { name: "Conference League", fdCode: "ECL", country: "EUR", hasApi: false },
  coppaitalia: { name: "Copa Italia", fdCode: "CI", country: "ITA", hasApi: false },
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

interface FDTableEntry {
  position: number;
  team: {
    name: string;
    shortName?: string;
    crest?: string;
  };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

interface PlayerStat {
  rank: number;
  name: string;
  team: string;
  value: number;
}

type Tab = "standings" | "scorers";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "standings", label: "Tabla", icon: "📊" },
  { id: "scorers", label: "Goleadores", icon: "⚽" },
];

export default function TablaLigaClient() {
  const params = useParams();
  const league = params.league as string;
  const data = leagueData[league];
  const leagueColor = leagueColors[league] || "#c9a84c";
  const leagueLogo = leagueLogos[league] || "";

  const [standings, setStandings] = useState<Standing[]>([]);
  const [scorers, setScorers] = useState<PlayerStat[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("standings");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!data) return;

    const fetchData = async () => {
      try {
        if (data.hasApi) {
          // Fetch standings from football-data.org
          const standingsData = await getStandings(data.fdCode);
          if (standingsData.length > 0) {
            const table = standingsData[0]?.table || [];
            const mapped: Standing[] = (table as FDTableEntry[]).map((entry) => ({
              rank: entry.position,
              team: {
                name: entry.team.shortName || entry.team.name,
                logo: entry.team.crest || "",
              },
              points: entry.points,
              goalsDiff: entry.goalDifference,
              played: entry.playedGames,
              win: entry.won,
              draw: entry.draw,
              lose: entry.lost,
              goalsFor: entry.goalsFor,
              goalsAgainst: entry.goalsAgainst,
            }));
            setStandings(mapped);
          } else {
            setError("No se pudo cargar la clasificación");
          }

          // Fetch scorers from football-data.org
          const scorersData = await getScorers(data.fdCode);
          if (scorersData.length > 0) {
            const mappedScorers: PlayerStat[] = scorersData.slice(0, 20).map((s: FDScorer, i: number) => ({
              rank: i + 1,
              name: s.player.name,
              team: s.team.shortName || s.team.name,
              value: s.goals,
            }));
            setScorers(mappedScorers);
          }
        } else {
          setError("Liga no disponible en la API gratuita");
        }
      } catch {
        setError("Error al conectar con la API");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
            <th className="px-2 sm:px-4 py-2 sm:py-3 text-center w-16 font-bold" style={{ color: leagueColor }}>{valueLabel}</th>
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
              <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-xs sm:text-sm" style={{ color: leagueColor }}>{p.value}</td>
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
          <span style={{ color: leagueColor }}>←</span> Volver al inicio
        </Link>

        <div className="flex items-center gap-3 mb-1 sm:mb-2">
          {leagueLogo && <img src={leagueLogo} alt={data.name} className="w-8 h-8 object-contain" />}
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{data.name}</h1>
        </div>
        <p className="text-silver text-xs sm:text-sm mb-6 sm:mb-8">
          Estadísticas en vivo · football-data.org
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "text-navy-black"
                  : "bg-navy-mid text-silver border border-border hover:bg-navy-card"
              }`}
              style={activeTab === tab.id ? { backgroundColor: leagueColor } : {}}
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
              <div className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: leagueColor, borderTopColor: "transparent" }}></div>
              <p className="text-silver text-sm">Cargando datos...</p>
            </div>
          ) : error ? (
            <div className="p-8 sm:p-12 text-center">
              <span className="text-3xl mb-3 block">⚠️</span>
              <p className="text-silver text-sm">{error}</p>
              <Link href="/" className="inline-block mt-4 text-sm hover:underline" style={{ color: leagueColor }}>← Volver al inicio</Link>
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
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center w-10 sm:w-14 font-bold" style={{ color: leagueColor }}>Pts</th>
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
                          <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-xs sm:text-sm" style={{ color: leagueColor }}>{s.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "scorers" && (
                scorers.length > 0
                  ? renderPlayerTable(scorers, "Goles")
                  : (
                    <div className="p-8 sm:p-12 text-center">
                      <span className="text-4xl mb-3 block">⚽</span>
                      <p className="text-silver text-sm">Goleadores no disponibles para esta liga</p>
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
