"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getEspnStandings,
  getEspnScorers,
  getEspnScoreboard,
  Standing,
  PlayerStat,
  CupMatch,
} from "@/lib/espnApi";
import { getStandings, getScorers, FDScorer } from "@/lib/footballData";
import { leagueColors, leagueLogos } from "@/lib/leagueConfig";

const leagueData: Record<string, { name: string; fdCode: string; country: string; isCup?: boolean }> = {
  premier: { name: "Premier League", fdCode: "PL", country: "GBR" },
  laliga: { name: "LaLiga", fdCode: "PD", country: "ESP" },
  seriea: { name: "Serie A", fdCode: "SA", country: "ITA" },
  bundesliga: { name: "Bundesliga", fdCode: "BL1", country: "GER" },
  champions: { name: "Champions League", fdCode: "CL", country: "EUR" },
  europa: { name: "Europa League", fdCode: "EL", country: "EUR" },
  conference: { name: "Conference League", fdCode: "ECL", country: "EUR" },
  coppaitalia: { name: "Copa Italia", fdCode: "CI", country: "ITA", isCup: true },
};

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

type Tab = "standings" | "scorers" | "matches";

export default function TablaLigaClient() {
  const params = useParams();
  const league = params.league as string;
  const data = leagueData[league];
  const leagueColor = leagueColors[data?.name || ""] || "#c9a84c";
  const leagueLogo = leagueLogos[data?.name || ""] || "";

  const [standings, setStandings] = useState<Standing[]>([]);
  const [scorers, setScorers] = useState<PlayerStat[]>([]);
  const [cupMatches, setCupMatches] = useState<CupMatch[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>(data?.isCup ? "matches" : "standings");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const tabs: { id: Tab; label: string; icon: string }[] = data?.isCup
    ? [{ id: "matches", label: "Partidos", icon: "⚽" }]
    : [
        { id: "standings", label: "Tabla", icon: "📊" },
        { id: "scorers", label: "Goleadores", icon: "⚽" },
      ];

  useEffect(() => {
    if (!data) return;

    let isMounted = true;

    const fetchData = async () => {
      try {
        setError("");

        if (data.isCup) {
          // Cup competitions (e.g. Coppa Italia)
          const matches = await getEspnScoreboard(league);
          if (isMounted) {
            setCupMatches(matches);
            setActiveTab("matches");
          }
        } else {
          // League / Group stage competitions
          // 1. Fetch standings from ESPN API (CORS enabled & free)
          let parsedStandings = await getEspnStandings(league);

          // Fallback to football-data.org if ESPN returns empty
          if (parsedStandings.length === 0 && data.fdCode) {
            const fdStandings = await getStandings(data.fdCode);
            if (fdStandings.length > 0) {
              const table = fdStandings[0]?.table || [];
              parsedStandings = (table as FDTableEntry[]).map((entry) => ({
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
            }
          }

          if (isMounted) {
            if (parsedStandings.length > 0) {
              setStandings(parsedStandings);
            } else {
              setError("No se pudo cargar la clasificación en este momento.");
            }
          }

          // 2. Fetch top scorers
          let parsedScorers = await getEspnScorers(league);
          if (parsedScorers.length === 0 && data.fdCode) {
            const fdScorers = await getScorers(data.fdCode);
            if (fdScorers.length > 0) {
              parsedScorers = fdScorers.slice(0, 20).map((s: FDScorer, i: number) => ({
                rank: i + 1,
                name: s.player.name,
                team: s.team.shortName || s.team.name,
                value: s.goals,
              }));
            }
          }

          if (isMounted) {
            setScorers(parsedScorers);
          }
        }
      } catch (err) {
        console.error("Error fetching league data:", err);
        if (isMounted) {
          setError("Error al conectar con el servicio de datos en vivo");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [data, league]);

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

              {activeTab === "matches" && (
                cupMatches.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {cupMatches.map((m) => (
                      <div key={m.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-navy-card/50 transition-colors">
                        <div className="flex-1 w-full flex items-center justify-between sm:justify-start gap-4 sm:gap-6">
                          {/* Home team */}
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end text-right">
                            <span className="text-white text-xs sm:text-sm font-semibold truncate">{m.homeTeam}</span>
                            {m.homeLogo && <img src={m.homeLogo} alt="" className="w-6 h-6 object-contain" />}
                          </div>

                          {/* Score or VS */}
                          <div className="px-3 py-1 bg-navy-dark/80 rounded-lg border border-border/60 text-center min-w-[70px]">
                            {m.homeScore !== undefined && m.awayScore !== undefined ? (
                              <span className="text-sm sm:text-base font-bold text-gold font-mono">
                                {m.homeScore} - {m.awayScore}
                              </span>
                            ) : (
                              <span className="text-xs text-silver font-medium">VS</span>
                            )}
                          </div>

                          {/* Away team */}
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-start">
                            {m.awayLogo && <img src={m.awayLogo} alt="" className="w-6 h-6 object-contain" />}
                            <span className="text-white text-xs sm:text-sm font-semibold truncate">{m.awayTeam}</span>
                          </div>
                        </div>

                        {/* Status / Date */}
                        <div className="w-full sm:w-auto text-right sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-border/30">
                          <span className="text-[11px] text-silver block font-mono">
                            {new Date(m.date).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-[10px] text-gold/80 uppercase font-semibold">
                            {m.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 sm:p-12 text-center">
                    <span className="text-4xl mb-3 block">🏆</span>
                    <p className="text-silver text-sm">No hay partidos programados actualmente para esta copa.</p>
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
