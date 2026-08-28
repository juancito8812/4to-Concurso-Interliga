"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { leagueColors, leagueLogos, normalizeMatchLeague, normalizeTeamName, matchIdToUuid } from "@/lib/leagueConfig";
import { calculateScore } from "@/lib/scoring";
import {
  getUserCupSurvivors,
  isKnockoutCup,
  TournamentSurvivor,
  KnockoutCupSlug,
} from "@/lib/survivor";
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

interface PrimaryTeam {
  id: string;
  name: string;
  logo_url: string;
}

interface KnockoutCupInfo {
  slug: KnockoutCupSlug;
  name: string;
  shortName: string;
  emoji: string;
  color: string;
}

const KNOCKOUT_CUPS: KnockoutCupInfo[] = [
  { slug: "champions", name: "Champions League", shortName: "Champions", emoji: "⭐", color: "#1a4b8e" },
  { slug: "europa", name: "Europa League", shortName: "Europa", emoji: "🟠", color: "#f37920" },
  { slug: "conference", name: "Conference League", shortName: "Conference", emoji: "🟢", color: "#00843d" },
  { slug: "coppaitalia", name: "Copa Italia", shortName: "Copa Italia", emoji: "🇮🇹", color: "#024494" },
];

function getKnockoutCupSlugFromLeague(league: string): KnockoutCupSlug | null {
  if (!isKnockoutCup(league)) return null;
  const norm = league.toLowerCase().trim();
  if (norm.includes("champions") || norm === "cl") return "champions";
  if (norm.includes("europa") || norm === "el") return "europa";
  if (norm.includes("conference") || norm === "ecl") return "conference";
  if (
    norm.includes("copa italia") ||
    norm.includes("coppa") ||
    norm === "ci" ||
    norm === "coppaitalia"
  )
    return "coppaitalia";
  return null;
}

export default function MisPronosticosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [predictions, setPredictions] = useState<PredictionWithMatch[]>([]);
  const [survivors, setSurvivors] = useState<Record<string, TournamentSurvivor>>({});
  const [primaryTeam, setPrimaryTeam] = useState<PrimaryTeam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const fetchData = async () => {
      // 1. Fetch user's primary team and survivor status
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("team_id")
          .eq("user_id", user.id)
          .single();

        if (profile?.team_id) {
          const { data: team } = await supabase
            .from("teams")
            .select("id, name, logo_url")
            .eq("id", profile.team_id)
            .single();

          if (team && isMounted) {
            setPrimaryTeam(team);
          }
        }

        const userSurvivors = await getUserCupSurvivors(user.id);
        if (isMounted) {
          setSurvivors(userSurvivors || {});
        }
      } catch (err) {
        console.warn("Error fetching profile and survivor data:", err);
      }

      // 2. Fetch predictions
      const storageKey = `interliga_predictions_${user.id}`;
      let localMap: Record<string, { id?: string; match_id: string; home_score: string | number; away_score: string | number; scorers?: ScorerInfo[]; points?: number }> = {};
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          localMap = JSON.parse(raw);
        }
      } catch (e) {
        console.warn("Error reading local predictions:", e);
      }

      let predsData: Array<{ id: string; match_id: string; home_score: number; away_score: number; points: number | null }> = [];
      try {
        const { data } = await supabase
          .from("predictions")
          .select("id, match_id, home_score, away_score, points")
          .eq("user_id", user.id);
        if (data) predsData = data;
      } catch (e) {
        console.warn("Error fetching Supabase predictions:", e);
      }

      // Merge local predictions into predsData
      const seenMatchIds = new Set(predsData.map((p) => p.match_id));
      for (const [matchId, localPred] of Object.entries(localMap)) {
        if (!seenMatchIds.has(matchId) && (localPred.home_score !== "" || localPred.away_score !== "")) {
          predsData.push({
            id: localPred.id || `local-${matchId}`,
            match_id: matchId,
            home_score: typeof localPred.home_score === "string" ? parseInt(localPred.home_score) || 0 : localPred.home_score,
            away_score: typeof localPred.away_score === "string" ? parseInt(localPred.away_score) || 0 : localPred.away_score,
            points: null,
          });
        }
      }

      if (predsData.length === 0) {
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

      const predIds = predsData.map((p) => p.id).filter((id) => !id.startsWith("local-"));
      let scorersData: Array<{ prediction_id: string; player_name: string; goals: number; team: string }> = [];
      if (predIds.length > 0) {
        const { data: sData } = await supabase
          .from("prediction_scorers")
          .select("prediction_id, player_name, goals, team")
          .in("prediction_id", predIds);
        if (sData) scorersData = sData;
      }

      const scorersMap: Record<string, ScorerInfo[]> = {};
      if (scorersData) {
        scorersData.forEach((s) => {
          if (!scorersMap[s.prediction_id]) scorersMap[s.prediction_id] = [];
          scorersMap[s.prediction_id].push(s);
        });
      }

      // Merge local scorers
      for (const [matchId, localPred] of Object.entries(localMap)) {
        const pId = localPred.id || `local-${matchId}`;
        if (!scorersMap[pId] && localPred.scorers && localPred.scorers.length > 0) {
          scorersMap[pId] = localPred.scorers;
        }
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

    fetchData();

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
        <Link href="/" className="inline-flex items-center gap-2 text-silver hover:text-white mb-4 transition-colors text-sm">
          <span className="text-gold">←</span> Volver al inicio
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Mis Pronósticos</h1>
        <p className="text-silver text-sm mb-4">Historial de tus predicciones y estado de supervivencia</p>

        {/* Total Points Header Card */}
        <div className="bg-navy-mid border border-border rounded-xl p-4 mb-6 text-center shadow-md">
          <span className="text-silver text-xs font-medium uppercase tracking-wider">Puntos totales</span>
          <p className="text-gold text-3xl font-black">{totalPoints}</p>
        </div>

        {/* Superviviente en Copas (Knockout Survivor Summary & Timeline) */}
        <div className="bg-navy-mid border border-border rounded-2xl p-4 sm:p-5 mb-6 shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                  Estado de Superviviente en Copas
                </h2>
                <p className="text-[11px] text-silver">
                  Herencia de camisetas y estado de eliminación directa
                </p>
              </div>
            </div>
            <Link
              href="/pronosticar/"
              className="text-[11px] font-bold text-gold hover:text-gold-light transition-colors shrink-0"
            >
              Pronosticar →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {KNOCKOUT_CUPS.map((cup) => {
              const sur = survivors[cup.slug];
              const isAlive = (sur?.status || "ALIVE") === "ALIVE";
              const activeTeamName = sur?.active_team_name || primaryTeam?.name || "Sin equipo asignado";
              const activeTeamLogo = sur?.active_team_logo || (sur?.active_team_name ? "" : primaryTeam?.logo_url);
              const history = sur?.history || [];

              return (
                <div
                  key={cup.slug}
                  className="bg-navy-card/90 border border-border/80 rounded-xl p-3 flex flex-col justify-between gap-2.5 relative overflow-hidden"
                >
                  {/* Top Bar Accent */}
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: cup.color }}
                  />

                  {/* Cup Header & Status */}
                  <div className="flex items-center justify-between gap-1.5 pt-0.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                      <span>{cup.emoji}</span>
                      <span className="truncate">{cup.shortName}</span>
                    </span>
                    {isAlive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green/15 border border-green/30 text-green text-[10px] font-black uppercase tracking-wider shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
                        VIVO
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-wider shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        KO{sur?.eliminated_at_round ? ` (${sur.eliminated_at_round})` : ""}
                      </span>
                    )}
                  </div>

                  {/* Active Team */}
                  <div className="flex items-center gap-2 bg-navy-mid/70 p-2 rounded-lg border border-border/40">
                    {activeTeamLogo ? (
                      <img
                        src={activeTeamLogo}
                        alt={activeTeamName}
                        width={24}
                        height={24}
                        loading="lazy"
                        decoding="async"
                        className="w-6 h-6 rounded-full object-contain bg-white p-0.5 shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-navy-dark border border-border flex items-center justify-center text-[10px] shrink-0">
                        ⚽
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate leading-tight">
                        {activeTeamName}
                      </p>
                      <p className="text-[10px] text-silver/70 truncate">
                        {isAlive ? "Camiseta activa" : "Eliminado de la copa"}
                      </p>
                    </div>
                  </div>

                  {/* Timeline / History of Inherited Jerseys */}
                  {history.length > 0 ? (
                    <div className="bg-gold/10 border border-gold/25 rounded-lg p-2 space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-gold uppercase tracking-wider">
                        <span>👑</span>
                        <span>Camisetas Heredadas</span>
                      </div>
                      <div className="space-y-1">
                        {history.map((h, hIdx) => (
                          <div
                            key={hIdx}
                            className="flex items-center justify-between text-[11px] text-silver gap-1 bg-navy-dark/60 px-2 py-0.5 rounded border border-gold/10"
                          >
                            <span className="text-white truncate font-medium flex items-center gap-1">
                              <span className="text-silver/60">de</span>
                              <span className="line-through text-silver/80">{h.from_team}</span>
                              <span className="text-gold font-bold">➔</span>
                              <strong className="text-gold">{h.to_team}</strong>
                            </span>
                            {h.round && (
                              <span className="text-[9px] bg-navy-card px-1 py-0.2 rounded text-silver shrink-0 font-mono">
                                {h.round}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-silver/60 italic flex items-center gap-1 px-1">
                      <span>👕</span>
                      <span>Club base original (sin transferencias)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
          <div className="space-y-4">
            {predictions.map((p) => {
              const homeScorers = p.scorers.filter(
                (s) => s.team === "home" || s.team === p.home_team
              );
              const awayScorers = p.scorers.filter(
                (s) => s.team === "away" || s.team === p.away_team
              );
              const leagueColor = leagueColors[p.league] || "#1e2d4a";
              const isKnockout = isKnockoutCup(p.league);
              const cupSlug = getKnockoutCupSlugFromLeague(p.league);
              const cupSurvivor = cupSlug ? survivors[cupSlug] : null;
              const cupActiveTeam = cupSurvivor?.active_team_name || primaryTeam?.name;
              const isCupAlive = cupSurvivor ? cupSurvivor.status === "ALIVE" : true;

              return (
                <div
                  key={p.id}
                  className="rounded-2xl bg-navy-mid border border-border/80 shadow-lg overflow-hidden relative transition-all content-visibility-auto"
                >
                  {/* League Color Top Accent Bar */}
                  <div className="h-1 w-full" style={{ backgroundColor: leagueColor }} />

                  <div className="p-4 sm:p-5 space-y-3">
                    {/* Header: League & Date & Knockout Survivor Badge */}
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/40">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {leagueLogos[p.league] && (
                          <img
                            src={leagueLogos[p.league]}
                            alt={p.league}
                            width={18}
                            height={18}
                            loading="lazy"
                            decoding="async"
                            className="w-4 h-4 object-contain shrink-0"
                          />
                        )}
                        <span className="text-xs font-bold uppercase truncate" style={{ color: leagueColor }}>
                          {p.league}
                        </span>
                        {isKnockout && (
                          <span
                            className={`ml-1 text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase flex items-center gap-0.5 ${
                              isCupAlive
                                ? "bg-green/15 text-green border border-green/30"
                                : "bg-red-500/15 text-red-400 border border-red-500/30"
                            }`}
                          >
                            <span>⚔️</span>
                            <span>{isCupAlive ? "VIVO" : "KO"}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-silver text-xs font-mono shrink-0">
                        {new Date(p.match_date).toLocaleDateString("es-AR", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Knockout Match Info Pill */}
                    {isKnockout && cupActiveTeam && (
                      <div className="bg-navy-dark/70 border border-border/60 rounded-lg px-2.5 py-1.5 text-[11px] flex items-center justify-between gap-2">
                        <span className="text-silver flex items-center gap-1.5 truncate">
                          <span>🛡️</span>
                          <span>Tu camiseta activa:</span>
                          <strong className="text-white font-bold truncate">{cupActiveTeam}</strong>
                        </span>
                        <span className="text-gold text-[10px] font-semibold shrink-0">
                          {cupSurvivor?.history && cupSurvivor.history.length > 0 ? "👑 Heredado" : "👕 Original"}
                        </span>
                      </div>
                    )}

                    {/* Central Scoreboard (Estilo Transmisión TV) */}
                    <div className="flex items-center justify-between gap-2 sm:gap-4 py-1">
                      {/* Local Team */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end text-right min-w-0">
                        <span className="text-white text-xs sm:text-sm font-bold truncate">
                          {p.home_team}
                        </span>
                        {p.home_logo ? (
                          <img
                            src={p.home_logo}
                            alt={p.home_team}
                            width={36}
                            height={36}
                            loading="lazy"
                            decoding="async"
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-contain bg-white p-0.5 shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-navy-card border border-border flex items-center justify-center text-xs shrink-0">
                            ⚽
                          </div>
                        )}
                      </div>

                      {/* Score Box */}
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-navy-dark/90 rounded-xl border border-border/80 text-center shrink-0 shadow-inner">
                        <span className="text-gold font-black text-lg sm:text-xl font-mono min-w-[18px]">
                          {p.home_score}
                        </span>
                        <span className="text-silver/60 text-xs font-semibold uppercase">vs</span>
                        <span className="text-gold font-black text-lg sm:text-xl font-mono min-w-[18px]">
                          {p.away_score}
                        </span>
                      </div>

                      {/* Away Team */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-start text-left min-w-0">
                        {p.away_logo ? (
                          <img
                            src={p.away_logo}
                            alt={p.away_team}
                            width={36}
                            height={36}
                            loading="lazy"
                            decoding="async"
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-contain bg-white p-0.5 shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-navy-card border border-border flex items-center justify-center text-xs shrink-0">
                            ⚽
                          </div>
                        )}
                        <span className="text-white text-xs sm:text-sm font-bold truncate">
                          {p.away_team}
                        </span>
                      </div>
                    </div>

                    {/* Goalscorers in 2 Columns Directly Under Each Club */}
                    <div className="pt-3 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                      {/* Local Scorers */}
                      <div className="bg-navy-dark/70 rounded-xl p-2.5 border border-border/50">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {p.home_logo && (
                            <img
                              src={p.home_logo}
                              alt=""
                              width={16}
                              height={16}
                              loading="lazy"
                              decoding="async"
                              className="w-4 h-4 object-contain shrink-0"
                            />
                          )}
                          <span className="text-[11px] font-bold text-silver uppercase truncate">
                            Goleadores {p.home_team}
                          </span>
                        </div>
                        {homeScorers.length > 0 ? (
                          <div className="space-y-1">
                            {homeScorers.map((s, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between bg-navy-mid/90 px-2.5 py-1 rounded-lg border border-border/40 text-xs"
                              >
                                <span className="text-white font-medium truncate flex items-center gap-1.5">
                                  <span>⚽</span> {s.player_name}
                                </span>
                                <span className="text-gold font-bold font-mono text-[11px] shrink-0 ml-1.5">
                                  {s.goals} {s.goals === 1 ? "gol" : "goles"}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-silver/50 text-[11px] italic">Sin goleadores pronosticados</p>
                        )}
                      </div>

                      {/* Away Scorers */}
                      <div className="bg-navy-dark/70 rounded-xl p-2.5 border border-border/50">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          {p.away_logo && (
                            <img
                              src={p.away_logo}
                              alt=""
                              width={16}
                              height={16}
                              loading="lazy"
                              decoding="async"
                              className="w-4 h-4 object-contain shrink-0"
                            />
                          )}
                          <span className="text-[11px] font-bold text-silver uppercase truncate">
                            Goleadores {p.away_team}
                          </span>
                        </div>
                        {awayScorers.length > 0 ? (
                          <div className="space-y-1">
                            {awayScorers.map((s, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between bg-navy-mid/90 px-2.5 py-1 rounded-lg border border-border/40 text-xs"
                              >
                                <span className="text-white font-medium truncate flex items-center gap-1.5">
                                  <span>⚽</span> {s.player_name}
                                </span>
                                <span className="text-gold font-bold font-mono text-[11px] shrink-0 ml-1.5">
                                  {s.goals} {s.goals === 1 ? "gol" : "goles"}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-silver/50 text-[11px] italic">Sin goleadores pronosticados</p>
                        )}
                      </div>
                    </div>

                    {/* Match Result & Points Breakdown */}
                    {p.result_home !== null ? (
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
                    ) : (
                      <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-center gap-2 text-[11px] text-silver/80">
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span>Partido pendiente de juego · Los puntos se calcularán automáticamente al finalizar el encuentro</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
