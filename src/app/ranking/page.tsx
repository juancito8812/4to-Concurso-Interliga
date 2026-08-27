"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { calculateScore, PredictedScorer } from "@/lib/scoring";

interface RankingEntry {
  user_id: string;
  display_name: string;
  total_points: number;
  exact_scores: number;
  predictions_count: number;
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
  result_home: number | null;
  result_away: number | null;
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

export default function RankingPage() {
  const { user } = useAuth();
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchRankings = async () => {
      try {
        // 1. Fetch profiles
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

        // 3. Fetch matches
        const { data: matchesData } = await supabase
          .from("matches")
          .select("id, result_home, result_away");

        const matchesMap: Record<string, MatchRow> = {};
        if (matchesData) {
          (matchesData as MatchRow[]).forEach((m) => {
            matchesMap[m.id] = m;
          });
        }

        // 4. Fetch predictions
        const { data: predsData } = await supabase
          .from("predictions")
          .select("id, user_id, match_id, home_score, away_score, points");

        // 5. Fetch prediction scorers
        const { data: scorersData } = await supabase
          .from("prediction_scorers")
          .select("prediction_id, player_name, goals, team");

        const scorersMap: Record<string, PredictedScorer[]> = {};
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

        const userStats: Record<
          string,
          {
            user_id: string;
            display_name: string;
            total_points: number;
            exact_scores: number;
            predictions_count: number;
            team_name?: string;
            team_logo?: string;
          }
        > = {};

        // Initialize with all profiles so users with 0 points also appear
        Object.entries(profilesMap).forEach(([uid, prof]) => {
          userStats[uid] = {
            user_id: uid,
            display_name: prof.name,
            total_points: 0,
            exact_scores: 0,
            predictions_count: 0,
            team_name: prof.team_name,
            team_logo: prof.team_logo,
          };
        });

        if (predsData) {
          (predsData as PredictionRow[]).forEach((p) => {
            if (!userStats[p.user_id]) {
              const prof = profilesMap[p.user_id];
              userStats[p.user_id] = {
                user_id: p.user_id,
                display_name: prof?.name || "Participante",
                total_points: 0,
                exact_scores: 0,
                predictions_count: 0,
                team_name: prof?.team_name,
                team_logo: prof?.team_logo,
              };
            }

            userStats[p.user_id].predictions_count += 1;

            const match = matchesMap[p.match_id];
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
                }
              );

              if (breakdown.exactScore) {
                userStats[p.user_id].exact_scores += 1;
              }

              if (pts === null) {
                pts = breakdown.totalPoints;
              }
            }

            userStats[p.user_id].total_points += pts || 0;
          });
        }

        const sorted: RankingEntry[] = Object.values(userStats)
          .sort((a, b) => {
            if (b.total_points !== a.total_points) {
              return b.total_points - a.total_points;
            }
            if (b.exact_scores !== a.exact_scores) {
              return b.exact_scores - a.exact_scores;
            }
            return a.display_name.localeCompare(b.display_name);
          })
          .map((entry, i) => ({
            ...entry,
            rank: i + 1,
          }));

        if (isMounted) {
          setRankings(sorted);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading rankings:", err);
        if (isMounted) setLoading(false);
      }
    };

    fetchRankings();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-8 sm:pb-12 px-3 sm:px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-silver hover:text-white mb-4 sm:mb-6 transition-colors text-sm"
        >
          <span className="text-gold">←</span> Volver al inicio
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              Ranking <span className="text-gold">General</span>
            </h1>
            <p className="text-silver text-xs sm:text-sm">
              Tabla de posiciones del 4° Concurso Interliga
            </p>
          </div>
          <div className="flex items-center gap-2 bg-navy-mid border border-border px-3 py-1.5 rounded-full text-xs text-silver self-start sm:self-auto">
            <span>👥 Participantes:</span>
            <strong className="text-gold font-bold">{rankings.length}</strong>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="inline-block w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-silver text-xs">Cargando clasificación en vivo...</p>
          </div>
        ) : rankings.length === 0 ? (
          <div className="bg-navy-mid border border-border rounded-2xl p-8 sm:p-12 text-center">
            <span className="text-4xl mb-3 block">🏆</span>
            <h3 className="text-white text-base font-semibold mb-1">Todavía no hay participantes</h3>
            <p className="text-silver text-xs sm:text-sm mb-4">
              ¡Sé el primero en registrarte y enviar tus pronósticos!
            </p>
            <Link
              href="/registro/"
              className="inline-block bg-gold text-navy-black font-bold px-6 py-2.5 rounded-full text-xs hover:bg-gold-light transition-colors"
            >
              Registrarme ahora
            </Link>
          </div>
        ) : (
          <div className="bg-navy-mid border border-border rounded-xl sm:rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[340px]">
                <thead>
                  <tr className="border-b border-border text-[10px] sm:text-xs text-silver uppercase bg-navy-card/40">
                    <th className="px-3 sm:px-4 py-3 text-center w-12 sm:w-16">Puesto</th>
                    <th className="px-3 sm:px-4 py-3 text-left">Participante</th>
                    <th className="hidden sm:table-cell px-4 py-3 text-center w-24">Pronósticos</th>
                    <th className="hidden sm:table-cell px-4 py-3 text-center w-24">Plenos</th>
                    <th className="px-3 sm:px-4 py-3 text-center w-20 sm:w-24 font-bold text-gold">
                      Puntos
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((r) => {
                    const isCurrentUser = user && user.id === r.user_id;
                    return (
                      <tr
                        key={r.user_id}
                        className={`border-b border-border/50 transition-colors ${
                          isCurrentUser
                            ? "bg-gold/10 hover:bg-gold/15 border-gold/30"
                            : "hover:bg-navy-card/60"
                        }`}
                      >
                        <td className="px-3 sm:px-4 py-3 text-center">
                          <span
                            className={`text-sm sm:text-base font-black ${
                              r.rank === 1
                                ? "text-gold"
                                : r.rank === 2
                                ? "text-silver"
                                : r.rank === 3
                                ? "text-amber-600"
                                : "text-silver/70"
                            }`}
                          >
                            {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {r.team_logo ? (
                              <img
                                src={r.team_logo}
                                alt={r.team_name || ""}
                                className="w-6 h-6 rounded-full object-contain bg-white p-0.5 shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-navy-card border border-border flex items-center justify-center text-[10px] text-silver shrink-0">
                                ⚽
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-white text-xs sm:text-sm font-semibold truncate block">
                                  {r.display_name}
                                </span>
                                {isCurrentUser && (
                                  <span className="text-[9px] bg-gold text-navy-black font-extrabold px-1.5 py-0.2 rounded shrink-0">
                                    TÚ
                                  </span>
                                )}
                              </div>
                              {r.team_name && (
                                <span className="text-[11px] text-silver/80 truncate block">
                                  {r.team_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 text-center text-silver text-xs">
                          {r.predictions_count}
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 text-center text-silver text-xs">
                          {r.exact_scores > 0 ? (
                            <span className="text-gold font-semibold">{r.exact_scores} 🎯</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-center">
                          <span className="text-gold font-extrabold text-sm sm:text-base font-mono">
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
        )}
      </div>
    </div>
  );
}
