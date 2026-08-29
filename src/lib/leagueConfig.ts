// League colors for UI
export const leagueColors: Record<string, string> = {
  "Premier League": "#c084fc",
  "LaLiga": "#fb923c",
  "Serie A": "#38bdf8",
  "Bundesliga": "#f87171",
  "Champions League": "#60a5fa",
  "Europa League": "#fb923c",
  "Conference League": "#4ade80",
  "Copa Italia": "#38bdf8",
};

// League logos (local files)
export const leagueLogos: Record<string, string> = {
  "Premier League": "/4to-Concurso-Interliga/logos/premier.png",
  "LaLiga": "/4to-Concurso-Interliga/logos/laliga.png",
  "Serie A": "/4to-Concurso-Interliga/logos/seriea.png",
  "Bundesliga": "/4to-Concurso-Interliga/logos/bundesliga.png",
  "Champions League": "/4to-Concurso-Interliga/logos/champions.png",
  "Europa League": "/4to-Concurso-Interliga/logos/europa.png",
  "Conference League": "/4to-Concurso-Interliga/logos/conference.png",
  "Copa Italia": "/4to-Concurso-Interliga/logos/coppaitalia.png",
};

// Map league name to slug
export const leagueNameToSlug: Record<string, string> = {
  "Premier League": "premier",
  "LaLiga": "laliga",
  "Serie A": "seriea",
  "Bundesliga": "bundesliga",
  "Champions League": "champions",
  "Europa League": "europa",
  "Conference League": "conference",
  "Copa Italia": "coppaitalia",
};

// Map slug to display name
export const leagueSlugToName: Record<string, string> = {
  premier: "Premier League",
  laliga: "LaLiga",
  seriea: "Serie A",
  bundesliga: "Bundesliga",
  champions: "Champions League",
  europa: "Europa League",
  conference: "Conference League",
  coppaitalia: "Copa Italia",
};

import teamData from "@/data/teamAliases.json";

export const canonicalDbTeams: string[] = teamData.canonicalDbTeams;

// Normalized team names cleaner
export function cleanTeamName(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bfc\b|\bcf\b|\bafc\b|\bssc\b|\bas\b|\bacf\b|\bss\b|\bus\b|\brc\b|\bcd\b|\bud\b|\brcd\b|\bca\b|\b1\.\b|\bvfb\b|\bvfl\b|\btsg\b|\bfsv\b|\bsv\b|\brb\b|\bbvb\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

const aliasMap: Record<string, string> = teamData.aliasMap;

/**
 * Normalizes any external or API team name to the exact Supabase DB name
 */
export function normalizeTeamName(name: string): string {
  if (!name) return "";
  const cleaned = cleanTeamName(name);
  if (aliasMap[cleaned]) return aliasMap[cleaned];

  for (const dbName of canonicalDbTeams) {
    if (cleanTeamName(dbName) === cleaned) return dbName;
  }
  for (const dbName of canonicalDbTeams) {
    const cDb = cleanTeamName(dbName);
    if (cleaned.includes(cDb) || cDb.includes(cleaned)) return dbName;
  }
  return name;
}

// Known Interliga tournament match pairings
const conferenceKeyPairs = new Set(teamData.knockoutPairs.conference);
const europaKeyPairs = new Set(teamData.knockoutPairs.europa);
const championsKeyPairs = new Set(teamData.knockoutPairs.champions);

/**
 * Parse an API competition code or name to standard league name
 */
export function parseCompetitionName(compNameOrCode?: string): string | null {
  if (!compNameOrCode) return null;
  const val = compNameOrCode.toUpperCase().trim();
  const lower = compNameOrCode.toLowerCase().trim();

  if (val === "PL" || lower.includes("premier")) return "Premier League";
  if (val === "PD" || lower.includes("laliga") || lower.includes("primera division")) return "LaLiga";
  if (val === "SA" || lower.includes("serie a")) return "Serie A";
  if (val === "BL1" || lower.includes("bundesliga")) return "Bundesliga";
  if (val === "CL" || lower.includes("champions league")) return "Champions League";
  if (val === "EL" || lower.includes("europa league")) return "Europa League";
  if (val === "ECL" || lower.includes("conference")) return "Conference League";
  if (val === "CLI" || val === "CIT" || lower.includes("coppa italia") || lower.includes("copa italia")) return "Copa Italia";

  return null;
}

export function isKnockoutCup(leagueOrSlug: string): boolean {
  const norm = leagueOrSlug.toLowerCase().trim();
  return (
    norm.includes("champions") ||
    norm.includes("europa") ||
    norm.includes("conference") ||
    norm.includes("copa italia") ||
    norm.includes("coppa") ||
    norm.includes("fa cup") ||
    norm.includes("copa del rey") ||
    norm.includes("dfb-pokal") ||
    norm.includes("dfb pokal") ||
    norm === "cl" ||
    norm === "el" ||
    norm === "ecl" ||
    norm === "ci" ||
    norm === "facup" ||
    norm === "copadelrey" ||
    norm === "dfbpokal"
  );
}

export function getKnockoutCupSlug(league: string): string | null {
  if (!league) return null;
  const lower = league.toLowerCase();
  if (lower.includes("champions")) return "champions";
  if (lower.includes("europa") && !lower.includes("conference")) return "europa";
  if (lower.includes("conference")) return "conference";
  if (lower.includes("copa italia") || lower.includes("coppa")) return "coppaitalia";
  if (lower.includes("fa cup")) return "facup";
  if (lower.includes("copa del rey")) return "copadelrey";
  if (lower.includes("dfb-pokal") || lower.includes("dfb pokal")) return "dfbpokal";
  return null;
}

/**
 * Returns the real round name for a knockout match based on date and tournament.
 */
export function getKnockoutRound(matchDate: string, tournamentSlug: string): string {
  if (!matchDate) return "Ronda KO";
  const d = new Date(matchDate);
  if (isNaN(d.getTime())) return "Ronda KO";

  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();

  if (tournamentSlug === "champions" || tournamentSlug === "europa" || tournamentSlug === "conference") {
    if (month === 2 || (month === 3 && day <= 20)) return "Octavos de Final";
    if ((month === 3 && day > 20) || (month === 4 && day <= 20)) return "Cuartos de Final";
    if ((month === 4 && day > 20) || (month === 5 && day <= 15)) return "Semifinal";
    if (month >= 5) return "Final";
  }
  if (tournamentSlug === "coppaitalia") {
    if (month === 12 || month === 1) return "Octavos de Final";
    if (month === 2) return "Cuartos de Final";
    if (month === 3 || month === 4) return "Semifinal";
    if (month >= 5) return "Final";
  }
  if (tournamentSlug === "facup") {
    if (month === 1) return "Tercera Ronda";
    if (month === 2 && day <= 15) return "Cuarta Ronda";
    if ((month === 2 && day > 15) || (month === 3 && day <= 10)) return "Quinta Ronda";
    if ((month === 3 && day > 10) || (month === 4 && day <= 15)) return "Cuartos de Final";
    if ((month === 4 && day > 15) || (month === 5 && day <= 10)) return "Semifinal";
    if (month >= 5) return "Final";
  }
  if (tournamentSlug === "copadelrey") {
    if (month === 12) return "Dieciseisavos";
    if (month === 1) return "Octavos de Final";
    if (month === 2) return "Cuartos de Final";
    if (month === 3 || (month === 4 && day <= 15)) return "Semifinal";
    if (month >= 4) return "Final";
  }
  if (tournamentSlug === "dfbpokal") {
    if (month <= 8) return "Primera Ronda";
    if (month === 9 || month === 10 || month === 11) return "Segunda Ronda";
    if (month === 12 || month === 1) return "Octavos de Final";
    if (month === 2) return "Cuartos de Final";
    if (month === 3 || month === 4 || (month === 5 && day <= 15)) return "Semifinal";
    if (month >= 5) return "Final";
  }
  return "Ronda KO";
}

/**
 * True when a match belongs to the contest's official knockout pairings
 * (or domestic cups), used by the Survivor mechanic. Group-stage cup games are NOT knockout.
 */
export function isKnockoutMatch(homeTeam: string, awayTeam: string, league?: string): boolean {
  // 1. Verificar por pares pre-enumerados (Champions, Europa, Conference)
  const cHome = cleanTeamName(homeTeam);
  const cAway = cleanTeamName(awayTeam);
  const pairKey = `${cHome}-${cAway}`;
  if (conferenceKeyPairs.has(pairKey)) return true;
  if (europaKeyPairs.has(pairKey)) return true;
  if (championsKeyPairs.has(pairKey)) return true;

  // 2. Verificar por nombre de competición (copas domésticas)
  if (league) {
    const lower = league.toLowerCase();
    if (lower.includes("copa italia") || lower.includes("coppa")) return true;
    if (lower.includes("fa cup")) return true;
    if (lower.includes("copa del rey")) return true;
    if (lower.includes("dfb-pokal") || lower.includes("dfb pokal")) return true;
  }
  return false;
}

/**
 * Normalizes a match's league based on official tournament pairs, API data and date
 */
export function normalizeMatchLeague(
  homeTeam: string,
  awayTeam: string,
  matchDate?: string,
  originalLeague?: string
): string {
  const parsedFromOriginal = parseCompetitionName(originalLeague);
  
  const cHome = cleanTeamName(homeTeam);
  const cAway = cleanTeamName(awayTeam);
  const pairKey = `${cHome}-${cAway}`;

  if (conferenceKeyPairs.has(pairKey)) return "Conference League";
  if (europaKeyPairs.has(pairKey)) return "Europa League";
  if (championsKeyPairs.has(pairKey)) return "Champions League";

  if (matchDate) {
    const d = new Date(matchDate);
    if (d.getMonth() === 11 && d.getDate() >= 16 && d.getDate() <= 19) {
      return "Copa Italia";
    }
  }

  if (parsedFromOriginal) return parsedFromOriginal;

  return originalLeague || "Premier League";
}

/**
 * Converts any match identifier (numeric API id, string, or UUID) to a valid, deterministic UUID
 */
export function matchIdToUuid(id: string | number): string {
  const str = String(id).trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str.toLowerCase();
  }
  const num = parseInt(str.replace(/\D/g, ""), 10);
  if (!isNaN(num) && num > 0) {
    const hex = num.toString(16).padStart(12, "0").slice(-12);
    return `00000000-0000-4000-8000-${hex}`;
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(12, "0").slice(-12);
  return `00000000-0000-4000-8000-${hex}`;
}
