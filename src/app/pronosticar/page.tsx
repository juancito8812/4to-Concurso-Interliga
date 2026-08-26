"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  match_date: string;
  matchweek: number;
}

interface Player {
  id: string;
  name: string;
  team: string;
  league: string;
  position: string;
}

interface Scorer {
  player_name: string;
  goals: number;
  team: "home" | "away";
}

interface Prediction {
  match_id: string;
  home_score: number;
  away_score: number;
  scorers: Scorer[];
  prediction_id?: string;
}

interface TeamInfo {
  id: string;
  name: string;
  league: string;
  logo_url: string;
}

export default function PronosticarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [userTeam, setUserTeam] = useState<TeamInfo | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    // First fetch user's team
    const { data: profileData } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("user_id", user?.id)
      .single();

    if (!profileData?.team_id) {
      setLoading(false);
      return;
    }

    const { data: teamData } = await supabase
      .from("teams")
      .select("id, name, league, logo_url")
      .eq("id", profileData.team_id)
      .single();

    if (!teamData) {
      setLoading(false);
      return;
    }

    setUserTeam(teamData);

    // Fetch matches where user's team is playing (home or away)
    const { data: matchesData } = await supabase
      .from("matches")
      .select("*")
      .or(`home_team.eq.${teamData.name},away_team.eq.${teamData.name}`)
      .gte("match_date", new Date().toISOString().split("T")[0])
      .order("match_date", { ascending: true })
      .limit(10);

    if (matchesData) {
      setMatches(matchesData.slice(0, 3));

      // Fetch existing predictions with scorers
      const { data: predsData } = await supabase
        .from("predictions")
        .select("id, match_id, home_score, away_score")
        .eq("user_id", user?.id);

      if (predsData) {
        const predsMap: Record<string, Prediction> = {};
        
        for (const pred of predsData) {
          const { data: scorersData } = await supabase
            .from("prediction_scorers")
            .select("player_name, goals, team")
            .eq("prediction_id", pred.id);

          predsMap[pred.match_id] = {
            match_id: pred.match_id,
            home_score: pred.home_score,
            away_score: pred.away_score,
            scorers: scorersData || [],
            prediction_id: pred.id,
          };
        }
        
        setPredictions(predsMap);
      }
    }
    setLoading(false);
  };

  // Fetch players for the user's team and opponent
  useEffect(() => {
    if (userTeam && matches.length > 0) {
      const teamNames = new Set<string>();
      teamNames.add(userTeam.name);
      matches.forEach(m => {
        teamNames.add(m.home_team);
        teamNames.add(m.away_team);
      });

      supabase
        .from("players")
        .select("*")
        .in("team", Array.from(teamNames))
        .order("name")
        .then(({ data }) => {
          if (data) setPlayers(data);
        });
    }
  }, [userTeam, matches]);

  const getPlayersForTeam = (teamName: string) => {
    return players.filter(p => p.team === teamName);
  };

  const handleScoreChange = (matchId: string, field: "home_score" | "away_score", value: number) => {
    setPredictions((prev) => ({
      ...prev,
      [matchId]: {
        match_id: matchId,
        home_score: prev[matchId]?.home_score ?? 0,
        away_score: prev[matchId]?.away_score ?? 0,
        scorers: prev[matchId]?.scorers ?? [],
        prediction_id: prev[matchId]?.prediction_id,
        [field]: value,
      },
    }));
  };

  const addScorer = (matchId: string, team: "home" | "away") => {
    const current = predictions[matchId];
    const teamScorers = (current?.scorers ?? []).filter(s => s.team === team);
    
    if (teamScorers.length >= 3) return;

    setPredictions((prev) => ({
      ...prev,
      [matchId]: {
        match_id: matchId,
        home_score: prev[matchId]?.home_score ?? 0,
        away_score: prev[matchId]?.away_score ?? 0,
        scorers: [
          ...(prev[matchId]?.scorers ?? []),
          { player_name: "", goals: 1, team },
        ],
        prediction_id: prev[matchId]?.prediction_id,
      },
    }));
  };

  const updateScorer = (matchId: string, index: number, field: keyof Scorer, value: string | number) => {
    setPredictions((prev) => {
      const scorers = [...(prev[matchId]?.scorers ?? [])];
      scorers[index] = { ...scorers[index], [field]: value };
      return {
        ...prev,
        [matchId]: {
          match_id: matchId,
          home_score: prev[matchId]?.home_score ?? 0,
          away_score: prev[matchId]?.away_score ?? 0,
          scorers,
          prediction_id: prev[matchId]?.prediction_id,
        },
      };
    });
  };

  const removeScorer = (matchId: string, index: number) => {
    setPredictions((prev) => {
      const scorers = [...(prev[matchId]?.scorers ?? [])];
      scorers.splice(index, 1);
      return {
        ...prev,
        [matchId]: {
          match_id: matchId,
          home_score: prev[matchId]?.home_score ?? 0,
          away_score: prev[matchId]?.away_score ?? 0,
          scorers,
          prediction_id: prev[matchId]?.prediction_id,
        },
      };
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      for (const matchId of Object.keys(predictions)) {
        const pred = predictions[matchId];
        
        const { data: predData, error: predError } = await supabase
          .from("predictions")
          .upsert({
            user_id: user.id,
            match_id: matchId,
            home_score: pred.home_score,
            away_score: pred.away_score,
          }, { onConflict: "user_id,match_id" })
          .select("id")
          .single();

        if (predError) throw predError;

        if (predData) {
          await supabase
            .from("prediction_scorers")
            .delete()
            .eq("prediction_id", predData.id);

          if (pred.scorers.length > 0) {
            const scorersToInsert = pred.scorers
              .filter(s => s.player_name.trim() !== "")
              .map(s => ({
                prediction_id: predData.id,
                player_name: s.player_name,
                goals: s.goals,
                team: s.team,
              }));

            if (scorersToInsert.length > 0) {
              const { error: scorersError } = await supabase
                .from("prediction_scorers")
                .insert(scorersToInsert);

              if (scorersError) throw scorersError;
            }
          }
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4 flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!userTeam) {
    return (
      <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4 flex items-center justify-center">
        <div className="bg-navy-mid border border-border rounded-2xl p-8 text-center max-w-md">
          <span className="text-4xl mb-3 block">⚽</span>
          <p className="text-white text-sm font-bold mb-2">Elegí tu equipo primero</p>
          <p className="text-silver text-xs">Para pronosticar, primero seleccioná tu equipo en la página principal</p>
        </div>
      </div>
    );
  }

  const getMatchDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const getMatchTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header con equipo */}
        <div className="flex items-center gap-3 mb-6">
          <img
            src={userTeam.logo_url}
            alt={userTeam.name}
            className="w-12 h-12 rounded-full object-contain bg-white p-0.5"
          />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Pronosticar</h1>
            <p className="text-silver text-sm">{userTeam.name} — Próximos 3 partidos</p>
          </div>
        </div>

        {matches.length === 0 ? (
          <div className="bg-navy-mid border border-border rounded-2xl p-8 text-center">
            <span className="text-4xl mb-3 block">📅</span>
            <p className="text-silver text-sm">No hay partidos programados para {userTeam.name}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => {
              const pred = predictions[match.id];
              const isExpanded = expandedMatch === match.id;
              const homeScorers = (pred?.scorers ?? []).filter(s => s.team === "home");
              const awayScorers = (pred?.scorers ?? []).filter(s => s.team === "away");
              const homePlayers = getPlayersForTeam(match.home_team);
              const awayPlayers = getPlayersForTeam(match.away_team);

              return (
                <div key={match.id} className="bg-navy-mid border border-border rounded-xl overflow-hidden">
                  {/* Match Header */}
                  <div className="p-4">
                    <div className="flex items-center justify-between text-silver text-xs mb-3">
                      <span>{getMatchDate(match.match_date)}</span>
                      <span className="bg-navy-card px-2 py-0.5 rounded">{getMatchTime(match.match_date)}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-white text-sm font-medium flex-1 text-right">{match.home_team}</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={pred?.home_score ?? ""}
                        onChange={(e) => handleScoreChange(match.id, "home_score", parseInt(e.target.value) || 0)}
                        className="w-14 bg-navy-card border border-border rounded-lg px-2 py-2 text-center text-white text-sm font-bold focus:outline-none focus:border-gold"
                      />
                      <span className="text-gold text-xs font-bold px-2">VS</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={pred?.away_score ?? ""}
                        onChange={(e) => handleScoreChange(match.id, "away_score", parseInt(e.target.value) || 0)}
                        className="w-14 bg-navy-card border border-border rounded-lg px-2 py-2 text-center text-white text-sm font-bold focus:outline-none focus:border-gold"
                      />
                      <span className="text-white text-sm font-medium flex-1">{match.away_team}</span>
                    </div>

                    {(homeScorers.length > 0 || awayScorers.length > 0) && (
                      <div className="flex justify-center gap-4 mt-3">
                        {homeScorers.length > 0 && (
                          <span className="text-[10px] text-gold">⚽ {homeScorers.length} goleador{homeScorers.length > 1 ? "es" : ""}</span>
                        )}
                        {awayScorers.length > 0 && (
                          <span className="text-[10px] text-gold">⚽ {awayScorers.length} goleador{awayScorers.length > 1 ? "es" : ""}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expand/Collapse Button */}
                  <button
                    onClick={() => setExpandedMatch(isExpanded ? null : match.id)}
                    className="w-full bg-navy-card border-t border-border px-4 py-2 text-xs text-silver hover:text-white transition-colors flex items-center justify-center gap-2"
                  >
                    <span>{isExpanded ? "Ocultar goleadores" : "Agregar goleadores"}</span>
                    <span className={`transform transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                  </button>

                  {/* Expanded Scorer Section */}
                  {isExpanded && (
                    <div className="p-4 border-t border-border bg-navy-black/30">
                      {/* Home Team Scorers */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white text-xs font-medium">{match.home_team}</span>
                          {homeScorers.length < 3 && (
                            <button
                              onClick={() => addScorer(match.id, "home")}
                              className="text-gold text-[10px] hover:text-gold-light flex items-center gap-1"
                            >
                              <span>+</span> Agregar goleador
                            </button>
                          )}
                        </div>
                        {homeScorers.length === 0 ? (
                          <p className="text-silver text-[10px] italic">Sin goleadores seleccionados</p>
                        ) : (
                          <div className="space-y-2">
                            {(pred?.scorers ?? []).map((scorer, idx) => {
                              if (scorer.team !== "home") return null;
                              const globalIdx = pred?.scorers?.indexOf(scorer) ?? idx;
                              return (
                                <div key={idx} className="flex items-center gap-2">
                                  <select
                                    value={scorer.player_name}
                                    onChange={(e) => updateScorer(match.id, globalIdx, "player_name", e.target.value)}
                                    className="flex-1 bg-navy-card border border-border rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-gold"
                                  >
                                    <option value="">Seleccionar jugador</option>
                                    {homePlayers.map((player) => (
                                      <option key={player.id} value={player.name}>
                                        {player.name}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => updateScorer(match.id, globalIdx, "goals", Math.max(1, scorer.goals - 1))}
                                      className="w-6 h-6 bg-navy-card border border-border rounded text-silver text-xs hover:text-white"
                                    >
                                      -
                                    </button>
                                    <span className="text-gold text-xs font-bold w-6 text-center">{scorer.goals}</span>
                                    <button
                                      onClick={() => updateScorer(match.id, globalIdx, "goals", Math.min(10, scorer.goals + 1))}
                                      className="w-6 h-6 bg-navy-card border border-border rounded text-silver text-xs hover:text-white"
                                    >
                                      +
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => removeScorer(match.id, globalIdx)}
                                    className="text-red-400 text-xs hover:text-red-300"
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Away Team Scorers */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white text-xs font-medium">{match.away_team}</span>
                          {awayScorers.length < 3 && (
                            <button
                              onClick={() => addScorer(match.id, "away")}
                              className="text-gold text-[10px] hover:text-gold-light flex items-center gap-1"
                            >
                              <span>+</span> Agregar goleador
                            </button>
                          )}
                        </div>
                        {awayScorers.length === 0 ? (
                          <p className="text-silver text-[10px] italic">Sin goleadores seleccionados</p>
                        ) : (
                          <div className="space-y-2">
                            {(pred?.scorers ?? []).map((scorer, idx) => {
                              if (scorer.team !== "away") return null;
                              const globalIdx = pred?.scorers?.indexOf(scorer) ?? idx;
                              return (
                                <div key={idx} className="flex items-center gap-2">
                                  <select
                                    value={scorer.player_name}
                                    onChange={(e) => updateScorer(match.id, globalIdx, "player_name", e.target.value)}
                                    className="flex-1 bg-navy-card border border-border rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-gold"
                                  >
                                    <option value="">Seleccionar jugador</option>
                                    {awayPlayers.map((player) => (
                                      <option key={player.id} value={player.name}>
                                        {player.name}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => updateScorer(match.id, globalIdx, "goals", Math.max(1, scorer.goals - 1))}
                                      className="w-6 h-6 bg-navy-card border border-border rounded text-silver text-xs hover:text-white"
                                    >
                                      -
                                    </button>
                                    <span className="text-gold text-xs font-bold w-6 text-center">{scorer.goals}</span>
                                    <button
                                      onClick={() => updateScorer(match.id, globalIdx, "goals", Math.min(10, scorer.goals + 1))}
                                      className="w-6 h-6 bg-navy-card border border-border rounded text-silver text-xs hover:text-white"
                                    >
                                      +
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => removeScorer(match.id, globalIdx)}
                                    className="text-red-400 text-xs hover:text-red-300"
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <p className="text-silver text-[10px] mt-3 text-center">
                        Máximo 3 goleadores por equipo · Los goles se suman al marcador
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Save Button */}
            <div className="pt-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-xs">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
                  <p className="text-green-400 text-xs">¡Pronósticos guardados!</p>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-gold text-navy-black font-bold py-3 rounded-full text-sm hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar Pronósticos"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
