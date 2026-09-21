#!/usr/bin/env node
// sync-official-fixtures.js
// Regenera src/data/officialFixtures.json SOLO con datos reales verificados:
//  - Premier League, LaLiga, Serie A, Bundesliga: football-data.org API (temporada 2026/27)
//  - Champions League fase liga: ESPN scoreboard (144 partidos reales)
//  - Copa Italia: ESPN scoreboard (partidos reales + QF del propio ESPN)
//  - DFB-Pokal: ESPN scoreboard (primera ronda 2026/27)
//  - FA Cup / Copa del Rey: ESPN scoreboard (solo partidos entre equipos canónicos:
//    las rondas tempranas traen clubes no-league sin plantilla pronosticable)
//  - Europa/Conference League: ESPN scoreboard (144/108, fase liga)
// También regenera teamAliases.json: teamCups derivado de los datos reales y knockoutPairs.
// Ejecución: node scripts/sync-official-fixtures.js

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "src", "data");
const ALIASES_PATH = path.join(DATA_DIR, "teamAliases.json");
const FIXTURES_PATH = path.join(DATA_DIR, "officialFixtures.json");

const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY || "";

const { normalizeTeamName, matchIdToUuid } = require("./lib/score-utils.js");

// ---------------------------------------------------------------------------
// 1. Aliases nuevos (nombres de fuentes → canónicos). SOLO mapeos de nombres.
// ---------------------------------------------------------------------------

const NAME_ALIASES = {
  // UCL (ESPN)
  "aekathens": "AEK Athens",
  "fenerbahce": "Fenerbahçe",
  "fenerbahçe": "Fenerbahçe",
  "feyenoord": "Feyenoord",
  "feyenoordrotterdam": "Feyenoord",
  "lasklinz": "LASK Linz",
  "lask": "LASK Linz",
  "lens": "Lens",
  "lille": "Lille",
  "losclille": "Lille",
  "shakhtardonetsk": "Shakhtar Donetsk",
  "shakhtar": "Shakhtar Donetsk",
  "slovanbratislava": "Slovan Bratislava",
  "slovan": "Slovan Bratislava",
  "sabah": "SABAH FK",
  "sabahfk": "SABAH FK",
  "viking": "Viking FK",
  "vikingfk": "Viking FK",
  "celtic": "Celtic",
  "celticfc": "Celtic",
  "slaviaprague": "SK Slavia Praha",
  "olympiacos": "PAE Olympiakos SFP",
  "olympiacosfc": "PAE Olympiakos SFP",
  "internazionale": "Inter Milan",
  "inter": "Inter Milan",
  "clubbrugge": "Club Brujas",
  "brugge": "Club Brujas",
  "pseindhoven": "PSV",
  "psveindhoven": "PSV",
  "sportingcp": "Sporting Clube de Portugal",
  "porto": "Porto",
  "galatasaray": "Galatasaray SK",
  "bodo": "FK Bodø/Glimt",
  "bodoglimt": "FK Bodø/Glimt",
  "bodøglimt": "FK Bodø/Glimt",
  // UEL/UECL (Wikipedia)
  "rscanderlecht": "Anderlecht",
  "anderlecht": "Anderlecht",
  "fcararatarmenia": "Ararat-Armenia",
  "araratarmenia": "Ararat-Armenia",
  "besiktas": "Beşiktaş",
  "beşiktaş": "Beşiktaş",
  "nkcelje": "Celje",
  "celje": "Celje",
  "ferencvaros": "Ferencváros",
  "ferencváros": "Ferencváros",
  "hapoelbeersheva": "Hapoel Be'er Sheva",
  "hapoelbe'ersheva": "Hapoel Be'er Sheva",
  "jagiellonia": "Jagiellonia",
  "jagielloniabialystok": "Jagiellonia",
  "jagielloniabiałystok": "Jagiellonia",
  "lechpoznan": "Lech Poznań",
  "lechpoznań": "Lech Poznań",
  "levskisofia": "Levski Sofia",
  "lillestrom": "Lillestrøm",
  "lillestrøm": "Lillestrøm",
  "nec": "NEC",
  "necnijmegen": "NEC",
  "ofi": "OFI",
  "oficrete": "OFI",
  "acomonia": "AC Omonia",
  "omonia": "AC Omonia",
  "redbullsalzburg": "Red Bull Salzburg",
  "salzburg": "Red Bull Salzburg",
  "staderennais": "Rennes",
  "rennes": "Rennes",
  "spartaprague": "Sparta Prague",
  "sparta": "Sparta Prague",
  "sturmgraz": "Sturm Graz",
  "sturm": "Sturm Graz",
  "sunderland": "Sunderland",
  "sunderlandafc": "Sunderland",
  "torreense": "Torreense",
  "viktoriaplzen": "Viktoria Plzeň",
  "viktoriaplzeň": "Viktoria Plzeň",
  "plzen": "Viktoria Plzeň",
  "usg": "Royale Union Saint-Gilloise",
  "unionsaintgilloise": "Royale Union Saint-Gilloise",
  "olympiquelyonnais": "Olympique Lyon",
  "lyon": "Olympique Lyon",
  "agf": "AGF",
  "aarhusgymnastikforening": "AGF",
  "fkboracbanjaluka": "Borac Banja Luka",
  "boracbanjaluka": "Borac Banja Luka",
  "borac": "Borac Banja Luka",
  "scbraga": "Braga",
  "braga": "Braga",
  "skbrann": "Brann",
  "brann": "Brann",
  "pfcsskasofia": "CSKA Sofia",
  "csksofia": "CSKA Sofia",
  "kfegnatia": "Egnatia",
  "egnatia": "Egnatia",
  "fccopenhagen": "FC København",
  "fckobenhavn": "FC København",
  "copenhagen": "FC København",
  "kaagent": "Gent",
  "gent": "Gent",
  "hnkhajduksplit": "Hajduk Split",
  "hajduksplit": "Hajduk Split",
  "hajduk": "Hajduk Split",
  "heartofmidlothian": "Hearts",
  "hearts": "Hearts",
  "fciberia1999": "Iberia 1999",
  "iberia1999": "Iberia 1999",
  "iberia": "Iberia 1999",
  "interclubdescaldes": "Inter Club d'Escaldes",
  "fkjablonec": "Jablonec",
  "jablonec": "Jablonec",
  "kaunozalgiris": "Kauno Žalgiris",
  "kaunožalgiris": "Kauno Žalgiris",
  "kups": "KuPS",
  "lincolnredimps": "Lincoln Red Imps",
  "fclugano": "Lugano",
  "lugano": "Lugano",
  "fcmidtjylland": "Midtjylland",
  "midtjylland": "Midtjylland",
  "mjallby": "Mjällby",
  "mjällby": "Mjällby",
  "mjallbyaif": "Mjällby",
  "fcnordsjaelland": "Nordsjælland",
  "nordsjaelland": "Nordsjælland",
  "nordsjælland": "Nordsjælland",
  "pafos": "Pafos FC",
  "pafosfc": "Pafos FC",
  "paphos": "Pafos FC",
  "paphosfc": "Pafos FC",
  "panathinaikos": "Panathinaikos",
  "redstarbelgrade": "Red Star Belgrade",
  "redstar": "Red Star Belgrade",
  "crvenazvezda": "Red Star Belgrade",
  "rigafc": "Riga",
  "riga": "Riga",
  "sinttruiden": "Sint-Truiden",
  "sinttruidense": "Sint-Truiden",
  "fcthun": "Thun",
  "thun": "Thun",
  "trabzonspor": "Trabzonspor",
  "fctwente": "Twente",
  "twente": "Twente",
  "universitateacraiova": "Universitatea Craiova",
  "craiova": "Universitatea Craiova",
  "interclubdescaldes": "Inter Club d'Escaldes",
  // LaLiga (API)
  "realracing": "Racing Santander",
  "realracingclubdesantander": "Racing Santander",
  "racingsantander": "Racing Santander",
  "santander": "Racing Santander",
  "levante": "Levante",
  "levantetud": "Levante",
  "deportivo": "Deportivo La Coruña",
  "deportivolacoruna": "Deportivo La Coruña",
  "rcdeportivolacoruna": "Deportivo La Coruña",
  "deportivolacoruña": "Deportivo La Coruña",
  "malaga": "Málaga",
  "malagacf": "Málaga",
  "málaga": "Málaga",
  // PL (API)
  "coventrycity": "Coventry City",
  "coventrycityfc": "Coventry City",
  "hullcity": "Hull City",
  "hullcityafc": "Hull City",
  "leedsunited": "Leeds United",
  "leedsunitedfc": "Leeds United",
  // Nombres API football-data (liga doméstica)
  "1fckoln": "Köln",
  "1fcunionberlin": "Union Berlin",
  "1fsvmainz05": "Mainz",
  "fsvmainz05": "Mainz",
  "mainz05": "Mainz",
  "bayer04leverkusen": "Bayer Leverkusen",
  "fcbayernmunchen": "Bayern Munich",
  "bayernmunchen": "Bayern Munich",
  "bayernmunich": "Bayern Munich",
  "svwerderbremen": "Werder Bremen",
  "tsg1899hoffenheim": "Hoffenheim",
  "tsghoffenheim": "Hoffenheim",
  "vfbstuttgart": "Stuttgart",
  "borussiamonchengladbach": "Borussia Mönchengladbach",
  "fceintrachtfrankfurt": "Eintracht Frankfurt",
  "eintrachtfrankfurt": "Eintracht Frankfurt",
  "scfreiburg": "Freiburg",
  "rbleipzig": "RB Leipzig",
  "fcaugsburg": "Augsburg",
  "fcschalke04": "Schalke 04",
  "schalke04": "Schalke 04",
  "schalke": "Schalke 04",
  "hamburgersv": "Hamburger SV",
  "scpaderborn07": "SC Paderborn 07",
  "paderborn": "SC Paderborn 07",
  "sv07elversberg": "SV 07 Elversberg",
  "elversberg": "SV 07 Elversberg",
  "deportivoalaves": "Alavés",
  "alaves": "Alavés",
  "alavés": "Alavés",
  "getafecf": "Getafe",
  "sevillafc": "Sevilla",
  "rayovallecanodemadrid": "Rayo Vallecano",
  "rayovallecano": "Rayo Vallecano",
  "elchecf": "Elche",
  "atleticoclub": "Athletic Bilbao",
  "rccelta": "Celta Vigo",
  "cavosasuna": "Osasuna",
  "caosasuna": "Osasuna",
  "realmadridcf": "Real Madrid",
  "fcbarcelona": "Barcelona",
  "valenciacf": "Valencia",
  "acmilan": "AC Milan",
  "acmonza": "Monza",
  "acffiorentina": "Fiorentina",
  "asroma": "Roma",
  "atalantabc": "Atalanta",
  "bolognafc1909": "Bologna",
  "bologna": "Bologna",
  "cagliaricalcio": "Cagliari",
  "como1907": "Como",
  "fcinternazionalemilano": "Inter Milan",
  "frosinonecalcio": "Frosinone",
  "genoacfc": "Genoa",
  "juventusfc": "Juventus",
  "parmacalcio1913": "Parma",
  "sslazio": "Lazio",
  "sscnapoli": "Napoli",
  "torinofc": "Torino",
  "uslecce": "Lecce",
  "ussassuolocalcio": "Sassuolo",
  "udinesecalcio": "Udinese",
  "veneziafc": "Venezia",
  "afcbournemouth": "Bournemouth",
  "brightonhovealbionfc": "Brighton",
  "brightonhovealbion": "Brighton",
  "chelseafc": "Chelsea",
  "newcastleunitedfc": "Newcastle",
  "nottinghamforestfc": "Nott. Forest",
  "tottenhamhotspurfc": "Tottenham",
  "arsenalfc": "Arsenal",
  "astonvillafc": "Aston Villa",
  "brentfordfc": "Brentford",
  "crystalpalacefc": "Crystal Palace",
  "evertonfc": "Everton",
  "fulhamfc": "Fulham",
  "ipswichtownfc": "Ipswich Town",
  "liverpoolfc": "Liverpool",
  "manchestercityfc": "Manchester City",
  "manchesterunitedfc": "Manchester United",
  "wolverhampton": "Wolves",
  "wolverhamptonwanderers": "Wolves",
  "leicestercityfc": "Leicester City",
  "southamptonfc": "Southampton",
  "westhamunitedfc": "West Ham",
  "westham": "West Ham",
  "omonianicosia": "AC Omonia",
  "omonia": "AC Omonia",
  "unionstgilloise": "Royale Union Saint-Gilloise",
  "unionsaintgilloise": "Royale Union Saint-Gilloise",
  "csucraiova": "Universitatea Craiova",
  "craiova": "Universitatea Craiova",
  "interdescaldes": "Inter Club d'Escaldes",
  "interclubdescaldes": "Inter Club d'Escaldes",
  "kairatalmaty": "FK Kairat",
  "fkkairat": "FK Kairat",
};

// ---------------------------------------------------------------------------
// 2. Fetch fuentes
// ---------------------------------------------------------------------------

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120", ...headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

const LEAGUES_API = [
  ["Premier League", "PL", "2021"],
  ["LaLiga", "PD", "2014"],
  ["Serie A", "SA", "2019"],
  ["Bundesliga", "BL1", "2002"],
];

async function fetchLeagueFixtures(leagueName, code, apiCode) {
  const data = await fetchJson(
    `https://api.football-data.org/v4/competitions/${apiCode}/matches?season=2026`,
    { "X-Auth-Token": FOOTBALL_DATA_KEY }
  );
  const fixtures = [];
  for (const m of data.matches || []) {
    const home = normalizeTeamName(m.homeTeam.name);
    const away = normalizeTeamName(m.awayTeam.name);
    if (!home || !away || home.includes("TBD") || away.includes("TBD")) continue;
    fixtures.push({
      id: matchIdToUuid(m.id),
      home_team: home,
      away_team: away,
      match_date: m.utcDate,
      league: leagueName,
      competition_code: code,
      home_logo: m.homeTeam.crest || "",
      away_logo: m.awayTeam.crest || "",
      matchday: m.matchday || null,
    });
  }
  return fixtures;
}

async function fetchEspnFixtures(espnSlug, leagueName, code, from, to) {
  const dates = [];
  let curr = new Date(`${from.slice(0, 4)}-${from.slice(4, 6)}-${from.slice(6, 8)}T00:00:00Z`);
  const end = new Date(`${to.slice(0, 4)}-${to.slice(4, 6)}-${to.slice(6, 8)}T00:00:00Z`);
  while (curr <= end) {
    dates.push(curr.toISOString().slice(0, 10).replace(/-/g, ""));
    curr = new Date(curr.getTime() + 86400000);
  }

  const fixtures = [];
  const seenIds = new Set();

  for (let i = 0; i < dates.length; i += 15) {
    const slice = dates.slice(i, i + 15);
    const results = await Promise.all(
      slice.map(async (d) => {
        try {
          const url = `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${espnSlug}/scoreboard?dates=${d}`;
          const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120" },
          });
          if (!res.ok) return [];
          const data = await res.json();
          return data.events || [];
        } catch {
          return [];
        }
      })
    );

    for (const evs of results) {
      for (const e of evs) {
        if (seenIds.has(e.id)) continue;
        seenIds.add(e.id);

        const comp = e.competitions?.[0];
        if (!comp) continue;
        const homeC = comp.competitors?.find((c) => c.homeAway === "home");
        const awayC = comp.competitors?.find((c) => c.homeAway === "away");
        if (!homeC || !awayC) continue;
        const home = normalizeTeamName(homeC.team?.displayName || homeC.team?.name || "");
        const away = normalizeTeamName(awayC.team?.displayName || awayC.team?.name || "");
        if (!home || !away || home.includes("TBD") || away.includes("TBD")) continue;
        fixtures.push({
          id: matchIdToUuid(e.id),
          home_team: home,
          away_team: away,
          match_date: e.date,
          league: leagueName,
          competition_code: code,
          home_logo: homeC.team?.logos?.[0]?.href || homeC.team?.logo || "",
          away_logo: awayC.team?.logos?.[0]?.href || awayC.team?.logo || "",
          matchday: null,
        });
      }
    }
  }

  // Calculate matchdays by clustering dates (> 3 days apart)
  const sortedDates = [...new Set(fixtures.map((f) => f.match_date.slice(0, 10)))].sort();
  const mdByDate = {};
  let md = 1;
  let prev = null;
  sortedDates.forEach((d) => {
    if (prev && (new Date(d) - new Date(prev)) > 3 * 86400000) md++;
    mdByDate[d] = md;
    prev = d;
  });
  fixtures.forEach((f) => {
    f.matchday = mdByDate[f.match_date.slice(0, 10)] || null;
  });

  return fixtures;
}

// Equipos reales de UEL/UECL desde Wikipedia (plantillas name_XXX de la fase liga)
async function fetchWikipediaCupTeams(pageTitle) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(pageTitle)}&action=raw`,
        { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120" } }
      );
      if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
      const wt = await res.text();
      const teams = [];
      const re = /name_[A-Z0-9]+\s*=\{\{fbaicon\|[A-Z]{3}\}\}\s*\[\[[^\]]+\]\]/g;
      let m;
      while ((m = re.exec(wt))) {
        const part = m[0];
        // [[Link|Display]] o [[Display]]
        const link = part.match(/\[\[([^\[\]]+)\]\]/)[1];
        const display = link.includes("|") ? link.split("|").pop() : link;
        teams.push(display);
      }
      const seen = new Set();
      return teams.filter((t) => (seen.has(t) ? false : (seen.add(t), true)));
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🔄 Sincronizando calendarios oficiales 2026/27 (SOLO fuentes reales)...\n");

  // 3.1 Aliases nuevos
  const aliasesData = JSON.parse(fs.readFileSync(ALIASES_PATH, "utf8"));
  let aliasChanges = 0;
  for (const [key, value] of Object.entries(NAME_ALIASES)) {
    if (!aliasesData.aliasMap[key]) {
      aliasesData.aliasMap[key] = value;
      aliasChanges++;
    }
  }
  if (aliasChanges > 0) {
    fs.writeFileSync(ALIASES_PATH, JSON.stringify(aliasesData, null, 2) + "\n");
  }
  console.log(`✅ ${aliasChanges} aliases nuevos (nombres de fuentes → canónicos)`);

  const all = [];
  const sourceOf = {};

  // 3.2 Ligas domésticas (football-data API)
  for (const [leagueName, code, apiCode] of LEAGUES_API) {
    const fixtures = await fetchLeagueFixtures(leagueName, code, apiCode);
    console.log(`✅ ${leagueName}: ${fixtures.length} partidos (football-data API)`);
    all.push(...fixtures);
    fixtures.forEach((f) => (sourceOf[f.id] = `football-data:${leagueName}`));
    await new Promise((r) => setTimeout(r, 2000));
  }

  // 3.3 Champions League fase liga (ESPN, 144)
  const ucl = await fetchEspnFixtures("uefa.champions", "Champions League", "CL", "20260901", "20270131");
  // matchday real: agrupar fechas con separación > 3 días (cada jornada son 18 partidos)
  {
    const dates = [...new Set(ucl.map((f) => f.match_date.slice(0, 10)))].sort();
    const mdByDate = {};
    let md = 1;
    let prev = null;
    dates.forEach((d) => {
      if (prev && (new Date(d) - new Date(prev)) > 3 * 86400000) md++;
      mdByDate[d] = md;
      prev = d;
    });
    ucl.forEach((f) => { f.matchday = mdByDate[f.match_date.slice(0, 10)] || null; });
  }
  console.log(`✅ Champions League: ${ucl.length} partidos (ESPN)`);
  all.push(...ucl);
  ucl.forEach((f) => (sourceOf[f.id] = "ESPN:UCL"));

  // 3.4 Copa Italia (ESPN, partidos reales)
  const coppa = await fetchEspnFixtures("ita.coppa_italia", "Copa Italia", "CI", "20260801", "20270531");
  console.log(`✅ Copa Italia: ${coppa.length} partidos reales (ESPN)`);
  all.push(...coppa);
  coppa.forEach((f) => (sourceOf[f.id] = "ESPN:CopaItalia"));

  // 3.5 DFB-Pokal (ESPN, primera ronda 2026/27)
  const dfb = await fetchEspnFixtures("ger.dfb_pokal", "DFB-Pokal", "DFB", "20260801", "20270601");
  console.log(`✅ DFB-Pokal: ${dfb.length} partidos (ESPN)`);
  all.push(...dfb);
  dfb.forEach((f) => (sourceOf[f.id] = "ESPN:DFBPokal"));

  // 3.6 Europa League (ESPN, 144)
  const uel = await fetchEspnFixtures("uefa.europa", "Europa League", "EL", "20260901", "20270131");
  console.log(`✅ Europa League: ${uel.length} partidos (ESPN)`);
  all.push(...uel);
  uel.forEach((f) => (sourceOf[f.id] = "ESPN:UEL"));

  // 3.7 Conference League (ESPN, 108)
  const uecl = await fetchEspnFixtures("uefa.europa.conf", "Conference League", "ECL", "20260901", "20270131");
  console.log(`✅ Conference League: ${uecl.length} partidos (ESPN)`);
  all.push(...uecl);
  uecl.forEach((f) => (sourceOf[f.id] = "ESPN:UECL"));

  // Filtro de equipos canónicos para las copas con clubes pequeños: solo se
  // aceptan partidos donde AMBOS equipos están en canonicalDbTeams (los mismos
  // que sincroniza sync-db.js a la tabla teams y que tienen plantilla en
  // officialPlayers.json). Sin esto, el validador falla y el juego permitiría
  // pronosticar/elegir clubes sin datos.
  const canonicalTeams = new Set(aliasesData.canonicalDbTeams);
  const keepCanonical = (list) =>
    list.filter((f) => canonicalTeams.has(f.home_team) && canonicalTeams.has(f.away_team));

  // 3.8 FA Cup (ESPN, 2026/27)
  const facupAll = await fetchEspnFixtures("eng.fa", "FA Cup", "FAC", "20260801", "20270531");
  const facup = keepCanonical(facupAll);
  console.log(`✅ FA Cup: ${facup.length} partidos canónicos (${facupAll.length - facup.length} descartados con clubes no-league) (ESPN)`);
  all.push(...facup);
  facup.forEach((f) => (sourceOf[f.id] = "ESPN:FACup"));

  // 3.9 Copa del Rey (ESPN, 2026/27)
  const cdrAll = await fetchEspnFixtures("esp.copa_del_rey", "Copa del Rey", "CDR", "20260801", "20270531");
  const cdr = keepCanonical(cdrAll);
  console.log(`✅ Copa del Rey: ${cdr.length} partidos canónicos (${cdrAll.length - cdr.length} descartados con clubes no-league) (ESPN)`);
  all.push(...cdr);
  cdr.forEach((f) => (sourceOf[f.id] = "ESPN:CopaDelRey"));

  // 3.10 Regenerar teamCups con los equipos reales (derivados de las fuentes)
  {
    const teamCups = {};
    const addCup = (team, cup) => {
      if (!team || !cup) return;
      teamCups[team] = teamCups[team] || [];
      if (!teamCups[team].includes(cup)) teamCups[team].push(cup);
    };
    const domCup = {
      "Premier League": "facup", "LaLiga": "copadelrey", "Serie A": "coppaitalia", "Bundesliga": "dfbpokal",
    };
    const CUP_LEAGUES = new Set(["Copa Italia", "DFB-Pokal", "FA Cup", "Copa del Rey"]);
    const EUROPEAN_LEAGUES = new Set(["Champions League", "Europa League", "Conference League"]);
    const leagueTeams = {};
    all.forEach((f) => {
      if (CUP_LEAGUES.has(f.league) || EUROPEAN_LEAGUES.has(f.league)) return;
      leagueTeams[f.league] = leagueTeams[f.league] || new Set();
      leagueTeams[f.league].add(f.home_team);
      leagueTeams[f.league].add(f.away_team);
    });
    Object.entries(leagueTeams).forEach(([league, teams]) => {
      [...teams].forEach((t) => addCup(t, domCup[league]));
    });
    // Copa Italia: participantes reales
    coppa.forEach((f) => { addCup(f.home_team, "coppaitalia"); addCup(f.away_team, "coppaitalia"); });
    // DFB-Pokal: participantes reales
    dfb.forEach((f) => { addCup(f.home_team, "dfbpokal"); addCup(f.away_team, "dfbpokal"); });
    // FA Cup: participantes reales (ya filtrados a canónicos)
    facup.forEach((f) => { addCup(f.home_team, "facup"); addCup(f.away_team, "facup"); });
    // Copa del Rey: participantes reales (ya filtrados a canónicos)
    cdr.forEach((f) => { addCup(f.home_team, "copadelrey"); addCup(f.away_team, "copadelrey"); });
    // UCL: equipos reales de ESPN
    const uclTeams = [...new Set(ucl.flatMap((f) => [f.home_team, f.away_team]))];
    uclTeams.forEach((t) => addCup(t, "champions"));
    // UEL: equipos reales de ESPN
    const uelTeams = [...new Set(uel.flatMap((f) => [f.home_team, f.away_team]))];
    uelTeams.forEach((t) => addCup(t, "europa"));
    // UECL: equipos reales de ESPN
    const ueclTeams = [...new Set(uecl.flatMap((f) => [f.home_team, f.away_team]))];
    ueclTeams.forEach((t) => addCup(t, "conference"));

    aliasesData.teamCups = Object.fromEntries(Object.entries(teamCups).sort((a, b) => a[0].localeCompare(b[0], "es")));
    aliasesData.knockoutPairs = { champions: [], europa: [], conference: [] };
    fs.writeFileSync(ALIASES_PATH, JSON.stringify(aliasesData, null, 2) + "\n");
    console.log(`✅ teamCups regenerado: ${Object.keys(aliasesData.teamCups).length} equipos (${uclTeams.length} UCL, ${uelTeams.length} UEL, ${ueclTeams.length} UECL)`);
  }

  // 3.11 Ordenar y escribir
  all.sort((a, b) => new Date(a.match_date) - new Date(b.match_date) || a.league.localeCompare(b.league));
  fs.writeFileSync(FIXTURES_PATH, JSON.stringify(all, null, 2) + "\n");
  console.log(`\n✅ officialFixtures.json escrito: ${all.length} fixtures`);
  console.log(`   (${all.filter((f) => !f.home_team.includes("TBD")).length} con equipos reales)`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
