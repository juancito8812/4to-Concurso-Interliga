"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { calculateScore, PredictedScorer, RealScorer } from "@/lib/scoring";
import { normalizeTeamName, matchIdToUuid } from "@/lib/leagueConfig";
import officialEvaluatedMatches from "@/data/officialEvaluatedMatches.json";
import officialEvaluatedPredictions from "@/data/officialEvaluatedPredictions.json";
import officialFixtures from "@/data/officialFixtures.json";
import { fetchLiveFinishedMatches } from "@/lib/espnResultsFetcher";

interface RankingEntry {
  user_id: string;
  display_name: string;
  total_points: number;
  exact_scores: number;
  predictions_count: number;
  correct_signs: number;
  scorer_hits: number;
  team_name?: string;
  team_logo?: string;
  rank: number;
}

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  team_id: string | null;
}

interface TeamRow {
  id: string;
  name: string;
  logo_url: string | null;
}

interface MatchRow {
  id: string;
  home_team?: string;
  away_team?: string;
  result_home: number | null;
  result_away: number | null;
  scorers?: RealScorer[];
}

interface PredictionRow {
  id: string;
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  points: number | null;
}

interface ScorerRow {
  prediction_id: string;
  player_name: string;
  goals: number;
  team: string;
}

let cachedRankingsData: { timestamp: number; data: RankingEntry[] } | null = null;
const CACHE_TTL_MS = 25000; // 25s client-side cache to protect Free Tier egress & CPU

export default function RankingPage() {
  const { user, displayName } = useAuth();
  const [rankings, setRankings] = useState<RankingEntry[]>(() => cachedRankingsData?.data || []);
  const [loading, setLoading] = useState(() => !cachedRankingsData?.data?.length);
  const [activeTab, setActiveTab] = useState<"general" | "plenos" | "efectividad">("general");
  const [searchTerm, setSearchTerm] = useState("");
  const [showRulesModal, setShowRulesModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchRankings = async () => {
      // Check cache first
      if (cachedRankingsData && Date.now() - cachedRankingsData.timestamp < CACHE_TTL_MS) {
        if (isMounted) {
          setRankings(cachedRankingsData.data);
          setLoading(false);
        }
        return;
      }

      try {
        // 1. Fetch profiles from Supabase
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name, team_id");

        // 2. Fetch teams
        const { data: teamsData } = await supabase
          .from("teams")
          .select("id, name, logo_url");

        const teamsMap: Record<string, { name: string; logo_url: string }> = {};
        if (teamsData) {
          (teamsData as TeamRow[]).forEach((t) => {
            teamsMap[t.id] = { name: t.name, logo_url: t.logo_url || "" };
          });
        }

        const profilesMap: Record<string, { name: string; team_name?: string; team_logo?: string }> = {};
        if (profilesData) {
          (profilesData as ProfileRow[]).forEach((p) => {
            const team = p.team_id ? teamsMap[p.team_id] : undefined;
            profilesMap[p.user_id] = {
              name: p.display_name?.trim() || "Participante",
              team_name: team?.name,
              team_logo: team?.logo_url,
            };
          });
        }

        // 3. Fetch evaluated matches (from bundle and Supabase)
        const matchesMap: Record<string, MatchRow> = {};
        
        // 1. Load official evaluated fixtures first
        (officialEvaluatedMatches as Array<{ id: string; home_team?: string; away_team?: string; result_home: number; result_away: number; scorers?: RealScorer[] }>).forEach((m) => {
          matchesMap[m.id] = {
            id: m.id,
            home_team: m.home_team ? normalizeTeamName(m.home_team) : undefined,
            away_team: m.away_team ? normalizeTeamName(m.away_team) : undefined,
            result_home: m.result_home,
            result_away: m.result_away,
            scorers: m.scorers,
          };
        });

        // 2. Fetch live finished matches from ESPN API
        try {
          const liveFinished = await fetchLiveFinishedMatches();
          liveFinished.forEach((lm) => {
            matchesMap[lm.id] = {
              id: lm.id,
              home_team: normalizeTeamName(lm.home_team),
              away_team: normalizeTeamName(lm.away_team),
              result_home: lm.result_home,
              result_away: lm.result_away,
              scorers: lm.scorers,
            };
          });
        } catch (e) {
          console.warn("Could not fetch live finished matches from ESPN:", e);
        }

        const { data: matchesData } = await supabase
          .from("matches")
          .select("id, result_home, result_away")
          .not("result_home", "is", null);

        if (matchesData) {
          (matchesData as MatchRow[]).forEach((m) => {
            if (m.result_home === null || m.result_away === null) return;
            matchesMap[m.id] = {
              ...matchesMap[m.id],
              id: m.id,
              result_home: m.result_home,
              result_away: m.result_away,
            };
          });
        }

        // 4. Fetch predictions (combine Supabase + official evaluated predictions)
        const allPredictions: PredictionRow[] = [];
        
        // Include official evaluated predictions
        (officialEvaluatedPredictions as Array<{ id: string; user_id: string; match_id: string; home_score: number; away_score: number }>).forEach((p) => {
          allPredictions.push({
            id: p.id,
            user_id: p.user_id,
            match_id: p.match_id,
            home_score: p.home_score,
            away_score: p.away_score,
            points: null,
          });
        });

        const { data: predsData } = await supabase
          .from("predictions")
          .select("id, user_id, match_id, home_score, away_score, points");

        if (predsData) {
          (predsData as PredictionRow[]).forEach((p) => {
            if (!allPredictions.some((ap) => ap.user_id === p.user_id && ap.match_id === p.match_id)) {
              allPredictions.push(p);
            }
          });
        }

        // 5. Fetch prediction scorers
        const scorersMap: Record<string, PredictedScorer[]> = {};
        
        // Include official evaluated scorers
        (officialEvaluatedPredictions as Array<{ id: string; scorers?: PredictedScorer[] }>).forEach((p) => {
          if (p.scorers) {
            scorersMap[p.id] = p.scorers;
          }
        });

        const { data: scorersData } = await supabase
          .from("prediction_scorers")
          .select("prediction_id, player_name, goals, team");

        if (scorersData) {
          (scorersData as ScorerRow[]).forEach((s) => {
            if (!scorersMap[s.prediction_id]) scorersMap[s.prediction_id] = [];
            scorersMap[s.prediction_id].push({
              player_name: s.player_name,
              goals: s.goals,
              team: s.team,
            });
          });
        }

        const userStats: Record<string, RankingEntry> = {};

        // Initialize with real profiles from Supabase
        Object.entries(profilesMap).forEach(([uid, prof]) => {
          userStats[uid] = {
            user_id: uid,
            display_name: prof.name,
            total_points: 0,
            exact_scores: 0,
            predictions_count: 0,
            correct_signs: 0,
            scorer_hits: 0,
            team_name: prof.team_name,
            team_logo: prof.team_logo,
            rank: 0,
          };
        });

        // Compute points from all predictions
        if (allPredictions && allPredictions.length > 0) {
          allPredictions.forEach((p) => {
            if (!userStats[p.user_id]) {
              const prof = profilesMap[p.user_id];
              userStats[p.user_id] = {
                user_id: p.user_id,
                display_name: prof?.name || "Participante",
                total_points: 0,
                exact_scores: 0,
                predictions_count: 0,
                correct_signs: 0,
                scorer_hits: 0,
                team_name: prof?.team_name,
                team_logo: prof?.team_logo,
                rank: 0,
              };
            }

            userStats[p.user_id].predictions_count += 1;

            let match = matchesMap[p.match_id];

            // Fallback: join by fixture team names when the prediction id is orphaned
            if (!match) {
              const fixture = officialFixtures.find(
                (f) => matchIdToUuid(f.id) === p.match_id || String(f.id) === p.match_id
              );
              if (fixture) {
                const fh = normalizeTeamName(fixture.home_team).toLowerCase();
                const fa = normalizeTeamName(fixture.away_team).toLowerCase();
                const byName = Object.values(matchesMap).find((m) => {
                  const mh = normalizeTeamName(m.home_team || "").toLowerCase();
                  const ma = normalizeTeamName(m.away_team || "").toLowerCase();
                  return (mh === fh && ma === fa) || (mh.includes(fh) && ma.includes(fa));
                });
                if (byName) match = byName;
              }
            }

            let pts = p.points;

            if (match && match.result_home !== null && match.result_away !== null) {
              const breakdown = calculateScore(
                {
                  home_score: p.home_score,
                  away_score: p.away_score,
                  scorers: scorersMap[p.id] || [],
                },
                {
                  result_home: match.result_home,
                  result_away: match.result_away,
                  scorers: match.scorers || [],
                }
              );

              if (breakdown.exactScore) {
                userStats[p.user_id].exact_scores += 1;
              }
              if (breakdown.correctSign) {
                userStats[p.user_id].correct_signs += 1;
              }
              userStats[p.user_id].scorer_hits += breakdown.scorersNameHits;

              if (pts === null) {
                pts = breakdown.totalPoints;
              }
            }

            userStats[p.user_id].total_points += pts || 0;
          });
        }

        // Check if current user has local storage predictions & team info
        if (user && typeof window !== "undefined") {
          try {
            const rawLocal = localStorage.getItem(`interliga_predictions_${user.id}`);
            const rawTeam = localStorage.getItem(`interliga_user_team_${user.id}`);
            const localTeam = rawTeam ? JSON.parse(rawTeam) : null;

            if (!userStats[user.id]) {
              userStats[user.id] = {
                user_id: user.id,
                display_name: displayName || user.user_metadata?.display_name || user.email?.split("@")[0] || "Mi Usuario",
                total_points: 0,
                exact_scores: 0,
                predictions_count: 0,
                correct_signs: 0,
                scorer_hits: 0,
                team_name: localTeam?.name || undefined,
                team_logo: localTeam?.logo_url || undefined,
                rank: 0,
              };
            }

            if (rawLocal) {
              const localPreds = JSON.parse(rawLocal);
              const predCount = Object.keys(localPreds).length;
              if (predCount > userStats[user.id].predictions_count) {
                userStats[user.id].predictions_count = predCount;
              }
            }
          } catch {
            // Ignore local storage parse error
          }
        }

        // 100% Real Live Rankings
        const realUsersList = Object.values(userStats);

        // Sort by total points (desc), then exact scores (desc), then predictions count (desc)
        const sorted = realUsersList
          .sort((a, b) => {
            if (b.total_points !== a.total_points) return b.total_points - a.total_points;
            if (b.exact_scores !== a.exact_scores) return b.exact_scores - a.exact_scores;
            if (b.predictions_count !== a.predictions_count) return b.predictions_count - a.predictions_count;
            return a.display_name.localeCompare(b.display_name);
          })
          .map((entry, i) => ({
            ...entry,
            rank: i + 1,
          }));

        cachedRankingsData = { timestamp: Date.now(), data: sorted };

        if (isMounted) {
          setRankings(sorted);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading rankings:", err);
        if (isMounted) {
          setRankings([]);
          setLoading(false);
        }
      }
    };

    fetchRankings();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Filtered rankings according to search and active tab
  const displayedRankings = useMemo(() => {
    let list = [...rankings];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.display_name.toLowerCase().includes(q) ||
          (r.team_name && r.team_name.toLowerCase().includes(q))
      );
    }

    if (activeTab === "plenos") {
      return [...list].sort((a, b) => b.exact_scores - a.exact_scores || b.total_points - a.total_points);
    }

    if (activeTab === "efectividad") {
      return [...list].sort((a, b) => {
        const rateA = a.predictions_count > 0 ? a.total_points / a.predictions_count : 0;
        const rateB = b.predictions_count > 0 ? b.total_points / b.predictions_count : 0;
        return rateB - rateA;
      });
    }

    return list;
  }, [rankings, searchTerm, activeTab]);

  // Current user ranking entry
  const currentUserEntry = useMemo(() => {
    if (!user) return null;
    return rankings.find((r) => r.user_id === user.id) || null;
  }, [user, rankings]);

  const leaderEntry = rankings.length > 0 ? rankings[0] : null;

  // Podium participants (Top 3)
  const top1 = rankings[0];
  const top2 = rankings[1];
  const top3 = rankings[2];

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-12 sm:pb-16 px-3 sm:px-4 lg:px-6">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-silver hover:text-white mb-2 transition-colors text-xs font-semibold uppercase tracking-wider"
            >
              <span className="text-gold font-bold">←</span> Volver al inicio
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>🏆 Ranking <span className="text-gold">General</span></span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gold/15 text-gold border border-gold/30 tracking-normal">
                OFICIAL
              </span>
            </h1>
            <p className="text-silver text-xs sm:text-sm mt-1">
              Clasificación en vivo del 4° Concurso Interliga · Sistema oficial de puntuación
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="bg-navy-mid/90 border border-border px-3.5 py-2 rounded-xl text-center">
              <span className="text-[10px] text-silver block uppercase tracking-wider font-semibold">Participantes</span>
              <strong className="text-white text-base sm:text-lg font-bold font-mono">{rankings.length}</strong>
            </div>
            <div className="bg-navy-mid/90 border border-border px-3.5 py-2 rounded-xl text-center">
              <span className="text-[10px] text-silver block uppercase tracking-wider font-semibold">Líder Actual</span>
              <strong className="text-gold text-base sm:text-lg font-bold font-mono">
                {leaderEntry ? `${leaderEntry.total_points} pts` : "—"}
              </strong>
            </div>
            <button
              onClick={() => setShowRulesModal(!showRulesModal)}
              className="bg-navy-card hover:bg-navy-card/80 border border-border/80 text-silver hover:text-white px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <span>ℹ️</span> Reglas de Puntos
            </button>
          </div>
        </div>

        {/* Rules & Points Accordion Banner */}
        {showRulesModal && (
          <div className="bg-navy-mid border border-gold/30 rounded-2xl p-5 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
                <span>📖</span> Sistema Oficial de Asignación de Puntos
              </h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="text-silver hover:text-white text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div className="bg-navy-dark/70 border border-border/60 p-3 rounded-xl">
                <span className="text-gold font-bold block text-sm mb-1">+3 PUNTOS</span>
                <p className="text-white font-semibold mb-0.5">Signo 1X2</p>
                <p className="text-silver text-[11px]">Acertar Local, Empate o Visitante</p>
              </div>
              <div className="bg-navy-dark/70 border border-border/60 p-3 rounded-xl">
                <span className="text-gold font-bold block text-sm mb-1">+2 PUNTOS</span>
                <p className="text-white font-semibold mb-0.5">Marcador Exacto</p>
                <p className="text-silver text-[11px]">Pleno exacto del resultado final</p>
              </div>
              <div className="bg-navy-dark/70 border border-border/60 p-3 rounded-xl">
                <span className="text-gold font-bold block text-sm mb-1">+1 PUNTO</span>
                <p className="text-white font-semibold mb-0.5">Diferencia de 1 gol</p>
                <p className="text-silver text-[11px]">Cuando no es exacto pero falla por 1 gol</p>
              </div>
              <div className="bg-navy-dark/70 border border-border/60 p-3 rounded-xl">
                <span className="text-gold font-bold block text-sm mb-1">+1 PUNTO</span>
                <p className="text-white font-semibold mb-0.5">Goleador Acertado</p>
                <p className="text-silver text-[11px]">Por cada goleador que anote en el partido</p>
              </div>
              <div className="bg-navy-dark/70 border border-border/60 p-3 rounded-xl">
                <span className="text-gold font-bold block text-sm mb-1">+2 PUNTOS</span>
                <p className="text-white font-semibold mb-0.5">Goles Exactos</p>
                <p className="text-silver text-[11px]">Acertar la cantidad de goles del autor</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="inline-block w-10 h-10 border-3 border-gold border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-silver text-sm">Cargando clasificación y resultados oficiales...</p>
          </div>
        ) : rankings.length === 0 ? (
          <div className="bg-navy-mid border border-border rounded-2xl p-8 sm:p-12 text-center space-y-4 my-8 shadow-xl">
            <span className="text-5xl block mb-2">🏆</span>
            <h3 className="text-xl sm:text-2xl font-bold text-white">¡Comienza la competencia en vivo!</h3>
            <p className="text-silver text-sm max-w-md mx-auto leading-relaxed">
              Aún no hay participantes con pronósticos evaluados en la tabla. ¡Elegí tu equipo, enviá tus pronósticos y sé el primero en liderar el ranking oficial!
            </p>
            <Link
              href="/pronosticar/"
              className="inline-block bg-gold text-navy-black font-bold px-6 py-2.5 rounded-full text-xs hover:bg-gold-light transition-all shadow-md mt-2"
            >
              Ir a Pronosticar
            </Link>
          </div>
        ) : (
          <>
            {/* Top 3 Champions Podium (Espectacular Visual Showcase) */}
            {top1 && (
              <div className="relative pt-6 pb-2">
                <div className="text-center mb-5">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gold/80 block">
                    ⚡ ZONA DE CAMPEONES
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white">Podio de Honor</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-end">
                  
                  {/* 2nd Place (Silver) */}
                  {top2 && (
                    <div className="order-2 md:order-1 bg-gradient-to-b from-navy-mid to-navy-dark border border-slate-400/40 rounded-2xl p-5 text-center shadow-lg relative flex flex-col items-center group hover:border-slate-300 transition-all">
                      <div className="absolute -top-3.5 bg-slate-300 text-navy-black font-extrabold text-[11px] px-3 py-0.5 rounded-full shadow">
                        🥈 2° PUESTO
                      </div>
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white border-2 border-slate-300 p-1.5 shadow-md flex items-center justify-center mb-3 mt-1">
                        {top2.team_logo ? (
                          <img
                            src={top2.team_logo}
                            alt=""
                            width={48}
                            height={48}
                            loading="lazy"
                            decoding="async"
                            className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
                          />
                        ) : (
                          <span className="text-2xl">⚽</span>
                        )}
                      </div>
                      <h4 className="text-white font-bold text-base sm:text-lg truncate max-w-full mb-0.5">
                        {top2.display_name}
                      </h4>
                      <p className="text-silver text-xs truncate max-w-full mb-3">{top2.team_name || "Interliga FC"}</p>
                      
                      <div className="w-full bg-navy-card/80 border border-border/60 rounded-xl p-2.5 flex items-center justify-around text-xs">
                        <div>
                          <span className="text-silver block text-[10px]">Puntos</span>
                          <strong className="text-white font-bold font-mono text-sm sm:text-base">{top2.total_points}</strong>
                        </div>
                        <div className="w-px h-6 bg-border/60" />
                        <div>
                          <span className="text-silver block text-[10px]">Plenos</span>
                          <strong className="text-gold font-bold font-mono text-sm sm:text-base">{top2.exact_scores} 🎯</strong>
                        </div>
                      </div>
                      <div className="mt-3 text-[10px] text-slate-300 font-semibold uppercase tracking-wide">
                        🥈 Premio: Balón Oficial
                      </div>
                    </div>
                  )}

                  {/* 1st Place (Gold Champion - Elevated Center) */}
                  <div className="order-1 md:order-2 bg-gradient-to-b from-navy-card via-navy-mid to-navy-dark border-2 border-gold rounded-3xl p-6 text-center shadow-[0_0_40px_rgba(201,168,76,0.25)] relative flex flex-col items-center transform md:-translate-y-2">
                    <div className="absolute -top-5 bg-gradient-to-r from-gold via-amber-300 to-gold text-navy-black font-black text-xs sm:text-sm px-4 py-1 rounded-full shadow-lg flex items-center gap-1.5 tracking-wide">
                      <span>👑</span> 1° GRAN LÍDER
                    </div>
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white border-4 border-gold p-2 shadow-xl flex items-center justify-center mb-3 mt-2 relative">
                      <div className="absolute -top-3 -right-2 text-2xl animate-bounce">👑</div>
                      {top1.team_logo ? (
                        <img
                          src={top1.team_logo}
                          alt=""
                          width={60}
                          height={60}
                          loading="lazy"
                          decoding="async"
                          className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                        />
                      ) : (
                        <span className="text-3xl">🏆</span>
                      )}
                    </div>
                    <h3 className="text-white font-black text-lg sm:text-xl truncate max-w-full mb-0.5">
                      {top1.display_name}
                    </h3>
                    <p className="text-gold-light text-xs sm:text-sm font-semibold truncate max-w-full mb-3.5">
                      {top1.team_name || "Interliga FC"}
                    </p>

                    <div className="w-full bg-navy-dark/90 border border-gold/40 rounded-2xl p-3 flex items-center justify-around text-xs shadow-inner">
                      <div>
                        <span className="text-silver block text-[10px] uppercase font-bold">Puntos Totales</span>
                        <strong className="text-gold font-black font-mono text-xl sm:text-2xl">{top1.total_points}</strong>
                      </div>
                      <div className="w-px h-8 bg-gold/30" />
                      <div>
                        <span className="text-silver block text-[10px] uppercase font-bold">Plenos Exactos</span>
                        <strong className="text-amber-300 font-black font-mono text-xl sm:text-2xl">{top1.exact_scores} 🎯</strong>
                      </div>
                    </div>
                    <div className="mt-3.5 text-[11px] text-gold font-bold uppercase tracking-wider bg-gold/10 px-3 py-1 rounded-full border border-gold/30">
                      🏆 Camiseta + Balón + Corona
                    </div>
                  </div>

                  {/* 3rd Place (Bronze) */}
                  {top3 && (
                    <div className="order-3 bg-gradient-to-b from-navy-mid to-navy-dark border border-amber-700/50 rounded-2xl p-5 text-center shadow-lg relative flex flex-col items-center group hover:border-amber-600 transition-all">
                      <div className="absolute -top-3.5 bg-amber-700 text-white font-extrabold text-[11px] px-3 py-0.5 rounded-full shadow">
                        🥉 3° PUESTO
                      </div>
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white border-2 border-amber-700 p-1.5 shadow-md flex items-center justify-center mb-3 mt-1">
                        {top3.team_logo ? (
                          <img
                            src={top3.team_logo}
                            alt=""
                            width={48}
                            height={48}
                            loading="lazy"
                            decoding="async"
                            className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
                          />
                        ) : (
                          <span className="text-2xl">⚽</span>
                        )}
                      </div>
                      <h4 className="text-white font-bold text-base sm:text-lg truncate max-w-full mb-0.5">
                        {top3.display_name}
                      </h4>
                      <p className="text-silver text-xs truncate max-w-full mb-3">{top3.team_name || "Interliga FC"}</p>

                      <div className="w-full bg-navy-card/80 border border-border/60 rounded-xl p-2.5 flex items-center justify-around text-xs">
                        <div>
                          <span className="text-silver block text-[10px]">Puntos</span>
                          <strong className="text-white font-bold font-mono text-sm sm:text-base">{top3.total_points}</strong>
                        </div>
                        <div className="w-px h-6 bg-border/60" />
                        <div>
                          <span className="text-silver block text-[10px]">Plenos</span>
                          <strong className="text-gold font-bold font-mono text-sm sm:text-base">{top3.exact_scores} 🎯</strong>
                        </div>
                      </div>
                      <div className="mt-3 text-[10px] text-amber-500 font-semibold uppercase tracking-wide">
                        🥉 Premio: Gorra Oficial
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

            {/* Current User Status Banner (Personal Position Card) */}
            {currentUserEntry && (
              <div className="bg-gradient-to-r from-navy-card via-navy-mid to-navy-card border-2 border-gold/50 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 w-full sm:w-auto">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-gold p-1 flex items-center justify-center shrink-0 shadow">
                    {currentUserEntry.team_logo ? (
                      <img
                        src={currentUserEntry.team_logo}
                        alt=""
                        width={36}
                        height={36}
                        loading="lazy"
                        decoding="async"
                        className="w-9 h-9 object-contain"
                      />
                    ) : (
                      <span className="text-xl">⭐</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-base">{currentUserEntry.display_name}</span>
                      <span className="bg-gold text-navy-black font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                        TU PERFIL
                      </span>
                    </div>
                    <p className="text-silver text-xs">
                      {currentUserEntry.team_name ? `Hincha de ${currentUserEntry.team_name}` : "Participante Interliga"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 justify-between sm:justify-end w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-border/40">
                  <div className="text-center">
                    <span className="text-silver text-[10px] uppercase font-bold block">Puesto</span>
                    <strong className="text-gold text-lg sm:text-xl font-black font-mono">#{currentUserEntry.rank}</strong>
                  </div>
                  <div className="text-center">
                    <span className="text-silver text-[10px] uppercase font-bold block">Puntos</span>
                    <strong className="text-white text-lg sm:text-xl font-black font-mono">{currentUserEntry.total_points}</strong>
                  </div>
                  <div className="text-center">
                    <span className="text-silver text-[10px] uppercase font-bold block">Plenos</span>
                    <strong className="text-amber-300 text-lg sm:text-xl font-black font-mono">{currentUserEntry.exact_scores} 🎯</strong>
                  </div>
                  <Link
                    href="/pronosticar/"
                    className="bg-gold hover:bg-gold-light text-navy-black font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md shrink-0"
                  >
                    Pronosticar →
                  </Link>
                </div>
              </div>
            )}

            {/* Filter and Tab Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-navy-mid/70 border border-border/80 p-2.5 rounded-2xl">
              
              {/* Tab Selector */}
              <div className="flex items-center gap-1 w-full sm:w-auto bg-navy-dark p-1 rounded-xl border border-border/50">
                <button
                  onClick={() => setActiveTab("general")}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "general"
                      ? "bg-gold text-navy-black shadow"
                      : "text-silver hover:text-white"
                  }`}
                >
                  🏆 General
                </button>
                <button
                  onClick={() => setActiveTab("plenos")}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "plenos"
                      ? "bg-gold text-navy-black shadow"
                      : "text-silver hover:text-white"
                  }`}
                >
                  🎯 Más Plenos
                </button>
                <button
                  onClick={() => setActiveTab("efectividad")}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "efectividad"
                      ? "bg-gold text-navy-black shadow"
                      : "text-silver hover:text-white"
                  }`}
                >
                  ⚡ Efectividad
                </button>
              </div>

              {/* Search Bar */}
              <div className="w-full sm:w-64 relative">
                <input
                  type="text"
                  placeholder="Buscar participante o club..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-navy-dark border border-border/70 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-silver/60 focus:outline-none focus:border-gold transition-colors pl-8"
                />
                <span className="absolute left-2.5 top-2 text-xs text-silver">🔍</span>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1.5 text-xs text-silver hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Complete Leaderboard Table */}
            <div className="bg-navy-mid border border-border rounded-2xl overflow-hidden shadow-xl content-visibility-auto">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-[10px] sm:text-[11px] text-silver uppercase bg-navy-card/60 tracking-wider">
                      <th className="px-2 sm:px-4 py-3 text-center w-9 sm:w-16">#</th>
                      <th className="px-2 sm:px-4 py-3 text-left">Participante & Club</th>
                      <th className="hidden sm:table-cell px-3 sm:px-4 py-3.5 text-center w-20">PJ</th>
                      <th className="hidden sm:table-cell px-3 sm:px-4 py-3.5 text-center w-24">Plenos</th>
                      <th className="hidden sm:table-cell px-3 sm:px-4 py-3.5 text-center w-24">Signos</th>
                      <th className="hidden md:table-cell px-3 sm:px-4 py-3.5 text-center w-24">Goleadores</th>
                      <th className="px-3 sm:px-6 py-3 text-right sm:text-center w-16 sm:w-28 font-black text-gold">PTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {displayedRankings.map((r, index) => {
                      const isCurrentUser = user && user.id === r.user_id;
                      const displayRank = activeTab === "general" ? r.rank : index + 1;

                      return (
                        <tr
                          key={r.user_id}
                          className={`transition-colors ${
                            isCurrentUser
                              ? "bg-gold/10 hover:bg-gold/15 border-l-4 border-l-gold"
                              : displayRank <= 3
                              ? "hover:bg-navy-card/70 bg-navy-mid/40"
                              : "hover:bg-navy-card/50"
                          }`}
                        >
                          {/* Puesto */}
                          <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-center">
                            <span
                              className={`text-xs sm:text-base font-black font-mono ${
                                displayRank === 1
                                  ? "text-gold"
                                  : displayRank === 2
                                  ? "text-slate-300"
                                  : displayRank === 3
                                  ? "text-amber-600"
                                  : "text-silver/80"
                              }`}
                            >
                              {displayRank === 1 ? "🥇" : displayRank === 2 ? "🥈" : displayRank === 3 ? "🥉" : displayRank}
                            </span>
                          </td>

                          {/* Participante & Club */}
                          <td className="px-2 sm:px-4 py-3 sm:py-3.5">
                            <div className="flex items-center gap-2 sm:gap-3">
                              {r.team_logo ? (
                                <img
                                  src={r.team_logo}
                                  alt=""
                                  width={28}
                                  height={28}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-contain bg-white p-0.5 shrink-0 shadow-sm"
                                />
                              ) : (
                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-navy-card border border-border flex items-center justify-center text-xs text-silver shrink-0">
                                  ⚽
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-white text-xs sm:text-sm font-bold truncate block">
                                    {r.display_name}
                                  </span>
                                  {isCurrentUser && (
                                    <span className="text-[9px] bg-gold text-navy-black font-black px-1.5 py-0.2 rounded-full shrink-0">
                                      TÚ
                                    </span>
                                  )}
                                  {displayRank === 1 && (
                                    <span className="text-[10px] text-gold shrink-0">👑</span>
                                  )}
                                </div>
                                {r.team_name && (
                                  <span className="text-[10px] sm:text-[11px] text-silver/80 truncate block">
                                    {r.team_name}
                                  </span>
                                )}
                                {/* Mobile-only compact stats chips */}
                                <div className="flex sm:hidden items-center gap-2 mt-0.5 text-[10px] text-silver/70 font-mono">
                                  <span>{r.predictions_count} PJ</span>
                                  {r.exact_scores > 0 && (
                                    <span className="text-gold font-semibold">{r.exact_scores} 🎯</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* PJ (Pronósticos Jugados) - Desktop/Tablet */}
                          <td className="hidden sm:table-cell px-3 sm:px-4 py-3.5 text-center text-silver text-xs font-mono">
                            {r.predictions_count}
                          </td>

                          {/* Plenos - Desktop/Tablet */}
                          <td className="hidden sm:table-cell px-3 sm:px-4 py-3.5 text-center">
                            {r.exact_scores > 0 ? (
                              <span className="text-gold font-bold font-mono text-xs sm:text-sm bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">
                                {r.exact_scores} 🎯
                              </span>
                            ) : (
                              <span className="text-silver/50 text-xs">—</span>
                            )}
                          </td>

                          {/* Signos */}
                          <td className="hidden sm:table-cell px-3 sm:px-4 py-3.5 text-center text-silver text-xs font-mono">
                            {r.correct_signs > 0 ? `${r.correct_signs} ✅` : "—"}
                          </td>

                          {/* Goleadores */}
                          <td className="hidden md:table-cell px-3 sm:px-4 py-3.5 text-center text-silver text-xs font-mono">
                            {r.scorer_hits > 0 ? `${r.scorer_hits} ⚽` : "—"}
                          </td>

                          {/* Puntos Totales */}
                          <td className="px-3 sm:px-6 py-3 sm:py-3.5 text-right sm:text-center">
                            <span className="text-gold font-black text-xs sm:text-base font-mono bg-navy-dark/90 px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-xl border border-gold/30 shadow-inner inline-block min-w-[38px] sm:min-w-[50px] text-center">
                              {r.total_points}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Motivation and Prizes Footer Card */}
            <div className="bg-gradient-to-r from-navy-mid via-navy-card to-navy-mid border border-border/80 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center md:text-left">
                <span className="text-xs font-bold text-gold uppercase tracking-wider">¿Listo para subir al podio?</span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Envía tus pronósticos de la próxima fecha
                </h3>
                <p className="text-silver text-xs sm:text-sm max-w-xl">
                  Cada marcador exacto te otorga 2 puntos extra y cada signo correcto te da 3 puntos. ¡No dejes pasar ninguna jornada!
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href="/pronosticar/"
                  className="bg-gold hover:bg-gold-light text-navy-black font-extrabold px-6 py-3 rounded-full text-xs sm:text-sm transition-all shadow-lg hover:scale-105 flex items-center gap-2"
                >
                  <span>⚽</span> Pronosticar Ahora
                </Link>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
