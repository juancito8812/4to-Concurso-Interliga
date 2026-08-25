"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface RankingEntry {
  display_name: string;
  total_points: number;
  rank: number;
}

export default function RankingPage() {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRankings = async () => {
      const { data } = await supabase
        .from("predictions")
        .select("user_id, points, profiles(display_name)");

      if (data) {
        const userPoints: Record<string, { name: string; total: number }> = {};

        data.forEach((p: any) => {
          if (!userPoints[p.user_id]) {
            userPoints[p.user_id] = {
              name: p.profiles?.display_name || "Anónimo",
              total: 0,
            };
          }
          userPoints[p.user_id].total += p.points || 0;
        });

        const sorted = Object.values(userPoints)
          .sort((a, b) => b.total - a.total)
          .map((entry, i) => ({
            display_name: entry.name,
            total_points: entry.total,
            rank: i + 1,
          }));

        setRankings(sorted);
      }
      setLoading(false);
    };

    fetchRankings();
  }, []);

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Ranking General</h1>
        <p className="text-silver text-sm mb-8">Tabla de posiciones del concurso</p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : rankings.length === 0 ? (
          <div className="bg-navy-mid border border-border rounded-2xl p-8 text-center">
            <span className="text-4xl mb-3 block">🏆</span>
            <p className="text-silver text-sm">Todavía no hay pronósticos registrados</p>
          </div>
        ) : (
          <div className="bg-navy-mid border border-border rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-xs text-silver uppercase">
                  <th className="px-4 py-3 text-left w-12">#</th>
                  <th className="px-4 py-3 text-left">Jugador</th>
                  <th className="px-4 py-3 text-center w-20">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((r) => (
                  <tr key={r.rank} className="border-b border-border/50 hover:bg-navy-card transition-colors">
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${r.rank <= 3 ? "text-gold" : "text-silver"}`}>
                        {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white text-sm font-medium">{r.display_name}</td>
                    <td className="px-4 py-3 text-center text-gold font-bold text-sm">{r.total_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
