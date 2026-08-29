#!/usr/bin/env node
// rebuild-eval-preds.js — Reconstruye officialEvaluatedPredictions.json desde Supabase
const fs = require("fs");
const path = require("path");
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const URL = "https://ilkndkqcmxvlufxaugog.supabase.co/rest/v1";
const epPath = path.join(__dirname, "..", "src/data/officialEvaluatedPredictions.json");
const evPath = path.join(__dirname, "..", "src/data/officialEvaluatedMatches.json");

const H = { apikey: KEY, Authorization: "Bearer " + KEY };

async function get(qs) {
  const all = [];
  const base = qs.includes("?") ? qs + "&" : qs + "?";
  for (let offset = 0; offset < 100000; offset += 1000) {
    const r = await fetch(URL + "/" + base + `limit=1000&offset=${offset}`, { headers: H });
    if (!r.ok) throw new Error(`GET ${qs}: HTTP ${r.status}`);
    const rows = await r.json();
    all.push(...rows);
    if (rows.length < 1000) break;
  }
  return all;
}

async function main() {
  const [preds, scorers, profiles] = await Promise.all([
    get("predictions?select=id,user_id,match_id,home_score,away_score,points"),
    get("prediction_scorers?select=prediction_id,player_name,goals,team"),
    get("profiles?select=user_id,display_name"),
  ]);
  const scorersMap = {};
  scorers.forEach((s) => {
    (scorersMap[s.prediction_id] = scorersMap[s.prediction_id] || []).push({
      player_name: s.player_name, goals: s.goals, team: s.team,
    });
  });
  const namesMap = {};
  profiles.forEach((p) => { namesMap[p.user_id] = p.display_name || "Participante"; });
  const ev = JSON.parse(fs.readFileSync(evPath, "utf8"));
  const evIds = new Set(ev.map((m) => m.id));

  const out = preds
    .filter((p) => evIds.has(p.match_id) || p.points !== undefined || p.points === null)
    .map((p) => ({
      id: p.id,
      user_id: p.user_id,
      display_name: namesMap[p.user_id] || "Participante",
      match_id: p.match_id,
      home_score: p.home_score,
      away_score: p.away_score,
      points: p.points,
      scorers: scorersMap[p.id] || [],
    }));

  fs.writeFileSync(epPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`✅ officialEvaluatedPredictions.json: ${out.length} predicciones (desde Supabase)`);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
