// League colors for UI
export const leagueColors: Record<string, string> = {
  "Premier League": "#3d195b",
  "LaLiga": "#ee8707",
  "Serie A": "#024494",
  "Bundesliga": "#d20515",
  "Champions League": "#1a4b8e",
  "Europa League": "#f37920",
  "Conference League": "#00843d",
  "Copa Italia": "#024494",
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

export const canonicalDbTeams = [
  "AC Milan", "Alavés", "Almería", "Arsenal", "Aston Villa", "Atalanta",
  "Athletic Bilbao", "Atlético Madrid", "Augsburg", "AZ Alkmaar", "Barcelona",
  "Bayer Leverkusen", "Bayern Munich", "Benfica", "Bochum", "Bologna",
  "Borussia Dortmund", "Borussia Mönchengladbach", "Bournemouth", "Brentford",
  "Brighton", "Cagliari", "Celta Vigo", "Chelsea", "Club Brujas", "Como",
  "Crystal Palace", "Darmstadt", "Dinamo Zagreb", "Düsseldorf",
  "Eintracht Frankfurt", "Elche", "Empoli", "Espanyol", "Everton",
  "Fiorentina", "Freiburg", "Frosinone", "Fulham", "Genk", "Genoa",
  "Getafe", "Girona", "Heidenheim", "Hoffenheim", "Holstein Kiel",
  "Inter Milan", "Ipswich Town", "Juventus", "Köln", "Las Palmas",
  "Lazio", "Lecce", "Leganés", "Leicester City", "Liverpool",
  "Mainz", "Mallorca", "Manchester City", "Manchester United", "Monza",
  "Napoli", "Newcastle", "Nott. Forest", "Olympique Lyon", "Osasuna",
  "PAOK", "Paris Saint-Germain", "Parma", "Porto", "RB Leipzig",
  "Rayo Vallecano", "Real Betis", "Real Madrid", "Real Sociedad",
  "Real Valladolid", "Roma", "Salernitana", "Sassuolo", "Sevilla",
  "Southampton", "Stuttgart", "Torino", "Tottenham", "Udinese",
  "Union Berlin", "Valencia", "Venezia", "Verona", "Villarreal",
  "Werder Bremen", "West Ham", "Wolfsburg", "Wolves"
];

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

const aliasMap: Record<string, string> = {
  "brightonandhovealbion": "Brighton",
  "nottinghamforest": "Nott. Forest",
  "wolverhamptonwanderers": "Wolves",
  "athleticclub": "Athletic Bilbao",
  "athleticclubdebilbao": "Athletic Bilbao",
  "clubatletico": "Atlético Madrid",
  "clubatleticodemadrid": "Atlético Madrid",
  "atletico": "Atlético Madrid",
  "atleticodemadrid": "Atlético Madrid",
  "atleticomadrid": "Atlético Madrid",
  "celtadevigo": "Celta Vigo",
  "rcceltadevigo": "Celta Vigo",
  "caosasuna": "Osasuna",
  "osasuna": "Osasuna",
  "rcdmallorca": "Mallorca",
  "mallorca": "Mallorca",
  "laspalmas": "Las Palmas",
  "udlaspalmas": "Las Palmas",
  "rayovallecano": "Rayo Vallecano",
  "rayovallecanodemadrid": "Rayo Vallecano",
  "espanyol": "Espanyol",
  "rcdespanyol": "Espanyol",
  "rcdespanyoldebarcelona": "Espanyol",
  "espanyoldebarcelona": "Espanyol",
  "cdleganes": "Leganés",
  "leganes": "Leganés",
  "deportivoalaves": "Alavés",
  "alaves": "Alavés",
  "realvalladolid": "Real Valladolid",
  "realbetis": "Real Betis",
  "realbetisbalompie": "Real Betis",
  "internazionale": "Inter Milan",
  "internazionalemilano": "Inter Milan",
  "inter": "Inter Milan",
  "intermilan": "Inter Milan",
  "asroma": "Roma",
  "roma": "Roma",
  "sslazio": "Lazio",
  "lazio": "Lazio",
  "acffiorentina": "Fiorentina",
  "fiorentina": "Fiorentina",
  "torino": "Torino",
  "bologna": "Bologna",
  "bologna1909": "Bologna",
  "genoa": "Genoa",
  "acmonza": "Monza",
  "monza": "Monza",
  "cagliari": "Cagliari",
  "cagliaricalcio": "Cagliari",
  "udinese": "Udinese",
  "udinesecalcio": "Udinese",
  "sassuolo": "Sassuolo",
  "ussassuolo": "Sassuolo",
  "empoli": "Empoli",
  "lecce": "Lecce",
  "uslecce": "Lecce",
  "parma": "Parma",
  "parmacalcio": "Parma",
  "parmacalcio1913": "Parma",
  "venezia": "Venezia",
  "como": "Como",
  "como1907": "Como",
  "verona": "Verona",
  "hellasverona": "Verona",
  "bayern": "Bayern Munich",
  "bayernmunchen": "Bayern Munich",
  "bayernmunich": "Bayern Munich",
  "bayerleverkusen": "Bayer Leverkusen",
  "bayer04leverkusen": "Bayer Leverkusen",
  "mainz": "Mainz",
  "mainz05": "Mainz",
  "augsburg": "Augsburg",
  "werderbremen": "Werder Bremen",
  "unionberlin": "Union Berlin",
  "heidenheim": "Heidenheim",
  "heidenheim1846": "Heidenheim",
  "koln": "Köln",
  "bochum": "Bochum",
  "bochum1848": "Bochum",
  "darmstadt": "Darmstadt",
  "darmstadt98": "Darmstadt",
  "dusseldorf": "Düsseldorf",
  "fortunadusseldorf": "Düsseldorf",
  "stuttgart": "Stuttgart",
  "hoffenheim": "Hoffenheim",
  "1899hoffenheim": "Hoffenheim",
  "manchesterunited": "Manchester United",
  "manchesterunitedfc": "Manchester United",
  "manunited": "Manchester United",
  "manchestercity": "Manchester City",
  "manchestercityfc": "Manchester City",
  "mancity": "Manchester City",
  "ipswichtown": "Ipswich Town",
  "ipswichtownfc": "Ipswich Town",
  "everton": "Everton",
  "evertonfc": "Everton",
  "arsenal": "Arsenal",
  "arsenalfc": "Arsenal",
  "chelsea": "Chelsea",
  "chelseafc": "Chelsea",
  "liverpool": "Liverpool",
  "liverpoolfc": "Liverpool",
  "tottenham": "Tottenham",
  "tottenhamhotspur": "Tottenham",
  "tottenhamhotspurfc": "Tottenham",
  "westham": "West Ham",
  "westhamunited": "West Ham",
  "westhamunitedfc": "West Ham",
  "newcastle": "Newcastle",
  "newcastleunited": "Newcastle",
  "newcastleunitedfc": "Newcastle"
};

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
const conferenceKeyPairs = new Set([
  "fiorentina-westham", "westham-fiorentina",
  "villarreal-clubbrujas", "clubbrujas-villarreal", "villarreal-brujas", "brujas-villarreal", "villarreal-clubbrugge", "clubbrugge-villarreal",
  "westham-villarreal", "villarreal-westham",
  "fiorentina-clubbrujas", "clubbrujas-fiorentina", "fiorentina-brujas", "brujas-fiorentina", "fiorentina-clubbrugge", "clubbrugge-fiorentina",
  "fiorentina-villarreal", "villarreal-fiorentina",
  "clubbrujas-westham", "westham-clubbrujas", "brujas-westham", "westham-brujas", "clubbrugge-westham", "westham-clubbrugge"
]);

const europaKeyPairs = new Set([
  "manchesterunited-roma", "roma-manchesterunited", "manunited-roma", "roma-manunited",
  "manchesterunited-realsociedad", "realsociedad-manchesterunited", "manunited-realsociedad", "realsociedad-manunited",
  "manchesterunited-bayerleverkusen", "bayerleverkusen-manchesterunited", "manunited-bayerleverkusen", "bayerleverkusen-manunited", "manchesterunited-leverkusen", "leverkusen-manchesterunited",
  "tottenham-bayerleverkusen", "bayerleverkusen-tottenham", "tottenham-leverkusen", "leverkusen-tottenham",
  "tottenham-roma", "roma-tottenham",
  "tottenham-olympiquelyon", "olympiquelyon-tottenham", "tottenham-lyon", "lyon-tottenham",
  "realsociedad-tottenham", "tottenham-realsociedad",
  "roma-bayerleverkusen", "bayerleverkusen-roma", "roma-leverkusen", "leverkusen-roma",
  "bayerleverkusen-lazio", "lazio-bayerleverkusen", "leverkusen-lazio", "lazio-leverkusen",
  "lazio-realsociedad", "realsociedad-lazio",
  "realsociedad-atalanta", "atalanta-realsociedad",
  "atalanta-olympiquelyon", "olympiquelyon-atalanta", "atalanta-lyon", "lyon-atalanta",
  "olympiquelyon-lazio", "lazio-olympiquelyon", "lyon-lazio", "lazio-lyon",
  "olympiquelyon-manchesterunited", "manchesterunited-olympiquelyon", "lyon-manunited", "manunited-lyon",
  "azalkmaar-dinamozagreb", "dinamozagreb-azalkmaar",
  "genk-paok", "paok-genk",
  "paok-azalkmaar", "azalkmaar-paok",
  "dinamozagreb-genk", "genk-dinamozagreb",
  "azalkmaar-genk", "genk-azalkmaar",
  "paok-dinamozagreb", "dinamozagreb-paok"
]);

const championsKeyPairs = new Set([
  "manchestercity-realmadrid", "realmadrid-manchestercity", "mancity-realmadrid", "realmadrid-mancity",
  "barcelona-bayernmunich", "bayernmunich-barcelona", "barcelona-bayern", "bayern-barcelona",
  "arsenal-parissaintgermain", "parissaintgermain-arsenal", "arsenal-psg", "psg-arsenal",
  "liverpool-intermilan", "intermilan-liverpool", "liverpool-inter", "inter-liverpool",
  "borussiadortmund-napoli", "napoli-borussiadortmund", "dortmund-napoli", "napoli-dortmund",
  "acmilan-chelsea", "chelsea-acmilan", "milan-chelsea", "chelsea-milan",
  "atleticomadrid-juventus", "juventus-atleticomadrid", "atletico-juventus", "juventus-atletico",
  "rbleipzig-benfica", "benfica-rbleipzig", "leipzig-benfica", "benfica-leipzig",
  "barcelona-arsenal", "arsenal-barcelona",
  "realmadrid-liverpool", "liverpool-realmadrid",
  "manchestercity-intermilan", "intermilan-manchestercity", "mancity-inter", "inter-mancity",
  "bayernmunich-parissaintgermain", "parissaintgermain-bayernmunich", "bayern-psg", "psg-bayern"
]);

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
