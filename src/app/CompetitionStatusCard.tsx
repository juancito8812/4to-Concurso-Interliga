"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function CompetitionStatusCard() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "alive" | "dead" | "no_team" | "no_predictions" | "guest">("loading");

  useEffect(() => {
    if (!user) {
      setStatus("guest");
      return;
    }

    const checkStatus = async () => {
      // Check if user has a team
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.team_id) {
        setStatus("no_team");
        return;
      }

      // Check if user has predictions
      const { data: predictions } = await supabase
        .from("predictions")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (!predictions || predictions.length === 0) {
        setStatus("no_predictions");
        return;
      }

      setStatus("alive");
    };

    checkStatus();
  }, [user]);

  const getStatusContent = () => {
    switch (status) {
      case "loading":
        return {
          icon: "⏳",
          text: "Cargando...",
          color: "text-silver",
          bgColor: "bg-navy-card",
          borderColor: "border-border",
        };
      case "alive":
        return {
          icon: "🟢",
          text: "¡Estás vivo en la competición!",
          color: "text-green-400",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
        };
      case "dead":
        return {
          icon: "🔴",
          text: "Quedaste fuera de la competición",
          color: "text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
        };
      case "no_team":
        return {
          icon: "⚽",
          text: "Elegí tu equipo para participar",
          color: "text-gold",
          bgColor: "bg-gold/10",
          borderColor: "border-gold/30",
        };
      case "no_predictions":
        return {
          icon: "📝",
          text: "Hacé tu primer pronóstico",
          color: "text-gold",
          bgColor: "bg-gold/10",
          borderColor: "border-gold/30",
        };
      case "guest":
        return {
          icon: "👀",
          text: "Participá del concurso",
          color: "text-silver",
          bgColor: "bg-navy-card",
          borderColor: "border-border",
        };
    }
  };

  const statusContent = getStatusContent();

  return (
    <div className={`relative p-5 sm:p-7 rounded-xl sm:rounded-2xl bg-navy-mid border ${statusContent.borderColor}`}>
      <span className="block text-4xl sm:text-5xl font-black text-gold/20 mb-2 sm:mb-3 leading-none">
        3
      </span>

      <p className="text-sm leading-relaxed text-silver mb-3">
        Sumá <span className="text-gold font-semibold">puntos</span> con cada acierto — resultado, goleador y goles.
      </p>

      {user && (
        <div className={`${statusContent.bgColor} border ${statusContent.borderColor} rounded-lg p-3 mt-3`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{statusContent.icon}</span>
            <span className={`text-xs font-bold ${statusContent.color}`}>
              {statusContent.text}
            </span>
          </div>
        </div>
      )}

      {status === "no_team" && (
        <Link
          href="/"
          className="block text-center bg-gold/10 border border-gold/30 text-gold font-bold py-2.5 rounded-full text-xs hover:bg-gold/20 transition-colors mt-3"
        >
          Elegir Equipo →
        </Link>
      )}

      {status === "no_predictions" && (
        <Link
          href="/pronosticar/"
          className="block text-center bg-gold/10 border border-gold/30 text-gold font-bold py-2.5 rounded-full text-xs hover:bg-gold/20 transition-colors mt-3"
        >
          Ir a Pronosticar →
        </Link>
      )}

      {status === "guest" && (
        <div className="flex gap-2 mt-3">
          <Link
            href="/registro/"
            className="flex-1 bg-gold text-navy-black font-bold py-2.5 rounded-full text-xs text-center hover:bg-gold-light transition-colors"
          >
            Registrarse
          </Link>
          <Link
            href="/login/"
            className="flex-1 border border-gold text-gold font-bold py-2.5 rounded-full text-xs text-center hover:bg-gold/10 transition-colors"
          >
            Iniciar Sesión
          </Link>
        </div>
      )}
    </div>
  );
}
