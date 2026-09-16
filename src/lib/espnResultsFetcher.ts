import { normalizeTeamName, matchIdToUuid } from "./leagueConfig";
import { loadData } from "@/lib/dataLoader";
import { RealScorer } from "./scoring";

const OFFICIAL_FIXTURES_PATH = "/data/officialFixtures.json";

export interface EvaluatedMatchResult {
  id: string;
  home_team: string;
  away_team: string;
  match_date: string;
  league: string;
  result_home: number;
  result_away: number;
  scorers: RealScorer[];
  completed: boolean;
}

const LEAGUE_SLUGS = [
  "esp.1",
  "eng.1",
  "ita.1",
  "ger.1",
  "uefa.champions",
  "uefa.europa",
  "uefa.europa.conf",
  "ita.coppa_italia",
  "eng.fa",
  "esp.copa_del_rey",
  "ger.dfb_pokal",
];

const LEAGUE_MAP: Record<string, string> = {
  "esp.1": "LaLiga",
  "eng.1": "Premier League",
  "ita.1": "Serie A",
  "ger.1": "Bundesliga",
  "uefa.champions": "Champions League",
  "uefa.europa": "Europa League",
  "uefa.europa.conf": "Conference League",
  "ita.coppa_italia": "Copa Italia",
  "eng.fa": "FA Cup",
  "esp.copa_del_rey": "Copa del Rey",
  "ger.dfb_pokal": "DFB-Pokal",
};

let cachedResults: { timestamp: number; matches: EvaluatedMatchResult[] } | null = null;
const CACHE_TTL_MS = 30000; // 30 seconds cache

// ESPN scoreboard solo devuelve un día por petición (?dates=YYYYMMDD).
// Consultamos los últimos 3 días en paralelo para tener los marcadores recién finalizados.
const BACKFILL_DAYS = 3;

function getDateList(days = BACKFILL_DAYS): string[] {
  const dates: string[] = [];
  for (let i = 0; i <= days; i++) {
    const d = new Date(Date.now() - i * 86400000);
    dates.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
  }
  return dates;
}

interface EspnAthlete {
  displayName?: string;
  fullName?: string;
  shortName?: string;
  team?: { id?: string };
}

interface EspnDetail {
  scoringPlay?: boolean;
  ownGoal?: boolean;
  athletesInvolved?: EspnAthlete[];
}

interface EspnCompetitor {
  homeAway?: string;
  score?: string;
  team?: { id?: string; displayName?: string; name?: string };
}

interface EspnCompetition {
  date?: string;
  competitors?: EspnCompetitor[];
  details?: EspnDetail[];
}

interface EspnEvent {
  id?: string;
  date?: string;
  status?: { type?: { completed?: boolean; state?: string } };
  competitions?: EspnCompetition[];
}

export async function fetchLiveFinishedMatches(): Promise<EvaluatedMatchResult[]> {
  if (cachedResults && Date.now() - cachedResults.timestamp < CACHE_TTL_MS) {
    return cachedResults.matches;
  }

  const officialFixtures = await loadData<Array<{
    id: string;
    home_team: string;
    away_team: string;
    match_date: string;
    league: string;
  }>>(OFFICIAL_FIXTURES_PATH);
  const results: EvaluatedMatchResult[] = [];

  const dateList = getDateList(BACKFILL_DAYS);

  const fetchTasks: Promise<void>[] = [];

  for (const slug of LEAGUE_SLUGS) {
    for (const dateStr of dateList) {
      fetchTasks.push(
        (async () => {
          try {
            const url = `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${dateStr}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
            if (!res.ok) return;

            const data = await res.json();
            const events: EspnEvent[] = data.events || [];

            for (const ev of events) {
              const isCompleted = ev.status?.type?.completed === true || ev.status?.type?.state === "post";
              const comp = ev.competitions?.[0];
              if (!comp || !isCompleted) continue;

              const homeComp = comp.competitors?.find((c) => c.homeAway === "home");
              const awayComp = comp.competitors?.find((c) => c.homeAway === "away");

              if (!homeComp || !awayComp) continue;

              const homeName = normalizeTeamName(homeComp.team?.displayName || homeComp.team?.name || "");
              const awayName = normalizeTeamName(awayComp.team?.displayName || awayComp.team?.name || "");

              const scoreHome = parseInt(homeComp.score || "0", 10);
              const scoreAway = parseInt(awayComp.score || "0", 10);

              if (isNaN(scoreHome) || isNaN(scoreAway)) continue;

              // Parse official scorers
              const scorersMap: Record<string, { goals: number; team: "home" | "away" }> = {};

              if (comp.details && Array.isArray(comp.details)) {
                comp.details.forEach((d) => {
                  if (d.scoringPlay && !d.ownGoal && d.athletesInvolved && Array.isArray(d.athletesInvolved)) {
                    d.athletesInvolved.forEach((ath) => {
                      const playerName = ath.displayName || ath.fullName || ath.shortName;
                      if (playerName) {
                        const isHome = ath.team?.id === homeComp.team?.id;
                        const key = playerName.trim();
                        if (!scorersMap[key]) {
                          scorersMap[key] = { goals: 0, team: isHome ? "home" : "away" };
                        }
                        scorersMap[key].goals += 1;
                      }
                    });
                  }
                });
              }

              const scorers: RealScorer[] = Object.entries(scorersMap).map(([player_name, val]) => ({
                player_name,
                goals: val.goals,
                team: val.team,
              }));

              // Find match in official fixtures
              const fixture = officialFixtures.find(
                (f) =>
                  (normalizeTeamName(f.home_team) === homeName && normalizeTeamName(f.away_team) === awayName) ||
                  (f.home_team.includes(homeName) && f.away_team.includes(awayName))
              );

              const matchId = fixture ? matchIdToUuid(fixture.id) : matchIdToUuid(ev.id || `${homeName}-${awayName}`);

              const existingIdx = results.findIndex(
                (r) =>
                  r.id === matchId ||
                  (r.home_team === homeName && r.away_team === awayName)
              );

              const matchResult: EvaluatedMatchResult = {
                id: matchId,
                home_team: homeName,
                away_team: awayName,
                match_date: comp.date || ev.date || new Date().toISOString(),
                league: LEAGUE_MAP[slug] || "Fútbol",
                result_home: scoreHome,
                result_away: scoreAway,
                scorers,
                completed: true,
              };

              if (existingIdx >= 0) {
                results[existingIdx] = matchResult;
              } else {
                results.push(matchResult);
              }
            }
          } catch {
            // Non-blocking timeout/error capture
          }
        })()
      );
    }
  }

  await Promise.all(fetchTasks);

  cachedResults = {
    timestamp: Date.now(),
    matches: results,
  };

  return results;
}
