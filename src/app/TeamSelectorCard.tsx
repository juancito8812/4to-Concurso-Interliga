"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

import { getTeamCups, setInitialCupSurvivor, KnockoutCupSlug } from "@/lib/survivor";

interface Team {
  id: string;
  name: string;
  league: string;
  logo_url: string;
}

let cachedTeamsList: Team[] | null = null;

export default function TeamSelectorCard() {
  const { user, displayName } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>(() => cachedTeamsList || []);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [teamLocked, setTeamLocked] = useState(false);

  useEffect(() => {
    if (cachedTeamsList && cachedTeamsList.length > 0) return;
    
    supabase
      .from("teams")
      .select("id, name, league, logo_url")
      .order("league")
      .order("name")
      .then(({ data }) => {
        if (data) {
          cachedTeamsList = data;
          setTeams(data);
        }
      });
  }, []);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("team_id")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.team_id) {
            supabase
              .from("teams")
              .select("id, name, league, logo_url")
              .eq("id", data.team_id)
              .single()
              .then(({ data: team }) => {
                if (team) {
                  setSelectedTeam(team);
                  setTeamLocked(true);
                } else {
                  setSelectedTeam(null);
                  setTeamLocked(false);
                }
              });
          } else {
            setSelectedTeam(null);
            setTeamLocked(false);
          }
        });
    }
  }, [user]);

  const handleSelect = async (teamId: string) => {
    if (!user || !teamId || teamLocked) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    const { error: updateError } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          team_id: teamId,
          display_name: displayName || user.user_metadata?.display_name || user.email?.split("@")[0],
        },
        { onConflict: "user_id" }
      );

    if (updateError) {
      setError("Error al guardar");
      setLoading(false);
      return;
    }

    const team = teams.find((t) => t.id === teamId);
    if (team) {
      setSelectedTeam(team);
      // Auto-subscribe to all KO cups where this team participates
      const cups = getTeamCups(team.name);
      for (const cupSlug of cups) {
        try {
          await setInitialCupSurvivor(user.id, cupSlug as KnockoutCupSlug, teamId);
        } catch (e) {
          console.warn(`Error auto-subscribing to cup ${cupSlug}:`, e);
        }
      }
      console.log(`Auto-suscrito a ${cups.length} copas KO:`, cups);
    }

    setTeamLocked(true);
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

          {teamLocked ? (
            <div className="w-full bg-navy-card border border-border rounded-lg px-3 py-2.5 text-silver text-xs flex items-center gap-2">
              <span className="text-gold">🔒</span>
              <span>Equipo confirmado — no se puede cambiar</span>
            </div>
          ) : (
            <select
              value={selectedTeam?.id || ""}
              onChange={(e) => handleSelect(e.target.value)}
              disabled={loading}
              className="w-full bg-navy-card border border-border rounded-lg px-3 py-2.5 text-white text-xs focus:outline-none focus:border-gold transition-colors mb-2"
            >
              <option value="">Elegí tu equipo</option>
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
          )}

          <div className="flex items-center gap-1.5 text-xs text-gold-light bg-gold/10 border border-gold/20 rounded-lg px-2.5 py-2 mb-2 font-medium">
            <span className="text-sm">⚠️</span>
            <span>No podés cambiar de equipo hasta la próxima temporada</span>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 rounded-lg font-medium">{error}</p>
          )}
          {success && (
            <p className="text-xs text-green bg-green/10 border border-green/20 px-2.5 py-1.5 rounded-lg font-medium">¡Equipo confirmado con éxito!</p>
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
