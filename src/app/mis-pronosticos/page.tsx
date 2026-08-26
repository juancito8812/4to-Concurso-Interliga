"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

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

const leagueColors: Record<string, string> = {
  "Premier League": "#3d195b",
  "LaLiga": "#ee8707",
  "Serie A": "#024494",
  "Bundesliga": "#d20515",
  "Champions League": "#1a4b8e",
  "Europa League": "#f37920",
};

const leagueLogos: Record<string, string> = {
  "Premier League": "/4to-Concurso-Interliga/logos/premier.png",
  "LaLiga": "/4to-Concurso-Interliga/logos/laliga.png",
  "Serie A": "/4to-Concurso-Interliga/logos/seriea.png",
  "Bundesliga": "/4to-Concurso-Interliga/logos/bundesliga.png",
  "Champions League": "/4to-Concurso-Interliga/logos/champions.png",
  "Europa League": "/4to-Concurso-Interliga/logos/europa.png",
};

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
    if (user) {
      fetchPredictions();
    }
  }, [user]);

  const fetchPredictions = async () => {
    const { data: predsData } = await supabase
      .from("predictions")
      .select("id, match_id, home_score, away_score, points")
      .eq("user_id", user?.id);

    if (!predsData || predsData.length === 0) {
      setLoading(false);
      return;
    }

    const matchIds = predsData.map(p => p.match_id);
    const { data: matchesData } = await supabase
      .from("matches")
      .select("id, home_team, away_team, match_date, result_home, result_away, league")
      .in("id", matchIds);

    const matchesMap: Record<string, any> = {};
    if (matchesData) {
      matchesData.forEach(m => { matchesMap[m.id] = m; });
    }

    const allTeamNames = new Set<string>();
    if (matchesData) {
      matchesData.forEach(m => {
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
      teamsData.forEach(t => { teamsMap[t.name] = t.logo_url || ""; });
    }

    const predIds = predsData.map(p => p.id);
    const { data: scorersData } = await supabase
      .from("prediction_scorers")
      .select("prediction_id, player_name, goals, team")
      .in("prediction_id", predIds);

    const scorersMap: Record<string, ScorerInfo[]> = {};
    if (scorersData) {
      scorersData.forEach(s => {
        if (!scorersMap[s.prediction_id]) scorersMap[s.prediction_id] = [];
        scorersMap[s.prediction_id].push(s);
      });
    }

    const result: PredictionWithMatch[] = predsData.map(pred => {
      const match = matchesMap[pred.match_id];
      return {
        id: pred.id,
        match_id: pred.match_id,
        home_score: pred.home_score,
        away_score: pred.away_score,
        points: pred.points,
        home_team: match?.home_team || "",
        away_team: match?.away_team || "",
        match_date: match?.match_date || "",
        result_home: match?.result_home,
        result_away: match?.result_away,
        league: match?.league || "",
        home_logo: teamsMap[match?.home_team] || "",
        away_logo: teamsMap[match?.away_team] || "",
        scorers: scorersMap[pred.id] || [],
      };
    });

    result.sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());
    setPredictions(result);
    setLoading(false);
  };

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
                      <div className="mt-2 text-center">
                        <span className="text-silver text-xs">Resultado: {p.result_home} - {p.result_away}</span>
                        {p.points !== null && (
                          <span className="ml-2 text-gold text-xs font-bold">+{p.points} pts</span>
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
