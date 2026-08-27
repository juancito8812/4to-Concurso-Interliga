const BASE_URL = "https://api.football-data.org/v4";

const API_KEY = process.env.NEXT_PUBLIC_FOOTBALL_DATA_KEY || "";

const headers = {
  "X-Auth-Token": API_KEY,
};

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
  "Southampton": 340,
  "Southampton FC": 340,
  "Tottenham": 73,
  "Tottenham Hotspur FC": 73,
  "West Ham": 563,
  "West Ham United FC": 563,
  "Wolverhampton": 76,
  "Wolverhampton Wanderers FC": 76,
  "Sunderland": 71,
  "Sunderland AFC": 71,

  // LaLiga
  "Athletic Club": 77,
  "Athletic Club de Bilbao": 77,
  "Atlético Madrid": 78,
  "Club Atlético de Madrid": 78,
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
  "CD Leganés": 250,
  "Alavés": 263,
  "Deportivo Alavés": 263,
  "Valladolid": 262,
  "Real Valladolid CF": 262,
  "Elche": 285,
  "Elche CF": 285,

  // Serie A
  "Inter Milan": 108,
  "FC Internazionale Milano": 108,
  "Inter": 108,
  "AC Milan": 98,
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
};

// Find team ID by name (handles Supabase names → football-data.org API)
export function findTeamId(teamName: string): number | null {
  // Exact match
  if (teamIds[teamName]) return teamIds[teamName];

  // Case-insensitive exact
  const lower = teamName.toLowerCase();
  for (const [name, id] of Object.entries(teamIds)) {
    if (name.toLowerCase() === lower) return id;
  }

  // Partial match: API name contains search OR search contains API name
  for (const [name, id] of Object.entries(teamIds)) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes(lower) || lower.includes(nameLower)) {
      return id;
    }
  }

  // Word-level match: any word from teamName matches any word from API name
  const searchWords = lower.split(/\s+/);
  for (const [name, id] of Object.entries(teamIds)) {
    const nameWords = name.toLowerCase().split(/\s+/);
    const hasMatch = searchWords.some(sw => nameWords.some(nw => nw === sw || nw.includes(sw) || sw.includes(nw)));
    if (hasMatch) return id;
  }

  return null;
}
