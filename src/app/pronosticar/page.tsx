"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { leagueColors, leagueLogos } from "@/lib/leagueConfig";
import { getTeamMatches, FDMatch, findTeamId } from "@/lib/footballData";

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  match_date: string;
  league: string;
  home_logo?: string;
  away_logo?: string;
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
  home_score: string;
  away_score: string;
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
  const [teamLogos, setTeamLogos] = useState<Record<string, string>>({});
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [dataSource, setDataSource] = useState<"api" | "supabase">("api");

  const getLeagueName = (matchId: number): string => {
    if (matchId < 500000) return "Premier League";
    if (matchId < 600000) return "LaLiga";
    if (matchId < 700000) return "Serie A";
    if (matchId < 800000) return "Bundesliga";
    return "Champions League";
  };

  const fetchPlayersFromSupabase = async (teamNames: string[]) => {
    const { data: playersData } = await supabase
      .from("players")
      .select("*")
      .in("team", teamNames)
      .order("position")
      .order("name");

    if (playersData) setPlayers(playersData);
  };

  const fetchFromSupabase = async (teamData: TeamInfo) => {
    setDataSource("supabase");
    
    const { data: matchesData } = await supabase
      .from("matches")
      .select("*")
      .or(`home_team.eq.${teamData.name},away_team.eq.${teamData.name}`)
      .gte("match_date", new Date().toISOString().split("T")[0])
      .order("match_date", { ascending: true })
      .limit(10);

    if (matchesData) {
      setMatches(matchesData.slice(0, 3));

      const teamNames = new Set<string>();
      matchesData.slice(0, 3).forEach(m => {
        teamNames.add(m.home_team);
        teamNames.add(m.away_team);
      });

      const { data: teamsData } = await supabase
        .from("teams")
        .select("name, logo_url")
        .in("name", Array.from(teamNames));

      if (teamsData) {
        const logosMap: Record<string, string> = {};
        teamsData.forEach(t => { logosMap[t.name] = t.logo_url || ""; });
        setTeamLogos(logosMap);
      }

      const { data: playersData } = await supabase
        .from("players")
        .select("*")
        .in("team", Array.from(teamNames))
        .order("position")
        .order("name");

      if (playersData) setPlayers(playersData);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    let isMounted = true;

    const loadUserData = async () => {
      if (!user) {
        if (isMounted) setLoading(false);
        return;
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", user.id)
        .single();

      if (!profileData?.team_id) {
        if (isMounted) setLoading(false);
        return;
      }

      const { data: teamData } = await supabase
        .from("teams")
        .select("id, name, league, logo_url")
        .eq("id", profileData.team_id)
        .single();

      if (!teamData) {
        if (isMounted) setLoading(false);
        return;
      }

      if (isMounted) setUserTeam(teamData);

      const apiTeamId = findTeamId(teamData.name);

      if (apiTeamId && process.env.NEXT_PUBLIC_FOOTBALL_DATA_KEY && process.env.NEXT_PUBLIC_FOOTBALL_DATA_KEY !== "TU_API_KEY_AQUI") {
        try {
          const apiMatches = await getTeamMatches(apiTeamId, "SCHEDULED");

          if (apiMatches.length > 0 && isMounted) {
            setDataSource("api");
            const mappedMatches: Match[] = apiMatches.slice(0, 3).map((f: FDMatch) => ({
              id: String(f.id),
              home_team: f.homeTeam.name,
              away_team: f.awayTeam.name,
              match_date: f.utcDate,
              league: getLeagueName(f.id),
              home_logo: f.homeTeam.crest,
              away_logo: f.awayTeam.crest,
            }));
            setMatches(mappedMatches);

            const logos: Record<string, string> = {};
            apiMatches.forEach((f: FDMatch) => {
              logos[f.homeTeam.name] = f.homeTeam.crest;
              logos[f.awayTeam.name] = f.awayTeam.crest;
            });
            setTeamLogos(logos);

            const teamNames = new Set<string>();
            teamNames.add(teamData.name);
            apiMatches.forEach((f: FDMatch) => {
              teamNames.add(f.homeTeam.name);
              teamNames.add(f.awayTeam.name);
            });

            await fetchPlayersFromSupabase(Array.from(teamNames));
          } else {
            await fetchFromSupabase(teamData);
          }
        } catch (err) {
          console.error("football-data.org error, falling back to Supabase:", err);
          await fetchFromSupabase(teamData);
        }
      } else {
        await fetchFromSupabase(teamData);
      }

      const { data: predsData } = await supabase
        .from("predictions")
        .select("id, match_id, home_score, away_score")
        .eq("user_id", user.id);

      if (predsData && isMounted) {
        const predsMap: Record<string, Prediction> = {};
        for (const pred of predsData) {
          const { data: scorersData } = await supabase
            .from("prediction_scorers")
            .select("player_name, goals, team")
            .eq("prediction_id", pred.id);

          predsMap[pred.match_id] = {
            match_id: pred.match_id,
            home_score: pred.home_score === 0 ? "" : String(pred.home_score),
            away_score: pred.away_score === 0 ? "" : String(pred.away_score),
            scorers: scorersData || [],
            prediction_id: pred.id,
          };
        }
        setPredictions(predsMap);
      }

      if (isMounted) setLoading(false);
    };

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);
  const getPlayersForTeam = (teamName: string) => {
    return players.filter(p => p.team === teamName);
  };

  const handleScoreChange = (matchId: string, field: "home_score" | "away_score", value: string) => {
    if (value !== "" && (parseInt(value) < 0 || parseInt(value) > 20)) return;
    setPredictions((prev) => ({
      ...prev,
      [matchId]: {
        match_id: matchId,
        home_score: prev[matchId]?.home_score ?? "",
        away_score: prev[matchId]?.away_score ?? "",
        scorers: prev[matchId]?.scorers ?? [],
        prediction_id: prev[matchId]?.prediction_id,
        [field]: value,
      },
    }));
  };

  const ensureThreeScorers = (matchId: string, team: "home" | "away") => {
    setPredictions((prev) => {
      const current = prev[matchId];
      const scorers = [...(current?.scorers ?? [])];
      const teamScorers = scorers.filter(s => s.team === team);

      if (teamScorers.length >= 3) return prev;

      const needed = 3 - teamScorers.length;
      for (let i = 0; i < needed; i++) {
        scorers.push({ player_name: "", goals: 1, team });
      }

      return {
        ...prev,
        [matchId]: {
          match_id: matchId,
          home_score: current?.home_score ?? "",
          away_score: current?.away_score ?? "",
          scorers,
          prediction_id: current?.prediction_id,
        },
      };
    });
  };

  const updateScorer = (matchId: string, index: number, field: keyof Scorer, value: string | number) => {
    setPredictions((prev) => {
      const scorers = [...(prev[matchId]?.scorers ?? [])];
      scorers[index] = { ...scorers[index], [field]: value };
      return {
        ...prev,
        [matchId]: {
          match_id: matchId,
          home_score: prev[matchId]?.home_score ?? "",
          away_score: prev[matchId]?.away_score ?? "",
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
          home_score: prev[matchId]?.home_score ?? "",
          away_score: prev[matchId]?.away_score ?? "",
          scorers,
          prediction_id: prev[matchId]?.prediction_id,
        },
      };
    });
  };

  const handleExpand = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (match && isMatchLocked(matchId, match.match_date)) return;

    if (expandedMatch === matchId) {
      setExpandedMatch(null);
      return;
    }

    setExpandedMatch(matchId);

    const pred = predictions[matchId];
    const homeScorers = (pred?.scorers ?? []).filter(s => s.team === "home");
    const awayScorers = (pred?.scorers ?? []).filter(s => s.team === "away");

    if (homeScorers.length < 3) ensureThreeScorers(matchId, "home");
    if (awayScorers.length < 3) ensureThreeScorers(matchId, "away");
  };

  const isMatchLocked = (matchId: string, matchDate: string) => {
    const pred = predictions[matchId];
    const hasBeenSaved = !!pred?.prediction_id;
    const now = new Date();
    const matchTime = new Date(matchDate);
    const diffMs = matchTime.getTime() - now.getTime();
    const diffMin = diffMs / (1000 * 60);
    const within30Min = diffMin <= 30;
    return hasBeenSaved || within30Min;
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const unlockedMatches = Object.keys(predictions).filter(matchId => {
        const match = matches.find(m => m.id === matchId);
        return match && !isMatchLocked(matchId, match.match_date);
      });

      for (const matchId of unlockedMatches) {
        const pred = predictions[matchId];
        const homeScore = pred.home_score === "" ? 0 : parseInt(pred.home_score);
        const awayScore = pred.away_score === "" ? 0 : parseInt(pred.away_score);

        const { data: predData, error: predError } = await supabase
          .from("predictions")
          .upsert({
            user_id: user.id,
            match_id: matchId,
            home_score: homeScore,
            away_score: awayScore,
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError("Error al guardar: " + msg);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-silver text-xs">Cargando partidos...</p>
        </div>
      </div>
    );
  }

  if (!userTeam) {
    return (
      <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4 flex items-center justify-center">
        <div className="bg-navy-mid border border-border rounded-2xl p-10 text-center max-w-md">
          <span className="text-5xl mb-4 block">⚽</span>
          <p className="text-white text-base font-bold mb-2">Elegí tu equipo primero</p>
          <p className="text-silver text-sm mb-6">Para pronosticar, primero seleccioná tu equipo en la página principal</p>
          <Link
            href="/"
            className="inline-block bg-gold text-navy-black font-bold px-6 py-2.5 rounded-full text-sm hover:bg-gold-light transition-colors"
          >
            Ir al Inicio
          </Link>
        </div>
      </div>
    );
  }

  const getMatchDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
  };

  const getMatchTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-24 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-silver hover:text-white mb-5 transition-colors text-xs">
          <span className="text-gold">←</span> Volver al inicio
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <img
            src={userTeam.logo_url}
            alt={userTeam.name}
            className="w-14 h-14 rounded-full object-contain bg-white p-1"
          />
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Pronosticar</h1>
            <p className="text-silver text-sm">{userTeam.name} — {matches.length} partido{matches.length !== 1 ? "s" : ""}</p>
            {dataSource === "api" && (
              <p className="text-gold/60 text-[10px]">Datos en vivo via football-data.org</p>
            )}
          </div>
        </div>

        {matches.length === 0 ? (
          <div className="bg-navy-mid border border-border rounded-2xl p-10 text-center">
            <span className="text-5xl mb-4 block">📅</span>
            <p className="text-white font-bold mb-1">Sin partidos programados</p>
            <p className="text-silver text-sm">No hay partidos próximos para {userTeam.name}</p>
          </div>
        ) : (
          <>
            {/* Match Rows */}
            <div className="space-y-3">
              {matches.map((match) => {
                const pred = predictions[match.id];
                const isExpanded = expandedMatch === match.id;
                const locked = isMatchLocked(match.id, match.match_date);
                const leagueColor = leagueColors[match.league] || "#1e2d4a";
                const homeScorers = (pred?.scorers ?? []).filter(s => s.team === "home" && s.player_name);
                const awayScorers = (pred?.scorers ?? []).filter(s => s.team === "away" && s.player_name);
                const homePlayers = getPlayersForTeam(match.home_team);
                const awayPlayers = getPlayersForTeam(match.away_team);
                const hasScorers = homeScorers.length > 0 || awayScorers.length > 0;

                const homeLogo = match.home_logo || teamLogos[match.home_team] || "";
                const awayLogo = match.away_logo || teamLogos[match.away_team] || "";

                return (
                  <div
                    key={match.id}
                    className={`relative rounded-xl sm:rounded-2xl bg-navy-mid border border-border overflow-hidden transition-all ${locked ? "opacity-60" : ""}`}
                  >
                    {/* League color accent */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl sm:rounded-l-2xl" style={{ backgroundColor: leagueColor }} />

                    {/* Locked overlay */}
                    {locked && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-navy-black/60 backdrop-blur-[1px]">
                        <div className="text-center">
                          <span className="text-4xl block mb-2">🔒</span>
                          <p className="text-white text-sm font-bold">
                            {pred?.prediction_id ? "Guardado" : "Cerrado"}
                          </p>
                          <p className="text-silver text-[11px]">
                            {pred?.prediction_id ? "Pronóstico enviado" : "Ya comenzó el partido"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Match Header */}
                    <div className="px-5 pt-4 pb-3">
                      <div className="flex items-center gap-2 mb-3">
                        {leagueLogos[match.league] && (
                          <img src={leagueLogos[match.league]} alt={match.league} className="w-4 h-4 object-contain" />
                        )}
                        <span className="text-[11px] font-semibold" style={{ color: leagueColor }}>{match.league}</span>
                        <span className="text-border">·</span>
                        <span className="text-silver text-[11px]">{getMatchDate(match.match_date)}</span>
                        <span className="bg-navy-card px-2 py-0.5 rounded text-silver text-[11px] ml-auto">{getMatchTime(match.match_date)}</span>
                      </div>

                      {/* Teams + Score */}
                      <div className="flex items-center gap-3">
                        {/* Home */}
                        <div className="flex-1 flex items-center justify-end gap-2.5">
                          <span className="text-white text-sm font-bold text-right truncate">{match.home_team}</span>
                          {homeLogo && (
                            <img src={homeLogo} alt={match.home_team} className="w-10 h-10 rounded-full object-contain bg-white p-0.5 shrink-0" />
                          )}
                        </div>

                        {/* Score Inputs */}
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={pred?.home_score ?? ""}
                            onChange={(e) => handleScoreChange(match.id, "home_score", e.target.value)}
                            className="w-12 h-12 bg-navy-card border border-border rounded-xl text-center text-white text-lg font-black focus:outline-none focus:border-gold transition-colors"
                          />
                          <span className="text-gold font-black text-sm">VS</span>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={pred?.away_score ?? ""}
                            onChange={(e) => handleScoreChange(match.id, "away_score", e.target.value)}
                            className="w-12 h-12 bg-navy-card border border-border rounded-xl text-center text-white text-lg font-black focus:outline-none focus:border-gold transition-colors"
                          />
                        </div>

                        {/* Away */}
                        <div className="flex-1 flex items-center gap-2.5">
                          {awayLogo && (
                            <img src={awayLogo} alt={match.away_team} className="w-10 h-10 rounded-full object-contain bg-white p-0.5 shrink-0" />
                          )}
                          <span className="text-white text-sm font-bold truncate">{match.away_team}</span>
                        </div>
                      </div>

                      {/* Scorer Summary (collapsed) */}
                      {!isExpanded && hasScorers && (
                        <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                          {homeScorers.map((s, i) => (
                            <span key={`h-${i}`} className="inline-flex items-center gap-1 bg-gold/10 border border-gold/20 text-gold text-[10px] font-medium px-2 py-0.5 rounded-full">
                              ⚽ {s.player_name}{s.goals > 1 ? ` ×${s.goals}` : ""}
                            </span>
                          ))}
                          {awayScorers.map((s, i) => (
                            <span key={`a-${i}`} className="inline-flex items-center gap-1 bg-gold/10 border border-gold/20 text-gold text-[10px] font-medium px-2 py-0.5 rounded-full">
                              ⚽ {s.player_name}{s.goals > 1 ? ` ×${s.goals}` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expand Button */}
                    {!locked && (
                      <button
                        onClick={() => handleExpand(match.id)}
                        className="w-full border-t border-border px-5 py-2.5 flex items-center justify-center gap-2 text-xs font-semibold hover:bg-navy-card transition-colors"
                      >
                        <span className="text-gold">
                          {isExpanded
                            ? "Ocultar goleadores"
                            : hasScorers
                              ? "Editar goleadores"
                              : "Agregar goleadores"}
                        </span>
                        <span className={`text-gold transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                      </button>
                    )}

                    {/* Expanded Scorer Section */}
                    {isExpanded && !locked && (
                      <div className="border-t border-border px-5 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Home Scorers */}
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              {homeLogo && (
                                <img src={homeLogo} alt={match.home_team} className="w-5 h-5 rounded-full object-contain bg-white p-0.5" />
                              )}
                              <span className="text-white text-xs font-bold uppercase tracking-wider truncate">{match.home_team}</span>
                            </div>
                            <div className="space-y-2">
                              {[0, 1, 2].map((slotIdx) => {
                                const scorer = homeScorers[slotIdx];
                                const globalIdx = pred?.scorers?.findIndex(s => s === scorer) ?? -1;
                                return (
                                  <div key={slotIdx} className="flex items-center gap-1.5">
                                    <span className="text-gold text-[10px] font-bold w-3 text-center shrink-0">{slotIdx + 1}</span>
                                    <select
                                      value={scorer?.player_name ?? ""}
                                      onChange={(e) => {
                                        if (globalIdx >= 0) updateScorer(match.id, globalIdx, "player_name", e.target.value);
                                      }}
                                      className="flex-1 min-w-0 bg-navy-card border border-border rounded-lg px-2.5 py-2 text-white text-[11px] focus:outline-none focus:border-gold truncate"
                                    >
                                      <option value="">Seleccionar</option>
                                      {homePlayers.map((player) => (
                                        <option key={player.id} value={player.name}>
                                          {player.name}
                                        </option>
                                      ))}
                                    </select>
                                    {scorer && (
                                      <>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                          <button
                                            onClick={() => updateScorer(match.id, globalIdx, "goals", Math.max(1, scorer.goals - 1))}
                                            className="w-6 h-6 bg-navy-card border border-border rounded text-silver text-xs hover:text-white flex items-center justify-center"
                                          >
                                            −
                                          </button>
                                          <span className="text-gold text-xs font-bold w-5 text-center">{scorer.goals}</span>
                                          <button
                                            onClick={() => updateScorer(match.id, globalIdx, "goals", Math.min(10, scorer.goals + 1))}
                                            className="w-6 h-6 bg-navy-card border border-border rounded text-silver text-xs hover:text-white flex items-center justify-center"
                                          >
                                            +
                                          </button>
                                        </div>
                                        <button
                                          onClick={() => removeScorer(match.id, globalIdx)}
                                          className="text-red-400/60 text-xs hover:text-red-400 shrink-0"
                                        >
                                          ✕
                                        </button>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Away Scorers */}
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              {awayLogo && (
                                <img src={awayLogo} alt={match.away_team} className="w-5 h-5 rounded-full object-contain bg-white p-0.5" />
                              )}
                              <span className="text-white text-xs font-bold uppercase tracking-wider truncate">{match.away_team}</span>
                            </div>
                            <div className="space-y-2">
                              {[0, 1, 2].map((slotIdx) => {
                                const scorer = awayScorers[slotIdx];
                                const globalIdx = pred?.scorers?.findIndex(s => s === scorer) ?? -1;
                                return (
                                  <div key={slotIdx} className="flex items-center gap-1.5">
                                    <span className="text-gold text-[10px] font-bold w-3 text-center shrink-0">{slotIdx + 1}</span>
                                    <select
                                      value={scorer?.player_name ?? ""}
                                      onChange={(e) => {
                                        if (globalIdx >= 0) updateScorer(match.id, globalIdx, "player_name", e.target.value);
                                      }}
                                      className="flex-1 min-w-0 bg-navy-card border border-border rounded-lg px-2.5 py-2 text-white text-[11px] focus:outline-none focus:border-gold truncate"
                                    >
                                      <option value="">Seleccionar</option>
                                      {awayPlayers.map((player) => (
                                        <option key={player.id} value={player.name}>
                                          {player.name}
                                        </option>
                                      ))}
                                    </select>
                                    {scorer && (
                                      <>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                          <button
                                            onClick={() => updateScorer(match.id, globalIdx, "goals", Math.max(1, scorer.goals - 1))}
                                            className="w-6 h-6 bg-navy-card border border-border rounded text-silver text-xs hover:text-white flex items-center justify-center"
                                          >
                                            −
                                          </button>
                                          <span className="text-gold text-xs font-bold w-5 text-center">{scorer.goals}</span>
                                          <button
                                            onClick={() => updateScorer(match.id, globalIdx, "goals", Math.min(10, scorer.goals + 1))}
                                            className="w-6 h-6 bg-navy-card border border-border rounded text-silver text-xs hover:text-white flex items-center justify-center"
                                          >
                                            +
                                          </button>
                                        </div>
                                        <button
                                          onClick={() => removeScorer(match.id, globalIdx)}
                                          className="text-red-400/60 text-xs hover:text-red-400 shrink-0"
                                        >
                                          ✕
                                        </button>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <p className="text-silver/60 text-[10px] mt-3 text-center">
                          Máximo 3 goleadores por equipo · Dejá vacío si no querés usar todos
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Save Section */}
            <div className="mt-6 sticky bottom-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-3">
                  <p className="text-red-400 text-xs text-center">{error}</p>
                </div>
              )}
              {success && (
                <div className="bg-green/10 border border-green/20 rounded-xl p-3 mb-3">
                  <p className="text-green text-xs text-center font-medium">¡Pronósticos guardados!</p>
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-gold text-navy-black font-black py-3.5 rounded-full text-sm hover:bg-gold-light transition-colors disabled:opacity-50 tracking-wide"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-navy-black border-t-transparent rounded-full animate-spin" />
                    Guardando...
                  </span>
                ) : (
                  "Guardar Pronósticos"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
