"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  match_date: string;
}

interface Prediction {
  match_id: string;
  home_score: number;
  away_score: number;
}

export default function PronosticarPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user]);

  const fetchMatches = async () => {
    const { data: matchesData } = await supabase
      .from("matches")
      .select("*")
      .gte("match_date", new Date().toISOString().split("T")[0])
      .order("match_date", { ascending: true })
      .limit(20);

    if (matchesData) {
      setMatches(matchesData);

      const { data: predsData } = await supabase
        .from("predictions")
        .select("match_id, home_score, away_score")
        .eq("user_id", user?.id);

      if (predsData) {
        const predsMap: Record<string, Prediction> = {};
        predsData.forEach((p) => {
          predsMap[p.match_id] = { match_id: p.match_id, home_score: p.home_score, away_score: p.away_score };
        });
        setPredictions(predsMap);
      }
    }
    setLoading(false);
  };

  const handleScoreChange = (matchId: string, field: "home_score" | "away_score", value: number) => {
    setPredictions((prev) => ({
      ...prev,
      [matchId]: {
        match_id: matchId,
        home_score: prev[matchId]?.home_score ?? 0,
        away_score: prev[matchId]?.away_score ?? 0,
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    setSuccess(false);

    const predictionsArray = Object.values(predictions).map((p) => ({
      user_id: user.id,
      match_id: p.match_id,
      home_score: p.home_score,
      away_score: p.away_score,
    }));

    const { error } = await supabase
      .from("predictions")
      .upsert(predictionsArray, { onConflict: "user_id,match_id" });

    setSaving(false);

    if (error) {
      setError("Error al guardar: " + error.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4 flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Hacer Pronósticos</h1>
        <p className="text-silver text-sm mb-8">Elegí los resultados de los próximos partidos</p>

        {matches.length === 0 ? (
          <div className="bg-navy-mid border border-border rounded-2xl p-8 text-center">
            <span className="text-4xl mb-3 block">📅</span>
            <p className="text-silver text-sm">No hay partidos programados por el momento</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <div key={match.id} className="bg-navy-mid border border-border rounded-xl p-4">
                <div className="text-silver text-xs mb-3">
                  {new Date(match.match_date).toLocaleDateString("es-AR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white text-sm font-medium flex-1 text-right">{match.home_team}</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={predictions[match.id]?.home_score ?? ""}
                    onChange={(e) => handleScoreChange(match.id, "home_score", parseInt(e.target.value) || 0)}
                    className="w-14 bg-navy-card border border-border rounded-lg px-2 py-2 text-center text-white text-sm focus:outline-none focus:border-gold"
                  />
                  <span className="text-silver text-xs">vs</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={predictions[match.id]?.away_score ?? ""}
                    onChange={(e) => handleScoreChange(match.id, "away_score", parseInt(e.target.value) || 0)}
                    className="w-14 bg-navy-card border border-border rounded-lg px-2 py-2 text-center text-white text-sm focus:outline-none focus:border-gold"
                  />
                  <span className="text-white text-sm font-medium flex-1">{match.away_team}</span>
                </div>
              </div>
            ))}

            <div className="pt-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-xs">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
                  <p className="text-green-400 text-xs">¡Pronósticos guardados!</p>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-gold text-navy-black font-bold py-3 rounded-full text-sm hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar Pronósticos"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
