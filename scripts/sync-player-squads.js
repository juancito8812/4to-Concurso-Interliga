#!/usr/bin/env node
// sync-player-squads.js — Completa officialPlayers.json con plantillas reales de ESPN
// para los equipos sin squad (10 UCL + copa Italia). Idempotente.

const fs = require("fs");
const path = require("path");
const DATA_DIR = path.join(__dirname, "..", "src", "data");
const PLAYERS_PATH = path.join(DATA_DIR, "officialPlayers.json");
const FIXTURES_PATH = path.join(DATA_DIR, "officialFixtures.json");

const { normalizeTeamName } = require("./lib/score-utils.js");

const POS_MAP = {
  Goalkeeper: "Arquero",
  Defender: "Defensor",
  Midfielder: "Mediocampista",
  Forward: "Delantero",
};

async function fetchJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function getTeamIds(slug, from, to) {
  const data = await fetchJson(
    `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${from}-${to}&limit=500`
  );
  const ids = {};
  (data.events || []).forEach((e) => {
    const comp = e.competitions?.[0];
    if (!comp) return;
    comp.competitors.forEach((c) => {
      ids[normalizeTeamName(c.team.displayName)] = c.team.id;
    });
  });
  return ids;
}

// Slug de liga doméstica para rosters que ESPN no expone bajo la competición UEFA
const DOMESTIC_SLUG = {
  "LASK Linz": "aut.1",
  "Lille": "fra.1",
  "Lens": "fra.1",
  "Feyenoord": "ned.1",
  "Viking FK": "nor.1",
  "Fenerbahçe": "tur.1",
  "Shakhtar Donetsk": "ukr.1",
  "SABAH FK": "aze.1",
  "AEK Athens": "gre.1",
  "Slovan Bratislava": "svk.1",
};

async function getRoster(slug, teamId) {
  const data = await fetchJson(
    `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams/${teamId}/roster`
  );
  return data.athletes || [];
}

async function main() {
  const players = JSON.parse(fs.readFileSync(PLAYERS_PATH, "utf8"));
  const fixtures = JSON.parse(fs.readFileSync(FIXTURES_PATH, "utf8"));

  const bundleTeams = new Set(players.map((p) => normalizeTeamName(p.team)));
  const calendarTeams = [...new Set(fixtures.flatMap((f) => [f.home_team, f.away_team]))];
  const missing = calendarTeams.filter((t) => !bundleTeams.has(t));
  if (!missing.length) {
    console.log("✅ Todos los equipos del calendario tienen plantilla");
    return;
  }
  console.log(`Faltan plantillas para ${missing.length} equipos`);

  const uclIds = await getTeamIds("uefa.champions", "20260901", "20270131");
  const coppaIds = await getTeamIds("ita.coppa_italia", "20260801", "20270531");

  const added = [];
  for (const team of missing) {
    const teamId = uclIds[team] || coppaIds[team];
    if (!teamId) {
      console.warn(`⚠️  Sin id ESPN para ${team} — se omite`);
      continue;
    }
    const league = uclIds[team] ? "Champions League" : "Copa Italia";
    try {
      // Roster vía competición UEFA; si vacío, probar la liga doméstica del equipo
      let athletes = await getRoster(uclIds[team] ? "uefa.champions" : "ita.coppa_italia", teamId);
      if (!athletes.length && DOMESTIC_SLUG[team]) {
        athletes = await getRoster(DOMESTIC_SLUG[team], teamId);
      }
      let count = 0;
      for (const a of athletes) {
        const posName = a.position?.name || "";
        const position = POS_MAP[posName] || "Mediocampista";
        players.push({
          id: `fd-${a.id}`,
          name: a.displayName || a.fullName,
          team,
          league,
          position,
          nationality: "",
        });
        count++;
      }
      added.push(`${team}: +${count}`);
      console.log(`✅ ${team} (${league}): ${count} jugadores`);
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      console.warn(`⚠️  ${team}: ${e.message}`);
    }
  }

  // Ordenar por equipo y escribir
  players.sort((a, b) => a.team.localeCompare(b.team, "es") || a.name.localeCompare(b.name, "es"));
  fs.writeFileSync(PLAYERS_PATH, JSON.stringify(players, null, 2) + "\n");
  console.log(`\n✅ officialPlayers.json: ${players.length} jugadores (${added.length} equipos completados)`);
  added.forEach((a) => console.log("  ", a));
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
