"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  getUserCupSurvivors,
  TournamentSurvivor,
  KnockoutCupSlug,
} from "@/lib/survivor";

interface PrimaryTeam {
  id: string;
  name: string;
  logo_url: string;
}

interface CupConfig {
  slug: KnockoutCupSlug;
  name: string;
  shortName: string;
  emoji: string;
}

const CUPS: CupConfig[] = [
  { slug: "champions", name: "Champions League", shortName: "Champions", emoji: "⭐" },
  { slug: "europa", name: "Europa League", shortName: "Europa", emoji: "🟠" },
  { slug: "conference", name: "Conference League", shortName: "Conference", emoji: "🟢" },
  { slug: "coppaitalia", name: "Copa Italia", shortName: "Copa Italia", emoji: "🇮🇹" },
];

interface EffectiveStatus {
  teamName: string;
  teamLogo?: string;
  status: "ALIVE" | "ELIMINATED";
  eliminatedRound?: string | null;
  inheritedFrom?: string | null;
}

export default function CompetitionStatusCard() {
  const { user } = useAuth();
  const [primaryTeam, setPrimaryTeam] = useState<PrimaryTeam | null>(null);
  const [survivors, setSurvivors] = useState<Record<string, TournamentSurvivor>>({});
  const [selectedCup, setSelectedCup] = useState<KnockoutCupSlug>("champions");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("team_id")
          .eq("user_id", user.id)
          .single();

        if (profile?.team_id) {
          const { data: team } = await supabase
            .from("teams")
            .select("id, name, logo_url")
            .eq("id", profile.team_id)
            .single();

          if (team && isMounted) {
            setPrimaryTeam(team);
          }
        }

        const userSurvivors = await getUserCupSurvivors(user.id);
        if (isMounted) {
          setSurvivors(userSurvivors || {});
        }
      } catch (err) {
        console.error("Error loading survivor status card data:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const getEffectiveStatus = (slug: KnockoutCupSlug): EffectiveStatus => {
    const record = survivors[slug];
    if (record) {
      const history = record.history || [];
      const lastTransfer = history.length > 0 ? history[history.length - 1] : null;
      const inheritedFrom = lastTransfer
        ? lastTransfer.from_team || (lastTransfer as unknown as { from_team_name?: string }).from_team_name || null
        : null;

      return {
        teamName: record.active_team_name || primaryTeam?.name || "Sin equipo",
        teamLogo: record.active_team_logo || primaryTeam?.logo_url,
        status: record.status || "ALIVE",
        eliminatedRound: record.eliminated_at_round,
        inheritedFrom,
      };
    }

    return {
      teamName: primaryTeam?.name || "Sin equipo",
      teamLogo: primaryTeam?.logo_url,
      status: "ALIVE",
      eliminatedRound: null,
      inheritedFrom: null,
    };
  };

  const activeCupConfig = CUPS.find((c) => c.slug === selectedCup) || CUPS[0];
  const activeCupStatus = getEffectiveStatus(activeCupConfig.slug);

  return (
    <div className="relative p-5 sm:p-7 rounded-xl sm:rounded-2xl bg-navy-mid border border-border flex flex-col justify-between">
      <div>
        <span className="block text-4xl sm:text-5xl font-black text-gold/20 mb-2 sm:mb-3 leading-none">
          3
        </span>

        <p className="text-sm leading-relaxed text-silver mb-4">
          Las copas nacionales e internacionales son de{" "}
          <span className="text-gold font-semibold">eliminación directa</span>:{" "}
          si fallás tu pronóstico en fase de Knock-out, quedás fuera de esa ronda.{" "}
          Si pronosticás al rival y aciertas,{" "}
          <span className="text-gold font-semibold">¡heredas su camiseta!</span>
        </p>
      </div>

      {!loading && (
        user ? (
          primaryTeam ? (
            <div className="mt-2 space-y-2.5">
              {/* Cup selector tabs */}
              <div className="grid grid-cols-2 gap-1.5">
                {CUPS.map((cup) => {
                  const statusData = getEffectiveStatus(cup.slug);
                  const isSelected = selectedCup === cup.slug;
                  const isAlive = statusData.status === "ALIVE";
                  return (
                    <button
                      key={cup.slug}
                      type="button"
                      onClick={() => setSelectedCup(cup.slug)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                        isSelected
                          ? "bg-gold/15 border border-gold text-gold font-bold shadow-[0_0_10px_rgba(201,168,76,0.15)]"
                          : "bg-navy-card/80 border border-border/80 text-silver hover:text-white hover:border-silver/40"
                      }`}
                    >
                      <span className="truncate mr-1">
                        {cup.emoji} {cup.shortName}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isAlive
                            ? "bg-green shadow-[0_0_6px_rgba(34,197,94,0.6)]"
                            : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"
                        }`}
                        title={isAlive ? "VIVO" : "KO"}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Selected cup detail */}
              <div className="bg-navy-card/90 border border-border/90 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm">{activeCupConfig.emoji}</span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider truncate">
                      {activeCupConfig.name}
                    </span>
                  </div>
                  {activeCupStatus.status === "ALIVE" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green/15 border border-green/30 text-green text-[10px] font-black uppercase tracking-wider shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
                      VIVO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-wider shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      KO
                    </span>
                  )}
                </div>

                {/* Active team display */}
                <div className="flex items-center gap-2.5">
                  {activeCupStatus.teamLogo ? (
                    <div className="w-7 h-7 rounded-full bg-white p-0.5 flex items-center justify-center shrink-0 shadow-inner">
                      <img
                        src={activeCupStatus.teamLogo}
                        alt={activeCupStatus.teamName}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-navy-mid border border-border flex items-center justify-center shrink-0 text-xs">
                      ⚽
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">
                      {activeCupStatus.teamName}
                    </p>
                    <p className="text-[10px] text-silver/70 truncate">
                      {activeCupStatus.status === "ALIVE"
                        ? "Equipo activo en esta copa"
                        : `Eliminado${activeCupStatus.eliminatedRound ? ` en ${activeCupStatus.eliminatedRound}` : ""}`}
                    </p>
                  </div>
                </div>

                {/* Inheritance / Transfer info */}
                {activeCupStatus.inheritedFrom ? (
                  <div className="bg-gold/10 border border-gold/30 rounded-lg px-2.5 py-1.5 text-[11px] text-gold flex items-center gap-1.5">
                    <span>👑</span>
                    <span className="truncate">
                      Heredado de <strong className="font-bold">{activeCupStatus.inheritedFrom}</strong>
                    </span>
                  </div>
                ) : activeCupStatus.status === "ALIVE" ? (
                  <div className="bg-navy-mid/60 border border-border/40 rounded-lg px-2.5 py-1 text-[10px] text-silver/70 flex items-center gap-1.5">
                    <span>👕</span>
                    <span className="truncate">Club base asignado</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="bg-gold/10 border border-gold/30 rounded-xl p-3.5 mt-2 text-center">
              <p className="text-gold text-xs font-semibold">
                ⚽ Elegí tu equipo en el Paso 1 para activar tu estado en copas
              </p>
            </div>
          )
        ) : (
          <div className="bg-navy-card/80 border border-border/80 rounded-xl p-3.5 mt-2 text-center flex flex-col gap-3">
            <p className="text-xs text-silver leading-relaxed">
              Registrate para seguir tu estado de supervivencia y transferencias en cada copa.
            </p>
            <div className="flex gap-2">
              <Link
                href="/registro/"
                className="flex-1 bg-gold text-navy-black font-bold py-2 rounded-full text-xs text-center hover:bg-gold-light transition-colors"
              >
                Registrarse
              </Link>
              <Link
                href="/login/"
                className="flex-1 border border-gold text-gold font-bold py-2 rounded-full text-xs text-center hover:bg-gold/10 transition-colors"
              >
                Iniciar Sesión
              </Link>
            </div>
          </div>
        )
      )}
    </div>
  );
}
