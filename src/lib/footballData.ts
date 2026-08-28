import officialFixtures from "@/data/officialFixtures.json";
import officialPlayers from "@/data/officialPlayers.json";

const BASE_URL = "https://api.football-data.org/v4";

const API_KEY = process.env.NEXT_PUBLIC_FOOTBALL_DATA_KEY || "733c2feed2bf441292e9779c91af2e09";

const headers = {
  "X-Auth-Token": API_KEY,
};

export interface PlayerData {
  id: string;
  name: string;
  team: string;
  league: string;
  position: string;
  nationality?: string;
}

// Competition codes for football-data.org
export const competitionCodes: Record<string, string> = {
  premier: "PL",
  laliga: "PD",
  seriea: "SA",
  bundesliga: "BL1",
  champions: "CL",
  europa: "EL",
  conference: "ECL",
  coppaitalia: "SA", // Same as Serie A for API
};

export interface FDMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  stage: string;
  group: string | null;
  competition?: {
    id: number;
    name: string;
    code: string;
    type: string;
    emblem: string;
  };
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  score: {
    winner: string | null;
    duration: string;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  referees: {
    id: number;
    name: string;
    type: string;
    nationality: string;
  }[];
}

export interface FDStanding {
  stage: string;
  type: string;
  group: string | null;
  table: {
    position: number;
    team: {
      id: number;
      name: string;
      shortName: string;
      tla: string;
      crest: string;
    };
    playedGames: number;
    won: number;
    draw: number;
    lost: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
  }[];
}

export interface FDScorer {
  player: {
    id: number;
    name: string;
    firstName: string;
    lastName: string;
    nationality: string;
    position: string;
    dateOfBirth: string;
    section: string;
  };
  team: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  goals: number;
  assists: number | null;
  penalties: number | null;
  playedMatches: number;
}

async function fdFetch<T>(endpoint: string): Promise<T | null> {
  if (!API_KEY) {
    console.warn("football-data.org key not configured");
    return null;
  }

  const url = `${BASE_URL}${endpoint}`;

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`football-data.org error: ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("football-data.org error:", err);
    return null;
  }
}

// Get competition standings
export async function getStandings(
  competitionCode: string
): Promise<FDStanding[]> {
  const data = await fdFetch<{ standings: FDStanding[] }>(
    `/competitions/${competitionCode}/standings`
  );
  return data?.standings || [];
}

// Get competition matches
export async function getMatches(
  competitionCode: string,
  matchday?: number
): Promise<FDMatch[]> {
  let endpoint = `/competitions/${competitionCode}/matches?status=SCHEDULED`;
  if (matchday) endpoint += `&matchday=${matchday}`;
  
  const data = await fdFetch<{ matches: FDMatch[] }>(endpoint);
  return data?.matches || [];
}

// Get team matches
export async function getTeamMatches(
  teamId: number,
  status: string = "SCHEDULED"
): Promise<FDMatch[]> {
  const data = await fdFetch<{ matches: FDMatch[] }>(
    `/teams/${teamId}/matches?status=${status}`
  );
  return data?.matches || [];
}

// Get official matches for a team with automatic live API + bundled fallback
export async function getOfficialTeamMatches(
  teamName: string,
  teamId?: number | null
): Promise<FDMatch[]> {
  // 1. Try live API first if teamId is available
  if (teamId) {
    try {
      const liveMatches = await getTeamMatches(teamId, "SCHEDULED");
      if (liveMatches && liveMatches.length > 0) {
        return liveMatches;
      }
    } catch (err) {
      console.warn("Live football-data.org fetch failed, falling back to official fixtures bundle:", err);
    }
  }

  // 2. Fallback to pre-bundled official 2026/27 season fixtures
  const cleanSearch = cleanNameForMatch(teamName);
  const nowIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const filtered = (officialFixtures as Array<{
    id: string;
    home_team: string;
    away_team: string;
    match_date: string;
    league: string;
    competition_code?: string;
    home_logo?: string;
    away_logo?: string;
    matchday?: number;
  }>).filter((m) => {
    const cleanHome = cleanNameForMatch(m.home_team);
    const cleanAway = cleanNameForMatch(m.away_team);
    const isTeam = cleanHome.includes(cleanSearch) || cleanAway.includes(cleanSearch) || cleanSearch.includes(cleanHome) || cleanSearch.includes(cleanAway);
    return isTeam && m.match_date >= nowIso;
  });

  filtered.sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());

  return filtered.map((m) => ({
    id: Number(m.id) || Math.floor(Math.random() * 1000000),
    utcDate: m.match_date,
    status: "SCHEDULED",
    matchday: m.matchday || 1,
    stage: "REGULAR_SEASON",
    group: null,
    competition: {
      id: 2021,
      name: m.league,
      code: m.competition_code || "PL",
      type: "LEAGUE",
      emblem: "",
    },
    homeTeam: {
      id: findTeamId(m.home_team) || 0,
      name: m.home_team,
      shortName: m.home_team,
      tla: m.home_team.slice(0, 3).toUpperCase(),
      crest: m.home_logo || "",
    },
    awayTeam: {
      id: findTeamId(m.away_team) || 0,
      name: m.away_team,
      shortName: m.away_team,
      tla: m.away_team.slice(0, 3).toUpperCase(),
      crest: m.away_logo || "",
    },
    score: {
      winner: null,
      duration: "REGULAR",
      fullTime: { home: null, away: null },
      halfTime: { home: null, away: null },
    },
    referees: [],
  }));
}

// Pre-indexed squad cache by cleaned team name for O(1) instant lookups
const playerIndexMap = new Map<string, PlayerData[]>();
for (const p of (officialPlayers as PlayerData[])) {
  const cTeam = cleanNameForMatch(p.team);
  if (!playerIndexMap.has(cTeam)) {
    playerIndexMap.set(cTeam, []);
  }
  playerIndexMap.get(cTeam)!.push(p);
}

// Get official updated squads for teams with fast Map lookup
export function getOfficialPlayersForTeams(teamNames: string[]): PlayerData[] {
  const result: PlayerData[] = [];
  const addedIds = new Set<string>();

  for (const teamName of teamNames) {
    const cleanTarget = cleanNameForMatch(teamName);
    
    // Direct match
    const directMatches = playerIndexMap.get(cleanTarget);
    if (directMatches) {
      for (const p of directMatches) {
        if (!addedIds.has(p.id)) {
          addedIds.add(p.id);
          result.push(p);
        }
      }
      continue;
    }

    // Substring / fuzzy match across keys
    for (const [cTeam, teamPlayers] of playerIndexMap.entries()) {
      if (cTeam.includes(cleanTarget) || cleanTarget.includes(cTeam)) {
        for (const p of teamPlayers) {
          if (!addedIds.has(p.id)) {
            addedIds.add(p.id);
            result.push(p);
          }
        }
      }
    }
  }

  return result;
}

// Get competition scorers
export async function getScorers(
  competitionCode: string
): Promise<FDScorer[]> {
  const data = await fdFetch<{ scorers: FDScorer[] }>(
    `/competitions/${competitionCode}/scorers`
  );
  return data?.scorers || [];
}

export interface FDTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

// Get competition teams
export async function getTeams(competitionCode: string): Promise<FDTeam[]> {
  const data = await fdFetch<{ teams: FDTeam[] }>(
    `/competitions/${competitionCode}/teams`
  );
  return data?.teams || [];
}

// Team IDs for football-data.org (from actual API response)
export const teamIds: Record<string, number> = {
  // Premier League
  "Arsenal": 57,
  "Arsenal FC": 57,
  "Aston Villa": 58,
  "Aston Villa FC": 58,
  "Bournemouth": 1044,
  "AFC Bournemouth": 1044,
  "Brentford": 402,
  "Brentford FC": 402,
  "Brighton": 397,
  "Brighton & Hove Albion FC": 397,
  "Chelsea": 61,
  "Chelsea FC": 61,
  "Crystal Palace": 354,
  "Crystal Palace FC": 354,
  "Everton": 62,
  "Everton FC": 62,
  "Fulham": 63,
  "Fulham FC": 63,
  "Ipswich Town": 349,
  "Ipswich Town FC": 349,
  "Leicester City": 338,
  "Leicester City FC": 338,
  "Liverpool": 64,
  "Liverpool FC": 64,
  "Manchester City": 65,
  "Manchester City FC": 65,
  "Manchester United": 66,
  "Manchester United FC": 66,
  "Newcastle": 67,
  "Newcastle United FC": 67,
  "Nottingham Forest": 351,
  "Nottingham Forest FC": 351,
  "Nott. Forest": 351,
  "Southampton": 340,
  "Southampton FC": 340,
  "Tottenham": 73,
  "Tottenham Hotspur FC": 73,
  "West Ham": 563,
  "West Ham United FC": 563,
  "Wolverhampton": 76,
  "Wolverhampton Wanderers FC": 76,
  "Wolves": 76,
  "Sunderland": 71,
  "Sunderland AFC": 71,

  // LaLiga
  "Athletic Club": 77,
  "Athletic Club de Bilbao": 77,
  "Athletic Bilbao": 77,
  "Atlético Madrid": 78,
  "Club Atlético de Madrid": 78,
  "Atletico Madrid": 78,
  "Barcelona": 81,
  "FC Barcelona": 81,
  "Real Madrid": 86,
  "Real Madrid CF": 86,
  "Real Sociedad": 92,
  "Real Sociedad de Fútbol": 92,
  "Villarreal": 94,
  "Villarreal CF": 94,
  "Real Betis": 90,
  "Real Betis Balompié": 90,
  "Girona": 298,
  "Girona FC": 298,
  "Sevilla": 559,
  "Sevilla FC": 559,
  "Valencia": 95,
  "Valencia CF": 95,
  "Celta Vigo": 88,
  "RC Celta de Vigo": 88,
  "Osasuna": 79,
  "CA Osasuna": 79,
  "Mallorca": 89,
  "RCD Mallorca": 89,
  "Las Palmas": 297,
  "UD Las Palmas": 297,
  "Rayo Vallecano": 87,
  "Rayo Vallecano de Madrid": 87,
  "Espanyol": 80,
  "RCD Espanyol de Barcelona": 80,
  "Leganes": 250,
  "Leganés": 250,
  "CD Leganés": 250,
  "Alavés": 263,
  "Deportivo Alavés": 263,
  "Valladolid": 262,
  "Real Valladolid": 262,
  "Real Valladolid CF": 262,
  "Elche": 285,
  "Elche CF": 285,
  "Getafe": 82,
  "Getafe CF": 82,

  // Serie A
  "Inter Milan": 108,
  "FC Internazionale Milano": 108,
  "Inter": 108,
  "AC Milan": 98,
  "Milan": 98,
  "Juventus": 109,
  "Juventus FC": 109,
  "Napoli": 113,
  "SSC Napoli": 113,
  "Roma": 112,
  "AS Roma": 112,
  "Lazio": 110,
  "SS Lazio": 110,
  "Atalanta": 105,
  "Atalanta BC": 105,
  "Fiorentina": 106,
  "ACF Fiorentina": 106,
  "Torino": 115,
  "Torino FC": 115,
  "Bologna": 103,
  "Bologna FC 1909": 103,
  "Genoa": 107,
  "Genoa CFC": 107,
  "Monza": 111,
  "AC Monza": 111,
  "Cagliari": 104,
  "Cagliari Calcio": 104,
  "Udinese": 117,
  "Udinese Calcio": 117,
  "Sassuolo": 114,
  "US Sassuolo Calcio": 114,
  "Empoli": 100,
  "Empoli FC": 100,
  "Lecce": 119,
  "US Lecce": 119,
  "Parma": 116,
  "Parma Calcio 1913": 116,
  "Venezia": 118,
  "Venezia FC": 118,
  "Como": 101,
  "Como 1907": 101,
  "Verona": 99,
  "Hellas Verona FC": 99,
  "Frosinone": 470,
  "Salernitana": 455,

  // Bundesliga
  "Bayern Munich": 5,
  "FC Bayern München": 5,
  "Borussia Dortmund": 4,
  "BVB": 4,
  "Bayer Leverkusen": 3,
  "Bayer 04 Leverkusen": 3,
  "RB Leipzig": 721,
  "Eintracht Frankfurt": 19,
  "VfL Wolfsburg": 11,
  "Wolfsburg": 11,
  "SC Freiburg": 17,
  "Freiburg": 17,
  "VfB Stuttgart": 10,
  "Stuttgart": 10,
  "TSG 1899 Hoffenheim": 2,
  "Hoffenheim": 2,
  "1. FSV Mainz 05": 15,
  "Mainz": 15,
  "FC Augsburg": 16,
  "Augsburg": 16,
  "SV Werder Bremen": 12,
  "Werder Bremen": 12,
  "Borussia Mönchengladbach": 18,
  "Mönchengladbach": 18,
  "1. FC Union Berlin": 9,
  "Union Berlin": 9,
  "1. FC Köln": 1,
  "Köln": 1,
  "VfL Bochum": 155,
  "Bochum": 155,
  "Darmstadt 98": 44,
  "Darmstadt": 44,
  "1. FC Heidenheim": 122,
  "Heidenheim": 122,
  "Holstein Kiel": 720,
  "Fortuna Düsseldorf": 24,
  "Düsseldorf": 24,

  // European / other
  "Paris Saint-Germain": 524,
  "PSG": 524,
  "Benfica": 1903,
  "Porto": 503,
  "FC Porto": 503,
  "Olympique Lyon": 523,
  "Lyon": 523,
  "Club Brujas": 851,
  "Club Brugge": 851,
  "AZ Alkmaar": 678,
  "Dinamo Zagreb": 755,
  "Genk": 832,
  "PAOK": 732,
};

// Clean string for fuzzy matching
function cleanNameForMatch(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bfc\b|\bcf\b|\bafc\b|\bssc\b|\bas\b|\bacf\b|\bss\b|\bus\b|\brc\b|\bcd\b|\bud\b|\brcd\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Find team ID by name (handles Supabase names → football-data.org API)
export function findTeamId(teamName: string): number | null {
  if (!teamName) return null;

  // Exact match
  if (teamIds[teamName]) return teamIds[teamName];

  const cleanSearch = cleanNameForMatch(teamName);

  // Clean exact match
  for (const [name, id] of Object.entries(teamIds)) {
    if (cleanNameForMatch(name) === cleanSearch) return id;
  }

  // Partial match
  for (const [name, id] of Object.entries(teamIds)) {
    const cleanEntry = cleanNameForMatch(name);
    if (cleanEntry.includes(cleanSearch) || cleanSearch.includes(cleanEntry)) {
      return id;
    }
  }

  return null;
}
