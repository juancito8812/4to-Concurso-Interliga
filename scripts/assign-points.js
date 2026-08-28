const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ilkndkqcmxvlufxaugog.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsa25ka3FjbXh2bHVmeGF1Z29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2OTI5MTksImV4cCI6MjEwMzI2ODkxOX0.2AAajeD5mX0RxUXe1Fi5b_SefDBH5MClGKRXdIEZZcY";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function assignPointsToUser(username, matchData, predictionData, pointsAwarded) {
  console.log(`\nAsignando puntos a usuario: ${username}...`);

  // 1. Find profile
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("*, teams(name)")
    .ilike("display_name", username);

  if (pErr || !profiles || profiles.length === 0) {
    console.error(`No se encontró el perfil con username "${username}"`);
    return false;
  }

  const profile = profiles[0];
  console.log(`✓ Perfil encontrado: ${profile.display_name} (User ID: ${profile.user_id}, Club: ${profile.teams?.name || "Sin club"})`);

  // 2. Ensure match exists in matches table
  let matchId = matchData.id;
  const { data: existingMatch } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (!existingMatch) {
    console.log(`Insertando partido en DB: ${matchData.home_team} vs ${matchData.away_team}...`);
    const { data: insertedMatch, error: mErr } = await supabase
      .from("matches")
      .insert({
        id: matchId,
        home_team: matchData.home_team,
        away_team: matchData.away_team,
        match_date: matchData.match_date || new Date().toISOString(),
        league: matchData.league || "Bundesliga",
        result_home: matchData.result_home,
        result_away: matchData.result_away,
      })
      .select()
      .single();

    if (mErr) {
      console.warn("Error inserting match, checking fallback:", mErr);
    }
  } else if (matchData.result_home !== undefined) {
    await supabase
      .from("matches")
      .update({
        result_home: matchData.result_home,
        result_away: matchData.result_away,
      })
      .eq("id", matchId);
  }

  // 3. Insert or update prediction
  console.log(`Guardando pronóstico: ${predictionData.home_score} - ${predictionData.away_score} con ${pointsAwarded} puntos...`);
  const { data: pred, error: predErr } = await supabase
    .from("predictions")
    .upsert({
      user_id: profile.user_id,
      match_id: matchId,
      home_score: predictionData.home_score,
      away_score: predictionData.away_score,
      points: pointsAwarded,
    }, { onConflict: "user_id,match_id" })
    .select()
    .single();

  if (predErr) {
    console.error("Error guardando pronóstico:", predErr);
    return false;
  }

  console.log(`✓ Pronóstico guardado exitosamente (ID: ${pred.id})`);

  // 4. Insert scorers if any
  if (predictionData.scorers && predictionData.scorers.length > 0) {
    await supabase.from("prediction_scorers").delete().eq("prediction_id", pred.id);
    const scorersToInsert = predictionData.scorers.map(s => ({
      prediction_id: pred.id,
      player_name: s.player_name,
      goals: s.goals || 1,
      team: s.team || "home",
    }));
    await supabase.from("prediction_scorers").insert(scorersToInsert);
    console.log(`✓ Goleadores asociados: ${scorersToInsert.length}`);
  }

  console.log(`\n🎉 ¡PUNTOS ASIGNADOS CON ÉXITO A ${profile.display_name}! Total: +${pointsAwarded} pts`);
  return true;
}

module.exports = { assignPointsToUser };
