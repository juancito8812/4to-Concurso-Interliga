import { loadData } from "@/lib/dataLoader";
import { normalizeTeamName, leagueSlugToName } from "@/lib/leagueConfig";

const OFFICIAL_FIXTURES_PATH = "/data/officialFixtures.json";

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
  /** Jornada agrupable (fixtures locales); undefined en el fallback en vivo de ESPN. */
  matchday?: number | null;
}

export interface MatchGroup {
  key: string;
  label: string;
  matches: CupMatch[];
}

/**
 * Agrupa partidos para la pestaña "Partidos" de /tabla, ordenados por fecha.
 * Con matchday (fixtures locales): un grupo por jornada ("Jornada N");
 * sin matchday (fallback en vivo de ESPN): un grupo por día con su fecha.
 */
export function groupMatchesByDay(matches: CupMatch[]): MatchGroup[] {
  const sorted = [...matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const groups: MatchGroup[] = [];
  for (const m of sorted) {
    const date = new Date(m.date);
    const key = m.matchday != null ? `md-${m.matchday}` : `date-${date.toISOString().slice(0, 10)}`;
    const label =
      m.matchday != null
        ? `Jornada ${m.matchday}`
        : date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

    const current = groups[groups.length - 1];
    if (current?.key === key) current.matches.push(m);
    else groups.push({ key, label, matches: [m] });
  }
  return groups;
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

  const url = `https://site.web.api.espn.com/apis/v2/sports/soccer/${espnCode}/standings`;

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
  const leagueName = leagueSlugToName[leagueSlug] || leagueSlug;
  const nowMs = Date.now();
  const todayStr = new Date(nowMs).toISOString().slice(0, 10);
  const nowIso = new Date(nowMs - 2 * 60 * 60 * 1000).toISOString();

  const isMatchDateValid = (dateStr: string) => {
    if (!dateStr) return false;
    if (dateStr.includes("T00:00:00") || dateStr.length === 10) {
      return dateStr.slice(0, 10) >= todayStr;
    }
    return dateStr >= nowIso;
  };

  const [officialFixtures, evalMatches] = await Promise.all([
    loadData<Array<{
      id: string;
      home_team: string;
      away_team: string;
      match_date: string;
      league: string;
      home_logo?: string;
      away_logo?: string;
      matchday?: number;
    }>>(OFFICIAL_FIXTURES_PATH).catch(() => []),
    loadData<Array<{
      id: string;
      home_team?: string;
      away_team?: string;
      result_home: number;
      result_away: number;
    }>>("/data/officialEvaluatedMatches.json").catch(() => []),
  ]);

  const evalMap: Record<string, { result_home: number; result_away: number }> = {};
  if (Array.isArray(evalMatches)) {
    evalMatches.forEach((em) => {
      if (em.id) evalMap[em.id] = { result_home: em.result_home, result_away: em.result_away };
      if (em.home_team && em.away_team) {
        const key = `${normalizeTeamName(em.home_team).toLowerCase()}__${normalizeTeamName(em.away_team).toLowerCase()}`;
        evalMap[key] = { result_home: em.result_home, result_away: em.result_away };
      }
    });
  }

  const localMatches = Array.isArray(officialFixtures)
    ? officialFixtures.filter((m) => {
        const lMatch = m.league.toLowerCase().trim() === leagueName.toLowerCase().trim();
        return lMatch && isMatchDateValid(m.match_date);
      })
    : [];

  if (localMatches.length > 0) {
    localMatches.sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
    // Tope amplio (la liga con más partidos por jugar tiene ~330): sin este corte,
    // el límite viejo de 30 truncaba la fase liga de Champions a ~1,5 jornadas
    // (126 partidos por jugar en 2026/27). La pestaña "Partidos" de /tabla renderiza
    // la lista completa sin paginación.
    return localMatches.slice(0, 500).map((m) => {
      const homeNorm = normalizeTeamName(m.home_team);
      const awayNorm = normalizeTeamName(m.away_team);
      const key = `${homeNorm.toLowerCase()}__${awayNorm.toLowerCase()}`;
      const evaluated = evalMap[m.id] || evalMap[key];
      const isCompleted = evaluated !== undefined && evaluated.result_home !== null;

      return {
        id: m.id,
        name: `${homeNorm} vs ${awayNorm}`,
        date: m.match_date,
        status: isCompleted ? "Finalizado" : "Programado",
        homeTeam: homeNorm,
        homeLogo: m.home_logo || "",
        homeScore: isCompleted ? evaluated.result_home : undefined,
        awayTeam: awayNorm,
        awayLogo: m.away_logo || "",
        awayScore: isCompleted ? evaluated.result_away : undefined,
        matchday: m.matchday ?? null,
      };
    });
  }

  // 2. Fallback to live ESPN API if no local matches found
  const espnCode = leagueEspnCodes[leagueSlug];
  if (!espnCode) return [];

  // Temporada completa 2026/27: sin ?dates ESPN solo devuelve su ventana por defecto
  // (días alrededor de hoy) y las copas quedarían vacías entre rondas; y con el
  // límite por defecto (100) la fase liga de Champions se trunca (189 en 2026/27).
  // OJO: el host actual (site.web.api.espn.com) ya NO acepta rangos YYYYMMDD-YYYYMMDD
  // (devuelve 0 eventos); espera el año de temporada. Los eventos 2025/26 que arrastra
  // se descartan con el filtro season.year de abajo.
  const url = `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${espnCode}/scoreboard?dates=2026&limit=500`;

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
