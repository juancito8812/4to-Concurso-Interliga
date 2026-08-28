"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { leagueColors, leagueLogos, normalizeMatchLeague, normalizeTeamName, cleanTeamName, matchIdToUuid } from "@/lib/leagueConfig";
import { getOfficialTeamMatches, getOfficialPlayersForTeams, FDMatch, findTeamId } from "@/lib/footballData";

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

const positionRank = (pos: string) => {
  const p = (pos || "").toLowerCase();
  if (p.includes("delantero") || p.includes("forward") || p.includes("striker") || p.includes("offen")) return 1;
  if (p.includes("medio") || p.includes("midfield") || p.includes("centrocampista")) return 2;
  if (p.includes("defen") || p.includes("back")) return 3;
  if (p.includes("arquero") || p.includes("portero") || p.includes("goal") || p.includes("keeper")) return 4;
  return 2;
};

function checkIsMatchLocked(matchDate: string, timeRef: number): boolean {
  if (!timeRef) return false;
  const matchTime = new Date(matchDate).getTime();
  const diffMin = (matchTime - timeRef) / (1000 * 60);
  if (isNaN(diffMin)) return true;
  return diffMin <= 10;
}

function calculateTimeRemaining(
  matchDate: string,
  timeRef: number
): { label: string; isUrgent: boolean; isClosed: boolean } {
  if (!timeRef) return { label: "...", isUrgent: false, isClosed: false };
  const matchTime = new Date(matchDate).getTime();
  const diffMin = (matchTime - timeRef) / (1000 * 60);

  if (isNaN(diffMin) || diffMin <= 10) {
    return { label: "Cerrado", isUrgent: false, isClosed: true };
  }
  if (diffMin <= 60) {
    const mins = Math.max(1, Math.round(diffMin - 10));
    return { label: `Cierra en ${mins} min`, isUrgent: true, isClosed: false };
  }
  if (diffMin <= 1440) {
    const hours = Math.round((diffMin - 10) / 60);
    return { label: `Cierra en ${hours} h`, isUrgent: false, isClosed: false };
  }
  const days = Math.round(diffMin / 1440);
  return { label: `En ${days} d`, isUrgent: false, isClosed: false };
}

function subscribeToTimer(callback: () => void) {
  const interval = setInterval(callback, 30000);
  return () => clearInterval(interval);
}

function getTimeSnapshot() {
  return typeof window !== "undefined" ? Math.floor(Date.now() / 10000) * 10000 : 0;
}

function getServerTimeSnapshot() {
  return 0;
}

export default function PronosticarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [userTeam, setUserTeam] = useState<TeamInfo | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamLogos, setTeamLogos] = useState<Record<string, string>>({});
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const now = useSyncExternalStore(subscribeToTimer, getTimeSnapshot, getServerTimeSnapshot);

  const loadPlayersForMatches = async (teamNames: string[]) => {
    // 1. Get official updated 2026/27 squads (3,031 players)
    const officialList: Player[] = getOfficialPlayersForTeams(teamNames);

    // 2. Also query Supabase database to ensure all player records are covered
    const queryTeams = new Set<string>();
    teamNames.forEach((t) => {
      if (t) {
        queryTeams.add(t);
        queryTeams.add(normalizeTeamName(t));
      }
    });

    let dbList: Player[] = [];
    try {
      const { data: playersData } = await supabase
        .from("players")
        .select("*")
        .in("team", Array.from(queryTeams));
      if (playersData) dbList = playersData;
    } catch (e) {
      console.warn("Supabase players fetch error:", e);
    }

    // 3. Merge and deduplicate by player name + team
    const seen = new Set<string>();
    const merged: Player[] = [];

    // Prioritize official updated 2026/27 list
    for (const p of officialList) {
      const key = `${p.name.toLowerCase().trim()}-${p.team}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(p);
      }
    }

    for (const p of dbList) {
      const key = `${p.name.toLowerCase().trim()}-${normalizeTeamName(p.team)}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({
          ...p,
          team: normalizeTeamName(p.team),
        });
      }
    }

    // 4. Sort: Delanteros first, then Mediocampistas, then Defensores, then Arqueros
    merged.sort((a, b) => {
      const rankDiff = positionRank(a.position) - positionRank(b.position);
      if (rankDiff !== 0) return rankDiff;
      return a.name.localeCompare(b.name);
    });

    setPlayers(merged);
  };

  const fetchFromSupabase = async (teamData: TeamInfo) => {
    const nowIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: matchesData } = await supabase
      .from("matches")
      .select("*")
      .or(`home_team.eq.${teamData.name},away_team.eq.${teamData.name}`)
      .gte("match_date", nowIso)
      .order("match_date", { ascending: true })
      .limit(3);

    if (matchesData) {
      const normalizedMatches: Match[] = matchesData.map(m => {
        const matchId = matchIdToUuid(m.id);
        const homeNorm = normalizeTeamName(m.home_team);
        const awayNorm = normalizeTeamName(m.away_team);
        return {
          ...m,
          id: matchId,
          home_team: homeNorm,
          away_team: awayNorm,
          league: normalizeMatchLeague(homeNorm, awayNorm, m.match_date, m.league),
        };
      });
      setMatches(normalizedMatches);

      const teamNames = new Set<string>();
      normalizedMatches.forEach(m => {
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

      await loadPlayersForMatches(Array.from(teamNames));
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

      try {
        const officialMatches = await getOfficialTeamMatches(teamData.name, apiTeamId);

        if (officialMatches.length > 0 && isMounted) {
          const next3Matches = officialMatches.slice(0, 3);
          const mappedMatches: Match[] = next3Matches.map((f: FDMatch) => {
            const matchId = matchIdToUuid(f.id);
            const homeNorm = normalizeTeamName(f.homeTeam.name);
            const awayNorm = normalizeTeamName(f.awayTeam.name);
            const apiComp = f.competition?.name || f.competition?.code || "";
            const resolvedLeague = normalizeMatchLeague(
              homeNorm,
              awayNorm,
              f.utcDate,
              apiComp
            );
            return {
              id: matchId,
              home_team: homeNorm,
              away_team: awayNorm,
              match_date: f.utcDate,
              league: resolvedLeague,
              home_logo: f.homeTeam.crest,
              away_logo: f.awayTeam.crest,
            };
          });
          setMatches(mappedMatches);

          const logos: Record<string, string> = {};
          mappedMatches.forEach((m) => {
            if (m.home_logo) logos[m.home_team] = m.home_logo;
            if (m.away_logo) logos[m.away_team] = m.away_logo;
          });
          setTeamLogos(logos);

          const teamNames = new Set<string>();
          teamNames.add(teamData.name);
          mappedMatches.forEach((m) => {
            teamNames.add(m.home_team);
            teamNames.add(m.away_team);
          });

          await loadPlayersForMatches(Array.from(teamNames));
        } else {
          await fetchFromSupabase(teamData);
        }
      } catch (err) {
        console.error("Error loading official matches, falling back to Supabase:", err);
        await fetchFromSupabase(teamData);
      }

      const storageKey = `interliga_predictions_${user.id}`;
      let loadedPredsMap: Record<string, Prediction> = {};

      // 1. Load from localStorage (instant, offline-first)
      try {
        const savedRaw = localStorage.getItem(storageKey);
        if (savedRaw) {
          loadedPredsMap = JSON.parse(savedRaw);
        }
      } catch (e) {
        console.warn("Error reading local predictions:", e);
      }

      // 2. Fetch and merge from Supabase
      try {
        const { data: predsData } = await supabase
          .from("predictions")
          .select("id, match_id, home_score, away_score")
          .eq("user_id", user.id);

        if (predsData && predsData.length > 0) {
          for (const pred of predsData) {
            const { data: scorersData } = await supabase
              .from("prediction_scorers")
              .select("player_name, goals, team")
              .eq("prediction_id", pred.id);

            loadedPredsMap[pred.match_id] = {
              match_id: pred.match_id,
              home_score: pred.home_score !== null && pred.home_score !== undefined ? String(pred.home_score) : "",
              away_score: pred.away_score !== null && pred.away_score !== undefined ? String(pred.away_score) : "",
              scorers: scorersData || loadedPredsMap[pred.match_id]?.scorers || [],
              prediction_id: pred.id,
            };
          }
        }
      } catch (e) {
        console.warn("Supabase predictions load error:", e);
      }

      if (isMounted) {
        setPredictions(loadedPredsMap);
        setLoading(false);
      }
    };

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  const getPlayersForTeam = (teamName: string) => {
    const norm = normalizeTeamName(teamName);
    const cTarget = cleanTeamName(teamName);
    return players.filter((p) => {
      const pNorm = normalizeTeamName(p.team);
      const cPlayerTeam = cleanTeamName(p.team);
      return (
        p.team === teamName ||
        p.team === norm ||
        pNorm === norm ||
        cPlayerTeam === cTarget ||
        cPlayerTeam.includes(cTarget) ||
        cTarget.includes(cPlayerTeam)
      );
    });
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

  const addScorerSlot = (matchId: string, team: "home" | "away") => {
    setPredictions((prev) => {
      const current = prev[matchId] || {
        match_id: matchId,
        home_score: "",
        away_score: "",
        scorers: [],
      };
      const teamScorers = (current.scorers ?? []).filter((s) => s.team === team);
      if (teamScorers.length >= 3) return prev;

      return {
        ...prev,
        [matchId]: {
          ...current,
          scorers: [
            ...(current.scorers ?? []),
            { player_name: "", goals: 1, team },
          ],
        },
      };
    });
  };

  const updateScorer = (
    matchId: string,
    index: number,
    field: keyof Scorer,
    value: string | number
  ) => {
    setPredictions((prev) => {
      const current = prev[matchId];
      if (!current) return prev;
      const scorers = [...(current.scorers ?? [])];
      if (index < 0 || index >= scorers.length) return prev;
      scorers[index] = { ...scorers[index], [field]: value };
      return {
        ...prev,
        [matchId]: {
          ...current,
          scorers,
        },
      };
    });
  };

  const removeScorer = (matchId: string, index: number) => {
    setPredictions((prev) => {
      const current = prev[matchId];
      if (!current) return prev;
      const scorers = [...(current.scorers ?? [])];
      if (index < 0 || index >= scorers.length) return prev;
      scorers.splice(index, 1);
      return {
        ...prev,
        [matchId]: {
          ...current,
          scorers,
        },
      };
    });
  };

  const handleSave = async () => {
    if (!user) return;
    const saveTimestamp = Date.now();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const unlockedMatches = Object.keys(predictions).filter((matchId) => {
        const match = matches.find((m) => m.id === matchId);
        return match && !checkIsMatchLocked(match.match_date, saveTimestamp);
      });

      const storageKey = `interliga_predictions_${user.id}`;
      const updatedPreds = { ...predictions };

      for (const matchId of unlockedMatches) {
        const pred = updatedPreds[matchId];
        if (!pred) continue;

        // If completely empty and never saved before, skip
        if (
          pred.home_score === "" &&
          pred.away_score === "" &&
          (!pred.scorers || pred.scorers.length === 0) &&
          !pred.prediction_id
        ) {
          continue;
        }

        const homeScore = pred.home_score === "" ? 0 : parseInt(pred.home_score);
        const awayScore = pred.away_score === "" ? 0 : parseInt(pred.away_score);

        // Mark as saved with client ID if none
        const currentPredId = pred.prediction_id || `pred-${saveTimestamp}-${matchId}`;
        updatedPreds[matchId] = {
          ...pred,
          prediction_id: currentPredId,
        };

        // Try syncing to Supabase in background
        try {
          const { data: predData, error: predError } = await supabase
            .from("predictions")
            .upsert(
              {
                user_id: user.id,
                match_id: matchId,
                home_score: homeScore,
                away_score: awayScore,
              },
              { onConflict: "user_id,match_id" }
            )
            .select("id")
            .single();

          if (!predError && predData) {
            updatedPreds[matchId].prediction_id = predData.id;

            await supabase
              .from("prediction_scorers")
              .delete()
              .eq("prediction_id", predData.id);

            if (pred.scorers && pred.scorers.length > 0) {
              const scorersToInsert = pred.scorers
                .filter((s) => s.player_name.trim() !== "")
                .map((s) => ({
                  prediction_id: predData.id,
                  player_name: s.player_name,
                  goals: s.goals,
                  team: s.team,
                }));

              if (scorersToInsert.length > 0) {
                await supabase
                  .from("prediction_scorers")
                  .insert(scorersToInsert);
              }
            }
          }
        } catch (dbErr) {
          console.warn("Supabase upsert error (saved locally):", dbErr);
        }
      }

      // Save to localStorage for instant, offline & persistent retention
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedPreds));
      } catch (stErr) {
        console.warn("Error saving to localStorage:", stErr);
      }

      setPredictions(updatedPreds);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
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
            Ir a inicio
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

  const hasSavedPredictions = Object.values(predictions).some((p) => p.prediction_id);

  return (
    <div className="min-h-screen pb-12 pt-16 sm:pt-20 px-3 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="text-silver hover:text-gold text-sm font-semibold transition-colors flex items-center gap-1"
          >
            ← Volver
          </Link>
          <span className="text-border">/</span>
          <span className="text-gold text-sm font-semibold">Pronosticar</span>
        </div>

        {/* Title & Team Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 bg-navy-mid border border-border rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            {userTeam.logo_url && (
              <img
                src={userTeam.logo_url}
                alt={userTeam.name}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-contain bg-white p-1 shrink-0 shadow-lg"
              />
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">{userTeam.name}</h1>
              <p className="text-silver text-xs sm:text-sm font-medium">
                {userTeam.league} · Próximos 3 Partidos Oficiales
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-center">
            {hasSavedPredictions ? (
              <span className="inline-flex items-center gap-1.5 bg-green/15 border border-green/30 text-green text-xs font-bold px-3 py-1.5 rounded-full">
                <span>✅</span> Pronósticos Activos
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-full">
                <span>⏱️</span> Pronósticos Pendientes
              </span>
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
            {/* Match Cards */}
            <div className="space-y-6">
              {matches.map((match) => {
                const pred = predictions[match.id];
                const locked = checkIsMatchLocked(match.match_date, now);
                const timeRemaining = calculateTimeRemaining(match.match_date, now);
                const leagueColor = leagueColors[match.league] || "#1e2d4a";
                const homePlayers = getPlayersForTeam(match.home_team);
                const awayPlayers = getPlayersForTeam(match.away_team);

                const homeLogo = match.home_logo || teamLogos[match.home_team] || "";
                const awayLogo = match.away_logo || teamLogos[match.away_team] || "";

                const allScorers = pred?.scorers ?? [];
                const homeScorerEntries = allScorers
                  .map((scorer, index) => ({ scorer, index }))
                  .filter((item) => item.scorer.team === "home");
                const awayScorerEntries = allScorers
                  .map((scorer, index) => ({ scorer, index }))
                  .filter((item) => item.scorer.team === "away");

                return (
                  <div
                    key={match.id}
                    className={`rounded-2xl bg-navy-mid border border-border/80 shadow-xl overflow-hidden relative transition-all content-visibility-auto ${
                      locked ? "opacity-75" : ""
                    }`}
                  >
                    {/* League Color Top Accent Bar */}
                    <div className="h-1 w-full" style={{ backgroundColor: leagueColor }} />

                    {/* Card Header (Barra de Competencia Estilo TV) */}
                    <div className="px-4 sm:px-6 py-3 bg-navy-card/80 border-b border-border/60 flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        {leagueLogos[match.league] ? (
                          <img
                            src={leagueLogos[match.league]}
                            alt={match.league}
                            width={20}
                            height={20}
                            loading="lazy"
                            decoding="async"
                            className="w-5 h-5 object-contain shrink-0"
                          />
                        ) : (
                          <span className="text-sm">🏆</span>
                        )}
                        <span
                          className="text-xs sm:text-sm font-bold tracking-wide uppercase truncate"
                          style={{ color: leagueColor }}
                        >
                          {match.league}
                        </span>
                        <span className="text-border">·</span>
                        <span className="text-silver text-xs font-medium whitespace-nowrap">
                          {getMatchDate(match.match_date)} · {getMatchTime(match.match_date)}
                        </span>
                      </div>

                      {/* Prediction Status & Time Remaining Badges */}
                      <div className="flex items-center gap-2">
                        {pred?.prediction_id ? (
                          <span
                            className="inline-flex items-center gap-1 bg-green/15 border border-green/30 text-green text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0"
                            title="Pronóstico guardado. Podés editarlo antes del cierre."
                          >
                            <span>✅</span> Pronosticado {pred.home_score !== "" && pred.away_score !== "" ? `(${pred.home_score} - ${pred.away_score})` : ""}
                          </span>
                        ) : pred && (pred.home_score !== "" || pred.away_score !== "" || (pred.scorers && pred.scorers.length > 0)) ? (
                          <span
                            className="inline-flex items-center gap-1 bg-gold/15 border border-gold/30 text-gold text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 animate-pulse"
                            title="Tenés cambios pendientes por guardar"
                          >
                            <span>✏️</span> Sin guardar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-navy-card/90 border border-border text-silver/60 text-[11px] font-medium px-2.5 py-0.5 rounded-full shrink-0">
                            <span>⏳</span> Pendiente
                          </span>
                        )}

                        {timeRemaining.isClosed ? (
                          <span className="inline-flex items-center gap-1 bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0">
                            🔒 Cerrado
                          </span>
                        ) : timeRemaining.isUrgent ? (
                          <span className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 animate-pulse">
                            ⏱️ {timeRemaining.label}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-green/15 border border-green/30 text-green text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0">
                            🟢 {timeRemaining.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Central Scoreboard (Estilo Transmisión TV) */}
                    <div className="px-4 sm:px-6 py-5 sm:py-6">
                      <div className="flex items-center justify-between gap-2 sm:gap-4">
                        {/* Local Team */}
                        <div className="flex-1 min-w-0 flex items-center justify-end gap-2.5 sm:gap-3">
                          {homeLogo && (
                            <img
                              src={homeLogo}
                              alt={match.home_team}
                              width={48}
                              height={48}
                              loading="lazy"
                              decoding="async"
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-contain bg-white p-1 shrink-0 shadow-md border border-border/40"
                            />
                          )}
                          <span className="text-white text-sm sm:text-base font-bold text-right truncate">
                            {match.home_team}
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            disabled={locked}
                            value={pred?.home_score ?? ""}
                            onChange={(e) => handleScoreChange(match.id, "home_score", e.target.value)}
                            placeholder="-"
                            className={`w-11 h-11 sm:w-14 sm:h-14 bg-navy-card border rounded-xl text-center text-white text-xl sm:text-2xl font-black shrink-0 transition-all ${
                              locked
                                ? "border-border/40 text-silver/50 bg-navy-card/40 cursor-not-allowed"
                                : "border-border focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold hover:border-gold/40 shadow-inner"
                            }`}
                          />
                        </div>

                        {/* Center Pill */}
                        <div className="flex flex-col items-center justify-center shrink-0 px-1 sm:px-2">
                          <span className="px-2.5 py-1 bg-navy-card border border-border/80 rounded-lg text-gold font-black text-xs sm:text-sm tracking-widest shadow-sm">
                            VS
                          </span>
                        </div>

                        {/* Away Team */}
                        <div className="flex-1 min-w-0 flex items-center justify-start gap-2.5 sm:gap-3">
                          <input
                            type="number"
                            min={0}
                            max={20}
                            disabled={locked}
                            value={pred?.away_score ?? ""}
                            onChange={(e) => handleScoreChange(match.id, "away_score", e.target.value)}
                            placeholder="-"
                            className={`w-11 h-11 sm:w-14 sm:h-14 bg-navy-card border rounded-xl text-center text-white text-xl sm:text-2xl font-black shrink-0 transition-all ${
                              locked
                                ? "border-border/40 text-silver/50 bg-navy-card/40 cursor-not-allowed"
                                : "border-border focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold hover:border-gold/40 shadow-inner"
                            }`}
                          />
                          <span className="text-white text-sm sm:text-base font-bold text-left truncate">
                            {match.away_team}
                          </span>
                          {awayLogo && (
                            <img
                              src={awayLogo}
                              alt={match.away_team}
                              width={48}
                              height={48}
                              loading="lazy"
                              decoding="async"
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-contain bg-white p-1 shrink-0 shadow-md border border-border/40"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Goalscorer Panel in 2 Columns Directly Under Each Team */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50 px-4 sm:px-6 pb-5">
                      {/* Left Column: Home Scorers */}
                      <div className="bg-navy-card/40 rounded-xl p-3 sm:p-4 border border-border/40 flex flex-col justify-between">
                        <div>
                          {/* Column Header */}
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/40">
                            {homeLogo && (
                              <img
                                src={homeLogo}
                                alt={match.home_team}
                                className="w-5 h-5 rounded-full object-contain bg-white p-0.5 shrink-0"
                              />
                            )}
                            <span className="text-white text-xs font-bold uppercase tracking-wider truncate">
                              Goleadores {match.home_team}
                            </span>
                          </div>

                          {/* Scorers List */}
                          {homeScorerEntries.length === 0 ? (
                            <p className="text-silver/50 text-[11px] italic text-center py-2.5">
                              Sin goleadores seleccionados (opcional)
                            </p>
                          ) : (
                            <div className="space-y-2 mb-3">
                              {homeScorerEntries.map(({ scorer, index }) => (
                                <div key={`home-scorer-${index}`} className="flex items-center gap-1.5">
                                  <select
                                    disabled={locked}
                                    value={scorer.player_name}
                                    onChange={(e) => updateScorer(match.id, index, "player_name", e.target.value)}
                                    className="flex-1 min-w-0 bg-navy-card border border-border rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-gold truncate disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    <option value="">Seleccionar jugador</option>
                                    {homePlayers.map((player) => (
                                      <option key={player.id} value={player.name}>
                                        {player.name} {player.position ? `(${player.position})` : ""}
                                      </option>
                                    ))}
                                  </select>

                                  {/* Goals Stepper (only shown when a player is selected) */}
                                  {scorer.player_name ? (
                                    <div className="flex items-center gap-1 bg-navy-card border border-border rounded-lg px-1.5 py-0.5 shrink-0" title="Cantidad de goles que anotará">
                                      <span className="text-[11px] select-none text-silver">⚽</span>
                                      <button
                                        type="button"
                                        disabled={locked || scorer.goals <= 1}
                                        onClick={() => updateScorer(match.id, index, "goals", Math.max(1, scorer.goals - 1))}
                                        className="w-5 h-5 rounded text-silver hover:text-white hover:bg-navy-mid flex items-center justify-center font-bold text-xs disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                        title="Menos goles"
                                      >
                                        −
                                      </button>
                                      <span className="text-gold text-xs font-black min-w-3 text-center">{scorer.goals}</span>
                                      <button
                                        type="button"
                                        disabled={locked || scorer.goals >= 10}
                                        onClick={() => updateScorer(match.id, index, "goals", Math.min(10, scorer.goals + 1))}
                                        className="w-5 h-5 rounded text-silver hover:text-white hover:bg-navy-mid flex items-center justify-center font-bold text-xs disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                        title="Más goles"
                                      >
                                        +
                                      </button>
                                    </div>
                                  ) : null}

                                  {/* Remove Button */}
                                  {!locked && (
                                    <button
                                      type="button"
                                      onClick={() => removeScorer(match.id, index)}
                                      className="w-6 h-6 rounded text-red-400/60 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center text-xs transition-colors shrink-0 cursor-pointer"
                                      title="Eliminar goleador"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Add Home Scorer Button */}
                        {homeScorerEntries.length < 3 && !locked && (
                          <button
                            type="button"
                            onClick={() => addScorerSlot(match.id, "home")}
                            className="w-full py-1.5 px-3 mt-1 border border-dashed border-border hover:border-gold/60 text-silver hover:text-gold rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors bg-navy-card/30 hover:bg-navy-card/70 cursor-pointer"
                          >
                            <span>+</span> Agregar goleador local
                          </button>
                        )}
                      </div>

                      {/* Right Column: Away Scorers */}
                      <div className="bg-navy-card/40 rounded-xl p-3 sm:p-4 border border-border/40 flex flex-col justify-between">
                        <div>
                          {/* Column Header */}
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/40">
                            {awayLogo && (
                              <img
                                src={awayLogo}
                                alt={match.away_team}
                                className="w-5 h-5 rounded-full object-contain bg-white p-0.5 shrink-0"
                              />
                            )}
                            <span className="text-white text-xs font-bold uppercase tracking-wider truncate">
                              Goleadores {match.away_team}
                            </span>
                          </div>

                          {/* Scorers List */}
                          {awayScorerEntries.length === 0 ? (
                            <p className="text-silver/50 text-[11px] italic text-center py-2.5">
                              Sin goleadores seleccionados (opcional)
                            </p>
                          ) : (
                            <div className="space-y-2 mb-3">
                              {awayScorerEntries.map(({ scorer, index }) => (
                                <div key={`away-scorer-${index}`} className="flex items-center gap-1.5">
                                  <select
                                    disabled={locked}
                                    value={scorer.player_name}
                                    onChange={(e) => updateScorer(match.id, index, "player_name", e.target.value)}
                                    className="flex-1 min-w-0 bg-navy-card border border-border rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-gold truncate disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    <option value="">Seleccionar jugador</option>
                                    {awayPlayers.map((player) => (
                                      <option key={player.id} value={player.name}>
                                        {player.name} {player.position ? `(${player.position})` : ""}
                                      </option>
                                    ))}
                                  </select>

                                  {/* Goals Stepper (only shown when a player is selected) */}
                                  {scorer.player_name ? (
                                    <div className="flex items-center gap-1 bg-navy-card border border-border rounded-lg px-1.5 py-0.5 shrink-0" title="Cantidad de goles que anotará">
                                      <span className="text-[11px] select-none text-silver">⚽</span>
                                      <button
                                        type="button"
                                        disabled={locked || scorer.goals <= 1}
                                        onClick={() => updateScorer(match.id, index, "goals", Math.max(1, scorer.goals - 1))}
                                        className="w-5 h-5 rounded text-silver hover:text-white hover:bg-navy-mid flex items-center justify-center font-bold text-xs disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                        title="Menos goles"
                                      >
                                        −
                                      </button>
                                      <span className="text-gold text-xs font-black min-w-3 text-center">{scorer.goals}</span>
                                      <button
                                        type="button"
                                        disabled={locked || scorer.goals >= 10}
                                        onClick={() => updateScorer(match.id, index, "goals", Math.min(10, scorer.goals + 1))}
                                        className="w-5 h-5 rounded text-silver hover:text-white hover:bg-navy-mid flex items-center justify-center font-bold text-xs disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                                        title="Más goles"
                                      >
                                        +
                                      </button>
                                    </div>
                                  ) : null}

                                  {/* Remove Button */}
                                  {!locked && (
                                    <button
                                      type="button"
                                      onClick={() => removeScorer(match.id, index)}
                                      className="w-6 h-6 rounded text-red-400/60 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center text-xs transition-colors shrink-0 cursor-pointer"
                                      title="Eliminar goleador"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Add Away Scorer Button */}
                        {awayScorerEntries.length < 3 && !locked && (
                          <button
                            type="button"
                            onClick={() => addScorerSlot(match.id, "away")}
                            className="w-full py-1.5 px-3 mt-1 border border-dashed border-border hover:border-gold/60 text-silver hover:text-gold rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors bg-navy-card/30 hover:bg-navy-card/70 cursor-pointer"
                          >
                            <span>+</span> Agregar goleador visitante
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Save Section */}
            <div className="mt-8 sticky bottom-4 z-10">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-3 backdrop-blur-md">
                  <p className="text-red-400 text-xs text-center">{error}</p>
                </div>
              )}
              {success && (
                <div className="bg-green/10 border border-green/20 rounded-xl p-3 mb-3 backdrop-blur-md">
                  <p className="text-green text-xs text-center font-medium">¡Pronósticos guardados!</p>
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-gold text-navy-black font-black py-3.5 rounded-full text-sm hover:bg-gold-light transition-colors disabled:opacity-50 tracking-wide shadow-lg cursor-pointer disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-navy-black border-t-transparent rounded-full animate-spin" />
                    Guardando...
                  </span>
                ) : hasSavedPredictions ? (
                  "Actualizar Pronósticos"
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
