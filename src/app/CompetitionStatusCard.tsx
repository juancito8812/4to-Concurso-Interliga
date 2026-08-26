"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function CompetitionStatusCard() {
  const { user } = useAuth();
  const [teamName, setTeamName] = useState("");
  const [hasPredictions, setHasPredictions] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", user.id)
        .single();

      if (profile?.team_id) {
        const { data: team } = await supabase
          .from("teams")
          .select("name")
          .eq("id", profile.team_id)
          .single();

        if (team) setTeamName(team.name);
      }

      const { data: predictions } = await supabase
        .from("predictions")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      setHasPredictions(!!predictions && predictions.length > 0);
      setLoading(false);
    };

    checkStatus();
  }, [user]);

  const isAlive = user && teamName && hasPredictions;

  return (
    <div className="relative p-5 sm:p-7 rounded-xl sm:rounded-2xl bg-navy-mid border border-border">
      <span className="block text-4xl sm:text-5xl font-black text-gold/20 mb-2 sm:mb-3 leading-none">
        3
      </span>

      <p className="text-sm leading-relaxed text-silver">
        Las copas nacionales son de{" "}
        <span className="text-gold font-semibold">eliminación directa</span>:{" "}
        si fallás tu pronóstico en fase de Knock-out, quedás fuera de esa ronda.
      </p>

      {!loading && user && (
        isAlive ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mt-4">
            <p className="text-green-400 text-xs font-bold text-center">
              🟢 VIVO — {teamName}
            </p>
          </div>
        ) : (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-4">
            <p className="text-red-400 text-xs font-bold text-center">
              🔴 KO — Fuera de competición
            </p>
          </div>
        )
      )}
    </div>
  );
}
