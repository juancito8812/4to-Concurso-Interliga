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
    let isMounted = true;

    const checkStatus = async () => {
      if (!user) {
        if (isMounted) setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", user.id)
        .single();

      if (profile?.team_id && isMounted) {
        const { data: team } = await supabase
          .from("teams")
          .select("name")
          .eq("id", profile.team_id)
          .single();

        if (team && isMounted) setTeamName(team.name);
      }

      const { data: predictions } = await supabase
        .from("predictions")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (isMounted) {
        setHasPredictions(!!predictions && predictions.length > 0);
        setLoading(false);
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return (
    <div className="relative p-5 sm:p-7 rounded-xl sm:rounded-2xl bg-navy-mid border border-border">
      <span className="block text-4xl sm:text-5xl font-black text-gold/20 mb-2 sm:mb-3 leading-none">
        3
      </span>

      <p className="text-sm leading-relaxed text-silver">
        Las copas nacionales e internacionales son de{" "}
        <span className="text-gold font-semibold">eliminación directa</span>:{" "}
        si fallás tu pronóstico en fase de Knock-out, quedás fuera de esa ronda.
      </p>

      {!loading && (
        user ? (
          teamName ? (
            <div className="bg-green/10 border border-green/30 rounded-xl p-3.5 mt-4">
              <div className="flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green animate-pulse" />
                <p className="text-green text-xs font-bold uppercase tracking-wider">
                  VIVO — {teamName}
                </p>
              </div>
              <p className="text-silver/80 text-[11px] text-center mt-1">
                {hasPredictions ? "Pronósticos cargados para la ronda actual" : "Hacé tus pronósticos para mantener tu lugar"}
              </p>
            </div>
          ) : (
            <div className="bg-gold/10 border border-gold/30 rounded-xl p-3.5 mt-4 text-center">
              <p className="text-gold text-xs font-semibold">
                ⚽ Elegí tu equipo en el Paso 1 para activar tu estado
              </p>
            </div>
          )
        ) : (
          <div className="bg-navy-card/80 border border-border/80 rounded-xl p-3 mt-4 text-center">
            <p className="text-silver text-xs">
              Registrate para seguir tu estado en Knock-out
            </p>
          </div>
        )
      )}
    </div>
  );
}
