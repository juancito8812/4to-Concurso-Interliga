"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface PredictionWithMatch {
  id: string;
  home_score: number;
  away_score: number;
  points: number | null;
  match: {
    home_team: string;
    away_team: string;
    match_date: string;
    result_home: number | null;
    result_away: number | null;
  } | null;
}

export default function MisPronosticosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [predictions, setPredictions] = useState<PredictionWithMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      supabase
        .from("predictions")
        .select("id, home_score, away_score, points, match(home_team, away_team, match_date, result_home, result_away)")
        .eq("user_id", user.id)
        .order("match(match_date)", { ascending: false })
        .then(({ data }) => {
          if (data) setPredictions(data as unknown as PredictionWithMatch[]);
          setLoading(false);
        });
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4 flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const totalPoints = predictions.reduce((sum, p) => sum + (p.points || 0), 0);

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Mis Pronósticos</h1>
        <p className="text-silver text-sm mb-4">Historial de tus predicciones</p>

        <div className="bg-navy-mid border border-border rounded-xl p-4 mb-6 text-center">
          <span className="text-silver text-xs">Puntos totales</span>
          <p className="text-gold text-3xl font-bold">{totalPoints}</p>
        </div>

        {predictions.length === 0 ? (
          <div className="bg-navy-mid border border-border rounded-2xl p-8 text-center">
            <span className="text-4xl mb-3 block">📝</span>
            <p className="text-silver text-sm">Todavía no hiciste pronósticos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {predictions.map((p) => (
              <div key={p.id} className="bg-navy-mid border border-border rounded-xl p-4">
                {p.match && (
                  <>
                    <div className="text-silver text-xs mb-2">
                      {new Date(p.match.match_date).toLocaleDateString("es-AR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-right flex-1">
                        <span className="text-white text-sm font-medium">{p.match.home_team}</span>
                      </div>
                      <div className="flex items-center gap-2 mx-4">
                        <span className="text-gold font-bold text-lg">{p.home_score}</span>
                        <span className="text-silver text-xs">vs</span>
                        <span className="text-gold font-bold text-lg">{p.away_score}</span>
                      </div>
                      <div className="text-left flex-1">
                        <span className="text-white text-sm font-medium">{p.match.away_team}</span>
                      </div>
                    </div>
                    {p.match.result_home !== null && (
                      <div className="mt-2 text-center">
                        <span className="text-silver text-xs">Resultado: {p.match.result_home} - {p.match.result_away}</span>
                        {p.points !== null && (
                          <span className="ml-2 text-gold text-xs font-bold">+{p.points} pts</span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
