"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { leagueColors, leagueLogos, normalizeMatchLeague, normalizeTeamName, matchIdToUuid } from "@/lib/leagueConfig";
import { calculateScore } from "@/lib/scoring";
import officialFixtures from "@/data/officialFixtures.json";

interface ScorerInfo {
  player_name: string;
  goals: number;
  team: string;
}

interface PredictionWithMatch {
  id: string;
  home_score: number;
  away_score: number;
  points: number | null;
  pointsDetails?: string[];
  match_id: string;
  home_team: string;
  away_team: string;
  match_date: string;
  result_home: number | null;
  result_away: number | null;
  league: string;
  home_logo: string;
  away_logo: string;
  scorers: ScorerInfo[];
}

export default function MisPronosticosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [predictions, setPredictions] = useState<PredictionWithMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const fetchPredictions = async () => {
      const { data: predsData } = await supabase
        .from("predictions")
        .select("id, match_id, home_score, away_score, points")
        .eq("user_id", user.id);

      if (!predsData || predsData.length === 0) {
        if (isMounted) setLoading(false);
        return;
      }

      const matchIds = predsData.map((p) => p.match_id);
      const { data: matchesData } = await supabase
        .from("matches")
        .select("id, home_team, away_team, match_date, result_home, result_away, league")
        .in("id", matchIds);

      interface MatchData {
        id: string;
        home_team: string;
        away_team: string;
        match_date: string;
        result_home: number | null;
        result_away: number | null;
        league: string;
      }

      const matchesMap: Record<string, MatchData> = {};
      if (matchesData) {
        (matchesData as MatchData[]).forEach((m) => {
          matchesMap[m.id] = m;
        });
      }

      const allTeamNames = new Set<string>();
      if (matchesData) {
        matchesData.forEach((m) => {
          allTeamNames.add(m.home_team);
          allTeamNames.add(m.away_team);
        });
      }

      const { data: teamsData } = await supabase
        .from("teams")
        .select("name, logo_url")
        .in("name", Array.from(allTeamNames));

      const teamsMap: Record<string, string> = {};
      if (teamsData) {
        teamsData.forEach((t) => {
          teamsMap[t.name] = t.logo_url || "";
        });
      }

      // Also resolve official fixtures for any match_id not found in supabase matches table
      for (const pred of predsData) {
        if (!matchesMap[pred.match_id]) {
          const found = officialFixtures.find(
            (f) => matchIdToUuid(f.id) === pred.match_id || String(f.id) === pred.match_id
          );
          if (found) {
            const homeNorm = normalizeTeamName(found.home_team);
            const awayNorm = normalizeTeamName(found.away_team);
            matchesMap[pred.match_id] = {
              id: pred.match_id,
              home_team: homeNorm,
              away_team: awayNorm,
              match_date: found.match_date,
              result_home: null,
              result_away: null,
              league: normalizeMatchLeague(homeNorm, awayNorm, found.match_date, found.league),
            };
            if (found.home_logo) teamsMap[homeNorm] = found.home_logo;
            if (found.away_logo) teamsMap[awayNorm] = found.away_logo;
          }
        }
      }

      const predIds = predsData.map((p) => p.id);
      const { data: scorersData } = await supabase
        .from("prediction_scorers")
        .select("prediction_id, player_name, goals, team")
        .in("prediction_id", predIds);

      const scorersMap: Record<string, ScorerInfo[]> = {};
      if (scorersData) {
        scorersData.forEach((s) => {
          if (!scorersMap[s.prediction_id]) scorersMap[s.prediction_id] = [];
          scorersMap[s.prediction_id].push(s);
        });
      }

      const result: PredictionWithMatch[] = predsData.map((pred) => {
        const match = matchesMap[pred.match_id];
        const matchScorers = scorersMap[pred.id] || [];

        let earnedPoints = pred.points;
        let details: string[] = [];

        if (match && match.result_home !== null && match.result_away !== null) {
          const breakdown = calculateScore(
            {
              home_score: pred.home_score,
              away_score: pred.away_score,
              scorers: matchScorers,
            },
            {
              result_home: match.result_home,
              result_away: match.result_away,
            }
          );
          if (earnedPoints === null) {
            earnedPoints = breakdown.totalPoints;
          }
          details = breakdown.details;
        }

        return {
          id: pred.id,
          match_id: pred.match_id,
          home_score: pred.home_score,
          away_score: pred.away_score,
          points: earnedPoints,
          pointsDetails: details,
          home_team: match?.home_team || "",
          away_team: match?.away_team || "",
          match_date: match?.match_date || "",
          result_home: match?.result_home,
          result_away: match?.result_away,
          league: normalizeMatchLeague(
            match?.home_team || "",
            match?.away_team || "",
            match?.match_date || "",
            match?.league || ""
          ),
          home_logo: teamsMap[match?.home_team] || "",
          away_logo: teamsMap[match?.away_team] || "",
          scorers: matchScorers,
        };
      });

      if (isMounted) {
        result.sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());
        setPredictions(result);
        setLoading(false);
      }
    };

    fetchPredictions();

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4 flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const totalPoints = predictions.reduce((sum, p) => sum + (p.points || 0), 0);

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-silver hover:text-white mb-4 transition-colors text-sm"><span className="text-gold">←</span> Volver al inicio</Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Mis Pronósticos</h1>
        <p className="text-silver text-sm mb-4">Historial de tus predicciones</p>

        <div className="bg-navy-mid border border-border rounded-xl p-4 mb-6 text-center">
          <span className="text-silver text-xs">Puntos totales</span>
          <p className="text-gold text-3xl font-bold">{totalPoints}</p>
        </div>

        {predictions.length === 0 ? (
          <div className="bg-navy-mid border border-border rounded-2xl p-8 text-center">
            <span className="text-4xl mb-3 block">📝</span>
            <p className="text-silver text-sm">Todavía no hiciste pronósticos</p>
            <Link href="/pronosticar/" className="inline-block mt-4 bg-gold text-navy-black font-bold px-6 py-2 rounded-full text-xs hover:bg-gold-light transition-colors">
              Ir a Pronosticar
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {predictions.map((p) => {
              return (
                <div key={p.id} className="relative p-5 sm:p-7 rounded-xl sm:rounded-2xl bg-navy-mid border border-border">
                    {p.league && (
                      <div className="flex items-center gap-1.5 mb-2">
                        {leagueLogos[p.league] && (
                          <img src={leagueLogos[p.league]} alt={p.league} className="w-4 h-4 object-contain" />
                        )}
                        <span className="text-[10px] font-medium" style={{ color: leagueColors[p.league] }}>{p.league}</span>
                      </div>
                    )}
                    <div className="text-silver text-xs mb-2">
                      {new Date(p.match_date).toLocaleDateString("es-AR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <span className="text-white text-sm font-medium">{p.home_team}</span>
                        {p.home_logo && (
                          <img src={p.home_logo} alt={p.home_team} className="w-8 h-8 rounded-full object-contain bg-white p-0.5" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mx-2">
                        <span className="text-gold font-bold text-lg">{p.home_score}</span>
                        <span className="text-silver text-xs">vs</span>
                        <span className="text-gold font-bold text-lg">{p.away_score}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        {p.away_logo && (
                          <img src={p.away_logo} alt={p.away_team} className="w-8 h-8 rounded-full object-contain bg-white p-0.5" />
                        )}
                        <span className="text-white text-sm font-medium">{p.away_team}</span>
                      </div>
                    </div>
                    {p.scorers.length > 0 && (
                      <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
                        {p.scorers.map((s, i) => (
                          <span key={i} className="text-[10px] text-gold">
                            ⚽ {s.player_name}{s.goals > 1 ? ` (${s.goals})` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                    {p.result_home !== null && (
                      <div className="mt-3 pt-3 border-t border-border/40 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1.5">
                          <span className="text-silver text-xs">
                            Resultado final: <strong className="text-white">{p.result_home} - {p.result_away}</strong>
                          </span>
                          {p.points !== null && (
                            <span className="bg-gold/15 border border-gold/30 text-gold text-xs font-bold px-2 py-0.5 rounded-full">
                              +{p.points} pts
                            </span>
                          )}
                        </div>
                        {p.pointsDetails && p.pointsDetails.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1.5 mt-1.5">
                            {p.pointsDetails.map((detail, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] bg-navy-dark/90 text-silver border border-border/60 px-2 py-0.5 rounded-md"
                              >
                                ✓ {detail}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
