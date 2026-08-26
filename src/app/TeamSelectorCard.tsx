"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface Team {
  id: string;
  name: string;
  league: string;
  logo_url: string;
}

export default function TeamSelectorCard() {
  const { user } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("teams")
      .select("id, name, league, logo_url")
      .order("league")
      .order("name")
      .then(({ data }) => {
        if (data) setTeams(data);
      });
  }, []);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("team_id, teams(id, name, league, logo_url)")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.teams) {
            const t = data.teams as unknown as Team;
            if (Array.isArray(data.teams)) {
              setSelectedTeam(data.teams[0] || null);
            } else {
              setSelectedTeam(t);
            }
          }
        });
    }
  }, [user]);

  const handleSelect = async (teamId: string) => {
    if (!user || !teamId) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    const { error: updateError } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, team_id: teamId }, { onConflict: "user_id" });

    if (updateError) {
      setError("Error al guardar");
      setLoading(false);
      return;
    }

    const team = teams.find((t) => t.id === teamId);
    if (team) setSelectedTeam(team);
    setSuccess(true);
    setLoading(false);
    setTimeout(() => setSuccess(false), 3000);
  };

  const teamsByLeague = teams.reduce<Record<string, Team[]>>((acc, team) => {
    if (!acc[team.league]) acc[team.league] = [];
    acc[team.league].push(team);
    return acc;
  }, {});

  return (
    <div className="relative p-5 sm:p-7 rounded-xl sm:rounded-2xl bg-navy-mid border border-border">
      <span className="block text-4xl sm:text-5xl font-black text-gold/20 mb-2 sm:mb-3 leading-none">
        1
      </span>

      {user ? (
        <>
          {selectedTeam ? (
            <div className="flex items-center gap-3 mb-3">
              <img
                src={selectedTeam.logo_url}
                alt={selectedTeam.name}
                className="w-10 h-10 rounded-full object-contain bg-white p-0.5"
              />
              <div>
                <p className="text-sm font-bold text-white">{selectedTeam.name}</p>
                <p className="text-[10px] text-silver">{selectedTeam.league}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-silver mb-3">
              Elegí tu equipo para participar del concurso
            </p>
          )}

          <select
            value={selectedTeam?.id || ""}
            onChange={(e) => handleSelect(e.target.value)}
            disabled={loading}
            className="w-full bg-navy-card border border-border rounded-lg px-3 py-2.5 text-white text-xs focus:outline-none focus:border-gold transition-colors mb-2"
          >
            <option value="">
              {selectedTeam ? "Cambiar equipo" : "Elegí tu equipo"}
            </option>
            {Object.entries(teamsByLeague).map(([league, leagueTeams]) => (
              <optgroup key={league} label={league}>
                {leagueTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <p className="text-[10px] text-gold/70 mb-2">
            ⚠ No podés cambiar de equipo hasta la temporada entrante
          </p>

          {error && (
            <p className="text-[10px] text-red-400">{error}</p>
          )}
          {success && (
            <p className="text-[10px] text-green-400">¡Equipo guardado!</p>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-silver mb-4">
            Elegí tu equipo favorito para participar del concurso
          </p>
          <div className="flex gap-2">
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
        </>
      )}
    </div>
  );
}
