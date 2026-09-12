#!/usr/bin/env node
// sync-player-squads.js — Actualiza las plantillas oficiales 2026/27 tras el cierre del mercado
// Obtiene las plantillas actualizadas en vivo desde ESPN para todas las competiciones del concurso.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "src", "data");
const PUBLIC_DATA_DIR = path.join(__dirname, "..", "public", "data");
const PLAYERS_SRC_PATH = path.join(DATA_DIR, "officialPlayers.json");
const PLAYERS_PUB_PATH = path.join(PUBLIC_DATA_DIR, "officialPlayers.json");
const FIXTURES_PATH = path.join(DATA_DIR, "officialFixtures.json");
const ALIASES_PATH = path.join(DATA_DIR, "teamAliases.json");

const { normalizeTeamName, cleanTeamName } = require("./lib/score-utils.js");

const POS_MAP = {
  Goalkeeper: "Arquero",
  Defender: "Defensor",
  Midfielder: "Mediocampista",
  Forward: "Delantero",
  Attacker: "Delantero",
};

const LEAGUE_COMPETITIONS = [
  // Ligas Principales
  { slug: "eng.1", leagueName: "Premier League" },
  { slug: "esp.1", leagueName: "LaLiga" },
  { slug: "ita.1", leagueName: "Serie A" },
  { slug: "ger.1", leagueName: "Bundesliga" },
  // Competiciones Europeas
  { slug: "uefa.champions", leagueName: "Champions League" },
  { slug: "uefa.europa", leagueName: "Europa League" },
  { slug: "uefa.europa.conf", leagueName: "Conference League" },
  // Copas Domésticas
  { slug: "ita.coppa_italia", leagueName: "Copa Italia" },
  { slug: "ger.dfb_pokal", leagueName: "DFB-Pokal" },
  { slug: "eng.fa", leagueName: "FA Cup" },
  { slug: "esp.copa_del_rey", leagueName: "Copa del Rey" },
  // Ligas europeas para clubes de UEFA
  { slug: "fra.1", leagueName: "Ligue 1" },
  { slug: "por.1", leagueName: "Primeira Liga" },
  { slug: "ned.1", leagueName: "Eredivisie" },
  { slug: "tur.1", leagueName: "Süper Lig" },
  { slug: "bel.1", leagueName: "Belgian Pro League" },
  { slug: "gre.1", leagueName: "Super League Greece" },
  { slug: "aut.1", leagueName: "Austrian Bundesliga" },
  { slug: "sco.1", leagueName: "Scottish Premiership" },
  { slug: "cze.1", leagueName: "Czech First League" },
  { slug: "nor.1", leagueName: "Eliteserien" },
  { slug: "den.1", leagueName: "Danish Superliga" },
  { slug: "sui.1", leagueName: "Swiss Super League" },
  { slug: "ukr.1", leagueName: "Ukrainian Premier League" },
  { slug: "cro.1", leagueName: "HNL" },
  { slug: "ser.1", leagueName: "Serbian SuperLiga" },
  { slug: "pol.1", leagueName: "Ekstraklasa" },
  { slug: "swe.1", leagueName: "Allsvenskan" },
  { slug: "hun.1", leagueName: "NB I" },
  { slug: "svk.1", leagueName: "Slovak Super Liga" },
  { slug: "aze.1", leagueName: "Azerbaijan Premier League" },
  { slug: "cyp.1", leagueName: "Cypriot First Division" },
  { slug: "isr.1", leagueName: "Israeli Premier League" },
  { slug: "kaz.1", leagueName: "Kazakhstan Premier League" },
  { slug: "fin.1", leagueName: "Veikkausliiga" },
  { slug: "slo.1", leagueName: "Slovenian PrvaLiga" },
  { slug: "arm.1", leagueName: "Armenian Premier League" },
  { slug: "bih.1", leagueName: "Premier League of Bosnia" },
  { slug: "wal.1", leagueName: "Cymru Premier" },
  { slug: "fro.1", leagueName: "Faroe Islands Premier League" },
  { slug: "lat.1", leagueName: "Virsliga" },
  { slug: "irl.1", leagueName: "League of Ireland" },
];

async function fetchJson(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

async function getTeamsForLeague(slug) {
  try {
    const data = await fetchJson(
      `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams`
    );
    const teams =
      data.sports?.[0]?.leagues?.[0]?.teams?.map((t) => t.team) || [];
    return teams;
  } catch (e) {
    console.warn(`[${slug}] Error al listar equipos: ${e.message}`);
    return [];
  }
}

async function getRosterForTeam(slug, teamId) {
  try {
    const data = await fetchJson(
      `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams/${teamId}/roster`
    );
    return data.athletes || [];
  } catch (e) {
    return [];
  }
}

async function main() {
  console.log("=== SINCRONIZADOR DE PLANTILLAS 2026/27 (POST-MERCADO DE PASES) ===\n");

  const fixtures = JSON.parse(fs.readFileSync(FIXTURES_PATH, "utf8"));
  const teamData = JSON.parse(fs.readFileSync(ALIASES_PATH, "utf8"));

  const targetTeams = new Set([
    ...teamData.canonicalDbTeams,
    ...fixtures.flatMap((f) => [f.home_team, f.away_team]),
  ]);

  console.log(`🎯 Equipos objetivo en el sistema: ${targetTeams.size}`);

  const processedTeams = new Set();
  const allPlayers = [];
  const teamPlayerCounts = {};

  for (const comp of LEAGUE_COMPETITIONS) {
    process.stdout.write(`⏳ Explorando ${comp.leagueName} (${comp.slug})... `);
    const teams = await getTeamsForLeague(comp.slug);
    if (!teams.length) {
      console.log(`(sin equipos)`);
      continue;
    }

    let teamsMatched = 0;
    let playersAdded = 0;

    for (const rawTeam of teams) {
      const normName = normalizeTeamName(rawTeam.displayName || rawTeam.name);
      
      // Solo procesar si pertenece a los equipos de nuestro concurso o ligas relevantes
      if (processedTeams.has(normName)) continue;

      const isTarget = targetTeams.has(normName) ||
        [...targetTeams].some(t => cleanTeamName(t) === cleanTeamName(normName));

      if (!isTarget) continue;

      const athletes = await getRosterForTeam(comp.slug, rawTeam.id);
      if (!athletes.length) continue;

      processedTeams.add(normName);
      teamsMatched++;

      for (const a of athletes) {
        const pName = a.displayName || a.fullName || a.shortName;
        if (!pName || !pName.trim()) continue;

        const posName = a.position?.name || a.position?.displayName || "";
        const position = POS_MAP[posName] || "Mediocampista";
        const nationality = a.citizenship || a.country || "";

        allPlayers.push({
          id: `fd-${a.id || Math.abs(hashCode(`${pName}-${normName}`))}`,
          name: pName.trim(),
          team: normName,
          league: comp.leagueName,
          position,
          nationality,
        });
        playersAdded++;
      }

      teamPlayerCounts[normName] = athletes.length;
      await new Promise((r) => setTimeout(r, 60)); // Suave rate limiting
    }

    console.log(`✓ (${teamsMatched} equipos, ${playersAdded} jugadores)`);
  }

  // Si algún equipo del calendario todavía no tiene plantilla, intentar fallback con las plantillas anteriores
  let fallbackCount = 0;
  if (fs.existsSync(PLAYERS_SRC_PATH)) {
    const existingPlayers = JSON.parse(fs.readFileSync(PLAYERS_SRC_PATH, "utf8"));
    const existingByTeam = new Map();
    for (const p of existingPlayers) {
      const normT = normalizeTeamName(p.team);
      if (!existingByTeam.has(normT)) existingByTeam.set(normT, []);
      existingByTeam.get(normT).push(p);
    }

    for (const team of targetTeams) {
      if (!processedTeams.has(team)) {
        const prevList = existingByTeam.get(team) || existingByTeam.get(normalizeTeamName(team));
        if (prevList && prevList.length > 0) {
          processedTeams.add(team);
          for (const p of prevList) {
            allPlayers.push({
              ...p,
              team,
            });
          }
          fallbackCount += prevList.length;
          teamPlayerCounts[team] = prevList.length;
        }
      }
    }
  }

  console.log(`\n📦 Plantillas consolidadas:`);
  console.log(`  - Total de equipos con plantilla: ${processedTeams.size}`);
  console.log(`  - Total de jugadores registrados: ${allPlayers.length}`);
  if (fallbackCount > 0) {
    console.log(`  - Jugadores conservados de respaldo: ${fallbackCount}`);
  }

  // Deduplicación fina por clave única (nombre + equipo)
  const uniqueMap = new Map();
  for (const p of allPlayers) {
    const key = `${p.name.toLowerCase().trim()}_${normalizeTeamName(p.team).toLowerCase().trim()}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, p);
    }
  }

  const finalPlayers = Array.from(uniqueMap.values());

  // Ordenar alfabéticamente por equipo y luego por nombre
  finalPlayers.sort((a, b) => {
    const teamCmp = a.team.localeCompare(b.team, "es");
    if (teamCmp !== 0) return teamCmp;
    return a.name.localeCompare(b.name, "es");
  });

  // Guardar en src/data/ y public/data/
  const jsonContent = JSON.stringify(finalPlayers, null, 2) + "\n";
  fs.writeFileSync(PLAYERS_SRC_PATH, jsonContent, "utf8");
  fs.writeFileSync(PLAYERS_PUB_PATH, jsonContent, "utf8");

  console.log(`\n💾 Guardado exitoso en:`);
  console.log(`  - ${PLAYERS_SRC_PATH}`);
  console.log(`  - ${PLAYERS_PUB_PATH}`);

  // Verificar que todos los equipos de los fixtures tengan al menos 10 jugadores
  const missingInFixtures = [...targetTeams].filter((t) => !processedTeams.has(t));
  if (missingInFixtures.length > 0) {
    console.warn(`\n⚠️  Equipos sin plantilla (${missingInFixtures.length}):`, missingInFixtures.slice(0, 10));
  } else {
    console.log(`\n🎉 ¡100% DE LOS EQUIPOS DEL CONCURSO TIENEN PLANTILLA OFICIAL!`);
  }
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
