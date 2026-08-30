import officialFixtures from "@/data/officialFixtures.json";
import { normalizeTeamName, leagueSlugToName } from "@/lib/leagueConfig";

export interface Standing {
  rank: number;
  team: {
    name: string;
    shortName?: string;
    logo: string;
  };
  points: number;
  goalsDiff: number;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  note?: string;
}

export interface PlayerStat {
  rank: number;
  name: string;
  team: string;
  value: number;
  photo?: string;
}

export interface CupMatch {
  id: string;
  name: string;
  date: string;
  status: string;
  homeTeam: string;
  homeLogo: string;
  homeScore?: number;
  awayTeam: string;
  awayLogo: string;
  awayScore?: number;
}

export const leagueEspnCodes: Record<string, string> = {
  premier: "eng.1",
  laliga: "esp.1",
  seriea: "ita.1",
  bundesliga: "ger.1",
  champions: "uefa.champions",
  europa: "uefa.europa",
  conference: "uefa.europa.conf",
  coppaitalia: "ita.coppa_italia",
  facup: "eng.fa",
  copadelrey: "esp.copa_del_rey",
  dfbpokal: "ger.dfb_pokal",
};

interface ESPNStatItem {
  name: string;
  value: number;
  displayValue?: string;
}

interface ESPNStandingEntry {
  team: {
    id: string;
    displayName: string;
    shortDisplayName?: string;
    name: string;
    logos?: { href: string }[];
  };
  note?: {
    color?: string;
    description?: string;
    rank?: number;
  };
  stats: ESPNStatItem[];
}

interface ESPNScorerLeader {
  value: number;
  athlete: {
    id: string;
    displayName: string;
    headshot?: { href: string };
    team?: {
      displayName?: string;
      name?: string;
    };
  };
}

interface ESPNScoreboardEvent {
  id: string;
  name: string;
  date: string;
  season?: {
    year?: number;
  };
  status: {
    type: {
      detail: string;
      state: string;
      completed: boolean;
    };
  };
  competitions: {
    competitors: {
      homeAway: "home" | "away";
      score?: string;
      team: {
        id: string;
        displayName: string;
        logo?: string;
      };
    }[];
  }[];
}

/**
 * Fetch live standings for a league from ESPN API
 */
export async function getEspnStandings(leagueSlug: string): Promise<Standing[]> {
  const espnCode = leagueEspnCodes[leagueSlug];
  if (!espnCode || leagueSlug === "coppaitalia") return [];

  const url = `https://site.api.espn.com/apis/v2/sports/soccer/${espnCode}/standings`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`ESPN Standings error for ${leagueSlug}: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const entries: ESPNStandingEntry[] =
      data.children?.[0]?.standings?.entries ||
      data.standings?.[0]?.entries ||
      [];

    if (!entries || entries.length === 0) return [];

    return entries.map((entry, index) => {
      const statsMap: Record<string, number> = {};
      for (const s of entry.stats || []) {
        statsMap[s.name] = s.value;
      }

      const rawName = entry.team.displayName || entry.team.name;
      const normalizedName = normalizeTeamName(rawName);

      return {
        rank: statsMap.rank || index + 1,
        team: {
          name: normalizedName,
          shortName: entry.team.shortDisplayName || normalizedName,
          logo: entry.team.logos?.[0]?.href || "",
        },
        points: statsMap.points ?? 0,
        goalsDiff: statsMap.pointDifferential ?? (statsMap.pointsFor ?? 0) - (statsMap.pointsAgainst ?? 0),
        played: statsMap.gamesPlayed ?? 0,
        win: statsMap.wins ?? 0,
        draw: statsMap.ties ?? 0,
        lose: statsMap.losses ?? 0,
        goalsFor: statsMap.pointsFor ?? 0,
        goalsAgainst: statsMap.pointsAgainst ?? 0,
        note: entry.note?.description,
      };
    });
  } catch (error) {
    console.error(`Failed to fetch ESPN standings for ${leagueSlug}:`, error);
    return [];
  }
}

/**
 * Fetch top scorers for a league from ESPN Statistics API
 */
export async function getEspnScorers(leagueSlug: string): Promise<PlayerStat[]> {
  const espnCode = leagueEspnCodes[leagueSlug];
  if (!espnCode) return [];

  const url = `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${espnCode}/statistics`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`ESPN Scorers error for ${leagueSlug}: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const statsCategories = data.stats || [];
    const goalsCategory = statsCategories.find(
      (c: { name: string }) => c.name === "goalsLeaders" || c.name === "goals" || c.name === "totalGoals"
    );

    const leaders: ESPNScorerLeader[] = goalsCategory?.leaders || [];
    if (!leaders || leaders.length === 0) return [];

    return leaders.slice(0, 20).map((l, i) => {
      const rawTeam = l.athlete?.team?.displayName || l.athlete?.team?.name || "";
      return {
        rank: i + 1,
        name: l.athlete?.displayName || "Jugador",
        team: normalizeTeamName(rawTeam),
        value: l.value ?? 0,
        photo: l.athlete?.headshot?.href,
      };
    });
  } catch (error) {
    console.error(`Failed to fetch ESPN scorers for ${leagueSlug}:`, error);
    return [];
  }
}

/**
 * Fetch matches/scoreboard for a tournament or league (e.g. Bundesliga, Champions, Coppa Italia)
 */
export async function getEspnScoreboard(leagueSlug: string): Promise<CupMatch[]> {
  // 1. Prioritize official verified 2026/27 calendar from bundle
  const leagueName = leagueSlugToName[leagueSlug] || leagueSlug;
  const nowIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const localMatches = (officialFixtures as Array<{
    id: string;
    home_team: string;
    away_team: string;
    match_date: string;
    league: string;
    home_logo?: string;
    away_logo?: string;
    matchday?: number;
  }>).filter((m) => {
    const lMatch = m.league.toLowerCase().trim() === leagueName.toLowerCase().trim();
    return lMatch && m.match_date >= nowIso;
  });

  if (localMatches.length > 0) {
    return localMatches.slice(0, 20).map((m) => {
      const homeNorm = normalizeTeamName(m.home_team);
      const awayNorm = normalizeTeamName(m.away_team);
      return {
        id: m.id,
        name: `${homeNorm} vs ${awayNorm}`,
        date: m.match_date,
        status: "Programado",
        homeTeam: homeNorm,
        homeLogo: m.home_logo || "",
        awayTeam: awayNorm,
        awayLogo: m.away_logo || "",
      };
    });
  }

  // 2. Fallback to live ESPN API if no local matches found
  const espnCode = leagueEspnCodes[leagueSlug];
  if (!espnCode) return [];

  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnCode}/scoreboard?dates=20260801-20270601&limit=500`;

  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const allEvents: ESPNScoreboardEvent[] = data.events || [];
      // Filter to current season only (prevent showing last season's final)
      const events = allEvents.filter((e) => !e.season?.year || e.season.year >= 2026);

      if (events.length > 0) {
        return events.map((event) => {
          const competition = event.competitions?.[0];
          const home = competition?.competitors?.find((c) => c.homeAway === "home");
          const away = competition?.competitors?.find((c) => c.homeAway === "away");

          const homeName = normalizeTeamName(home?.team?.displayName || "Local");
          const awayName = normalizeTeamName(away?.team?.displayName || "Visitante");

          return {
            id: event.id,
            name: `${homeName} vs ${awayName}`,
            date: event.date,
            status: event.status?.type?.detail || "Programado",
            homeTeam: homeName,
            homeLogo: home?.team?.logo || "",
            homeScore: home?.score !== undefined ? parseInt(home.score) : undefined,
            awayTeam: awayName,
            awayLogo: away?.team?.logo || "",
            awayScore: away?.score !== undefined ? parseInt(away.score) : undefined,
          };
        });
      }
    }
  } catch (error) {
    console.error(`Failed to fetch ESPN scoreboard for ${leagueSlug}:`, error);
  }

  return [];
}
