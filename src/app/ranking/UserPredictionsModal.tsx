"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  leagueColors,
  leagueLogos,
  normalizeMatchLeague,
  normalizeTeamName,
  matchIdToUuid,
  getKnockoutCupSlug,
  getKnockoutRound,
  isKnockoutMatch,
} from "@/lib/leagueConfig";
import { calculateScore, PredictedScorer, RealScorer } from "@/lib/scoring";
import { getUserCupSurvivors, TournamentSurvivor } from "@/lib/survivor";
import { loadData } from "@/lib/dataLoader";
import { fetchLiveFinishedMatches } from "@/lib/espnResultsFetcher";
import officialEvaluatedMatches from "@/data/officialEvaluatedMatches.json";
import officialEvaluatedPredictions from "@/data/officialEvaluatedPredictions.json";

export interface UserPredictionsModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  displayName?: string;
  teamName?: string;
  teamLogo?: string;
  rank?: number;
  totalPoints?: number;
  exactScores?: number;
}

interface MatchItem {
  id: string;
  home_team: string;
  away_team: string;
  match_date: string;
  league: string;
  home_logo?: string;
  away_logo?: string;
  result_home: number | null;
  result_away: number | null;
  scorers?: RealScorer[];
}

interface UserPredictionItem {
  id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  scorers: PredictedScorer[];
  earnedPoints: number | null;
  pointsDetails: string[];
  match: MatchItem | null;
  isLocked: boolean;
  isFinished: boolean;
}

export default function UserPredictionsModal({
  userId,
  isOpen,
  onClose,
  displayName,
  teamName,
  teamLogo,
  rank,
  totalPoints = 0,
  exactScores = 0,
}: UserPredictionsModalProps) {
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<UserPredictionItem[]>([]);
  const [survivors, setSurvivors] = useState<Record<string, TournamentSurvivor>>({});
  const [activeFilter, setActiveFilter] = useState<"all" | "evaluated" | "pending">("all");

  useEffect(() => {
    if (!isOpen || !userId) return;

    let isMounted = true;
    setLoading(true);

    const loadUserPredictions = async () => {
      try {
        // Parallel data fetch to avoid waterfalls
        const [
          officialFixtures,
          liveFinished,
          dbMatchesRes,
          userSurvivors,
          dbPredsRes,
        ] = await Promise.all([
          loadData<Array<{
            id: string;
            home_team: string;
            away_team: string;
            match_date: string;
            league: string;
            home_logo?: string;
            away_logo?: string;
          }>>("/data/officialFixtures.json").catch(() => []),
          fetchLiveFinishedMatches().catch(() => []),
          supabase
            .from("matches")
            .select("id, home_team, away_team, match_date, league, result_home, result_away"),
          getUserCupSurvivors(userId).catch(() => ({})),
          supabase
            .from("predictions")
            .select("id, user_id, match_id, home_score, away_score, points")
            .eq("user_id", userId),
        ]);

        if (isMounted && userSurvivors) {
          setSurvivors(userSurvivors);
        }

        // 1. Build matches map
        const matchesMap: Record<string, MatchItem> = {};

        // Official evaluated matches
        (officialEvaluatedMatches as Array<{
          id: string;
          home_team?: string;
          away_team?: string;
          match_date?: string;
          league?: string;
          result_home: number;
          result_away: number;
          scorers?: RealScorer[];
        }>).forEach((m) => {
          matchesMap[m.id] = {
            id: m.id,
            home_team: m.home_team ? normalizeTeamName(m.home_team) : "",
            away_team: m.away_team ? normalizeTeamName(m.away_team) : "",
            match_date: m.match_date || "",
            league: m.league || "Fútbol",
            result_home: m.result_home,
            result_away: m.result_away,
            scorers: m.scorers || [],
          };
        });

        // Add live finished matches
        if (Array.isArray(liveFinished)) {
          liveFinished.forEach((lm) => {
            matchesMap[lm.id] = {
              id: lm.id,
              home_team: normalizeTeamName(lm.home_team),
              away_team: normalizeTeamName(lm.away_team),
              match_date: lm.match_date,
              league: lm.league,
              result_home: lm.result_home,
              result_away: lm.result_away,
              scorers: lm.scorers || [],
            };
          });
        }

        // Add Supabase matches
        if (dbMatchesRes?.data) {
          dbMatchesRes.data.forEach((dm) => {
            const hNorm = normalizeTeamName(dm.home_team);
            const aNorm = normalizeTeamName(dm.away_team);
            matchesMap[dm.id] = {
              ...matchesMap[dm.id],
              id: dm.id,
              home_team: hNorm,
              away_team: aNorm,
              match_date: dm.match_date,
              league: normalizeMatchLeague(hNorm, aNorm, dm.match_date, dm.league),
              result_home: dm.result_home,
              result_away: dm.result_away,
            };
          });
        }

        // 2. Build User Predictions
        const userPreds: Array<{
          id: string;
          user_id: string;
          match_id: string;
          home_score: number;
          away_score: number;
          points?: number | null;
        }> = [];

        // Official evaluated predictions for this user
        (officialEvaluatedPredictions as Array<{
          id: string;
          user_id: string;
          match_id: string;
          home_score: number;
          away_score: number;
          points?: number | null;
        }>).forEach((op) => {
          if (op.user_id === userId) {
            userPreds.push(op);
          }
        });

        // Supabase predictions for this user
        if (dbPredsRes?.data) {
          dbPredsRes.data.forEach((p) => {
            const exists = userPreds.some(
              (up) => up.match_id === p.match_id || up.id === p.id
            );
            if (!exists) {
              userPreds.push(p);
            }
          });
        }

        // 3. Fetch Scorers
        const predIds = userPreds.map((p) => p.id);
        const scorersMap: Record<string, PredictedScorer[]> = {};

        (officialEvaluatedPredictions as Array<{
          id: string;
          scorers?: PredictedScorer[];
        }>).forEach((op) => {
          if (op.scorers && predIds.includes(op.id)) {
            scorersMap[op.id] = op.scorers;
          }
        });

        if (predIds.length > 0) {
          try {
            const { data: dbScorers } = await supabase
              .from("prediction_scorers")
              .select("prediction_id, player_name, goals, team")
              .in("prediction_id", predIds);

            if (dbScorers) {
              dbScorers.forEach((s) => {
                if (!scorersMap[s.prediction_id]) scorersMap[s.prediction_id] = [];
                const exists = scorersMap[s.prediction_id].some(
                  (x) => x.player_name === s.player_name && x.goals === s.goals
                );
                if (!exists) {
                  scorersMap[s.prediction_id].push({
                    player_name: s.player_name,
                    goals: s.goals,
                    team: s.team,
                  });
                }
              });
            }
          } catch (e) {
            console.warn("Scorers fetch error:", e);
          }
        }

        // 4. Construct items with score calculation and anti-copy rule
        const nowTime = Date.now();

        const items: UserPredictionItem[] = userPreds.map((pred) => {
          let match = matchesMap[pred.match_id];

          if (!match) {
            const uuid = matchIdToUuid(pred.match_id);
            if (matchesMap[uuid]) {
              match = matchesMap[uuid];
            }
          }

          // Fallback: lookup in official fixtures and join with evaluated matches by team names
          if (!match && Array.isArray(officialFixtures)) {
            const fixture = officialFixtures.find(
              (f) =>
                matchIdToUuid(f.id) === pred.match_id ||
                String(f.id) === pred.match_id ||
                f.id === pred.match_id
            );
            if (fixture) {
              const fh = normalizeTeamName(fixture.home_team).toLowerCase();
              const fa = normalizeTeamName(fixture.away_team).toLowerCase();

              // Check if this fixture matches an evaluated match in matchesMap by team names
              const evalMatch = Object.values(matchesMap).find((m) => {
                const mh = normalizeTeamName(m.home_team || "").toLowerCase();
                const ma = normalizeTeamName(m.away_team || "").toLowerCase();
                return (mh === fh && ma === fa) || (mh.includes(fh) && ma.includes(fa));
              });

              if (evalMatch) {
                match = {
                  ...evalMatch,
                  home_logo: fixture.home_logo || evalMatch.home_logo,
                  away_logo: fixture.away_logo || evalMatch.away_logo,
                };
              } else {
                match = {
                  id: pred.match_id,
                  home_team: fixture.home_team,
                  away_team: fixture.away_team,
                  match_date: fixture.match_date,
                  league: normalizeMatchLeague(fixture.home_team, fixture.away_team, fixture.match_date, fixture.league),
                  home_logo: fixture.home_logo,
                  away_logo: fixture.away_logo,
                  result_home: null,
                  result_away: null,
                };
              }
            }
          }

          // Direct search across all matchesMap by fixture if still not found
          if (!match) {
            const byName = Object.values(matchesMap).find(
              (m) => m.id === pred.match_id || matchIdToUuid(m.id) === pred.match_id
            );
            if (byName) match = byName;
          }

          const matchDateMs = match?.match_date ? new Date(match.match_date).getTime() : 0;
          const diffMin = matchDateMs > 0 ? (matchDateMs - nowTime) / (1000 * 60) : 0;
          
          // Un partido es finalizado si tiene resultado real cargado o si ya tiene puntos asignados
          const hasScore = match?.result_home !== null && match?.result_home !== undefined;
          const hasPoints = pred.points !== null && pred.points !== undefined;
          const isFinished = hasScore || hasPoints;

          // Regla Anti-Copia: Un partido se revela si ya finalizó, o si su hora de inicio ya pasó o falta <= 1 min
          const isPastOrLocked = matchDateMs > 0 ? diffMin <= 1 : true;
          const isLocked = isFinished || isPastOrLocked;

          const predScorers = scorersMap[pred.id] || [];

          let earnedPoints: number | null = pred.points ?? null;
          let details: string[] = [];

          if (match && match.result_home !== null && match.result_away !== null) {
            const breakdown = calculateScore(
              {
                home_score: pred.home_score,
                away_score: pred.away_score,
                scorers: predScorers,
              },
              {
                result_home: match.result_home,
                result_away: match.result_away,
                scorers: match.scorers || [],
              }
            );

            if (earnedPoints === null) {
              earnedPoints = breakdown.totalPoints;
            }
            details = breakdown.details;
          } else if (hasPoints && earnedPoints !== null && earnedPoints > 0 && details.length === 0) {
            details = [`Puntos oficiales asignados (+${earnedPoints} pts)`];
          }

          return {
            id: pred.id,
            match_id: pred.match_id,
            home_score: pred.home_score,
            away_score: pred.away_score,
            scorers: predScorers,
            earnedPoints,
            pointsDetails: details,
            match: match || null,
            isLocked,
            isFinished,
          };
        });

        // Sort: Finalizados con puntos primero, luego cronológicamente por fecha de partido
        items.sort((a, b) => {
          if (a.isFinished && !b.isFinished) return -1;
          if (!a.isFinished && b.isFinished) return 1;
          const dateA = a.match?.match_date ? new Date(a.match.match_date).getTime() : 0;
          const dateB = b.match?.match_date ? new Date(b.match.match_date).getTime() : 0;
          return dateB - dateA;
        });

        if (isMounted) {
          setPredictions(items);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading user predictions modal:", err);
        if (isMounted) setLoading(false);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUserPredictions();

    return () => {
      isMounted = false;
    };
  }, [isOpen, userId]);

  const filteredPredictions = useMemo(() => {
    if (activeFilter === "evaluated") {
      return predictions.filter((p) => p.isFinished);
    }
    if (activeFilter === "pending") {
      return predictions.filter((p) => !p.isFinished);
    }
    return predictions;
  }, [predictions, activeFilter]);

  if (!isOpen) return null;

  const getMatchDate = (dateStr: string) => {
    if (!dateStr) return "Fecha por confirmar";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? "Fecha por confirmar"
      : d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" }) +
          " · " +
          d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-navy-black/85 backdrop-blur-md animate-fadeIn">
      {/* Click outside to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-navy-mid border border-border/90 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 animate-scaleUp">
        
        {/* Header with User Info */}
        <div className="p-5 sm:p-6 bg-navy-card/90 border-b border-border/80 relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-navy-mid border border-border/60 text-silver hover:text-white hover:border-gold flex items-center justify-center transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            ✕
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-8">
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                {teamLogo ? (
                  <img
                    src={teamLogo}
                    alt={teamName || ""}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-contain bg-white p-1 border-2 border-gold shadow-md"
                  />
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-navy-mid border-2 border-gold flex items-center justify-center text-xl font-bold text-gold">
                    ⚽
                  </div>
                )}
                {rank && rank <= 3 && (
                  <span className="absolute -bottom-1 -right-1 text-xs">
                    {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-white">{displayName || "Participante"}</h2>
                  {rank && (
                    <span className="bg-gold/15 border border-gold/30 text-gold text-[11px] font-black px-2 py-0.5 rounded-full">
                      #{rank} Ranking
                    </span>
                  )}
                </div>
                <p className="text-silver text-xs font-medium">
                  {teamName ? `Club oficial: ${teamName}` : "Participante Interliga"}
                </p>
              </div>
            </div>

            {/* Quick Stats Pill */}
            <div className="flex items-center gap-3 bg-navy-dark/90 border border-border/80 px-3.5 py-2 rounded-2xl shrink-0 self-start sm:self-center">
              <div className="text-center">
                <span className="text-[10px] text-silver block uppercase font-bold">Puntos</span>
                <strong className="text-gold text-base sm:text-lg font-black font-mono leading-none">
                  {totalPoints}
                </strong>
              </div>
              <div className="w-px h-6 bg-border/60" />
              <div className="text-center">
                <span className="text-[10px] text-silver block uppercase font-bold">Plenos</span>
                <strong className="text-amber-300 text-base sm:text-lg font-black font-mono leading-none">
                  {exactScores}
                </strong>
              </div>
              <div className="w-px h-6 bg-border/60" />
              <div className="text-center">
                <span className="text-[10px] text-silver block uppercase font-bold">Pronósticos</span>
                <strong className="text-white text-base sm:text-lg font-black font-mono leading-none">
                  {predictions.length}
                </strong>
              </div>
            </div>
          </div>

          {/* Survivor Status Chips (if any) */}
          {Object.keys(survivors).length > 0 && (
            <div className="mt-3.5 pt-3 border-t border-border/40 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-silver uppercase tracking-wider">Copas KO:</span>
              {Object.entries(survivors).map(([slug, s]) => {
                const isAlive = s.status === "ALIVE";
                return (
                  <div
                    key={slug}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      isAlive
                        ? "bg-green/10 border-green/30 text-green"
                        : "bg-red-500/10 border-red-500/30 text-red-400"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isAlive ? "bg-green" : "bg-red-500"}`} />
                    <span className="capitalize">{slug}:</span>
                    <strong className="text-white font-bold">{s.active_team_name}</strong>
                    <span>({isAlive ? "VIVO" : "KO"})</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Filter Tabs Bar */}
        <div className="px-5 sm:px-6 py-2.5 bg-navy-mid/80 border-b border-border/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeFilter === "all"
                  ? "bg-gold text-navy-black shadow-sm"
                  : "text-silver hover:text-white"
              }`}
            >
              Todos ({predictions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("evaluated")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeFilter === "evaluated"
                  ? "bg-gold text-navy-black shadow-sm"
                  : "text-silver hover:text-white"
              }`}
            >
              Evaluados ({predictions.filter((p) => p.isFinished).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("pending")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeFilter === "pending"
                  ? "bg-gold text-navy-black shadow-sm"
                  : "text-silver hover:text-white"
              }`}
            >
              Pendientes ({predictions.filter((p) => !p.isFinished).length})
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-silver/70">
            <span>🔒 Regla Anti-Copia activa</span>
          </div>
        </div>

        {/* Predictions List (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-silver">Cargando pronósticos y desglose de puntos...</p>
            </div>
          ) : filteredPredictions.length === 0 ? (
            <div className="py-12 text-center bg-navy-card/40 rounded-2xl border border-border/40 p-6">
              <span className="text-4xl block mb-2 text-silver/40">📋</span>
              <p className="text-sm font-bold text-white mb-1">Sin pronósticos en esta categoría</p>
              <p className="text-xs text-silver">
                {activeFilter === "evaluated"
                  ? "Este usuario aún no tiene partidos finalizados con puntuación calculada."
                  : activeFilter === "pending"
                  ? "No hay pronósticos pendientes por jugarse."
                  : "Este participante no tiene pronósticos registrados en el sistema."}
              </p>
            </div>
          ) : (
            filteredPredictions.map((item) => {
              const match = item.match;
              const league = match?.league || "Fútbol";
              const leagueColor = leagueColors[league] || "#c9a84c";
              const leagueLogo = leagueLogos[league] || "";

              const cupSlug = getKnockoutCupSlug(league);
              const isKnockout =
                match &&
                !!cupSlug &&
                isKnockoutMatch(match.home_team, match.away_team, match.league, match.match_date);
              const knockoutRound =
                isKnockout && cupSlug && match ? getKnockoutRound(match.match_date, cupSlug) : null;

              return (
                <div
                  key={item.id}
                  className={`bg-navy-card/70 border rounded-2xl overflow-hidden shadow-md transition-all ${
                    item.isFinished
                      ? "border-border/80 hover:border-gold/50"
                      : item.isLocked
                      ? "border-amber-500/30 bg-navy-card/50"
                      : "border-border/40 bg-navy-card/30"
                  }`}
                >
                  {/* Top Competition Bar */}
                  <div
                    className="px-3.5 py-1.5 flex items-center justify-between text-[11px] font-bold border-b border-border/40"
                    style={{ backgroundColor: `${leagueColor}15` }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {leagueLogo && (
                        <img
                          src={leagueLogo}
                          alt=""
                          className="w-4 h-4 object-contain shrink-0"
                        />
                      )}
                      <span className="truncate uppercase" style={{ color: leagueColor }}>
                        {league}
                      </span>
                      {knockoutRound && (
                        <>
                          <span className="text-border">·</span>
                          <span className="text-gold text-[10px] font-bold uppercase truncate">
                            {knockoutRound}
                          </span>
                        </>
                      )}
                      <span className="text-border">·</span>
                      <span className="text-silver/80 text-[10px] font-normal truncate">
                        {getMatchDate(match?.match_date || "")}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {item.isFinished ? (
                        <span className="inline-flex items-center gap-1 bg-green/15 border border-green/30 text-green text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                          {item.earnedPoints !== null ? `+${item.earnedPoints} PTS` : "Evaluado"}
                        </span>
                      ) : item.isLocked ? (
                        <span className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                          ⏱️ En Juego / Cerrado
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 bg-navy-mid border border-border/80 text-silver text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                          title="Protegido por la regla anti-copia"
                        >
                          🔒 Abierto (Oculto)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Match & Scores Section */}
                  <div className="p-3.5 sm:p-4">
                    <div className="flex items-center justify-between gap-2 sm:gap-4">
                      {/* Home Team */}
                      <div className="flex-1 min-w-0 flex items-center justify-end gap-2">
                        <span className="text-white text-xs sm:text-sm font-bold text-right truncate">
                          {match?.home_team || "Equipo Local"}
                        </span>
                      </div>

                      {/* Prediction vs Real Score Box */}
                      <div className="flex flex-col items-center justify-center shrink-0 px-2 sm:px-4 py-1.5 rounded-xl bg-navy-mid border border-border/70 min-w-[110px] text-center">
                        {item.isLocked ? (
                          <>
                            <span className="text-xs text-silver font-semibold mb-0.5 block">
                              Pronóstico
                            </span>
                            <span className="text-lg sm:text-xl font-black text-gold font-mono leading-none">
                              {item.home_score} - {item.away_score}
                            </span>
                            {item.isFinished && match?.result_home !== null && match?.result_home !== undefined && (
                              <div className="mt-1 pt-1 border-t border-border/50 text-[11px] text-silver font-mono">
                                Real: <strong className="text-white font-bold">{match.result_home} - {match.result_away}</strong>
                              </div>
                            )}
                          </>
                        ) : (
                          /* Anti-Copy Hidden State */
                          <div className="py-1">
                            <span className="text-base text-gold block font-mono">🔒 ? - ?</span>
                            <span className="text-[10px] text-silver/80 block mt-0.5 leading-tight">
                              Anti-copia activa
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="flex-1 min-w-0 flex items-center justify-start gap-2">
                        <span className="text-white text-xs sm:text-sm font-bold text-left truncate">
                          {match?.away_team || "Equipo Visitante"}
                        </span>
                      </div>
                    </div>

                    {/* Scorers & Itemized Points Breakdown */}
                    {item.isLocked ? (
                      <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                        {/* Scorers predicted */}
                        {item.scorers && item.scorers.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap text-xs">
                            <span className="text-[11px] text-silver font-semibold">Goleadores:</span>
                            {item.scorers.map((s, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 bg-navy-mid border border-border/70 px-2 py-0.5 rounded-md text-white text-[11px] font-medium"
                              >
                                <span>⚽</span>
                                <strong>{s.player_name}</strong>
                                {s.goals > 1 && <span className="text-gold font-bold">({s.goals})</span>}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Breakdown Pills (Repartición de puntos) */}
                        {item.pointsDetails && item.pointsDetails.length > 0 ? (
                          <div className="space-y-1 mt-2">
                            <span className="text-[10px] font-bold text-silver uppercase tracking-wider block">
                              Repartición de Puntos:
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.pointsDetails.map((detail, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gold/10 border border-gold/25 text-gold-light text-[11px] font-semibold"
                                >
                                  <span>✓</span>
                                  {detail}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : item.isFinished ? (
                          <div className="text-[11px] text-silver/60 italic pt-1">
                            Sin aciertos de puntos en este partido (+0 pts).
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      /* Anti-copy info notice */
                      <div className="mt-2.5 pt-2 border-t border-border/30 text-center">
                        <p className="text-[11px] text-silver/70">
                          🛡️ Los marcadores y goleadores se revelarán automáticamente 1 minuto antes del inicio del partido.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-navy-card/90 border-t border-border/80 flex items-center justify-between gap-3 text-xs text-silver">
          <span>Total de pronósticos: <strong className="text-white">{predictions.length}</strong></span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-navy-mid hover:bg-gold hover:text-navy-black text-white font-bold rounded-xl border border-border/80 hover:border-gold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
