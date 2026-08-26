"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const [teamName, setTeamName] = useState("");
  const [teamLogo, setTeamLogo] = useState("");

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("teams(name, logo_url)")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.teams) {
            const teams = data.teams as { name: string; logo_url: string }[];
            if (teams.length > 0) {
              setTeamName(teams[0].name);
              setTeamLogo(teams[0].logo_url || "");
            }
          }
        });
    }
  }, [user]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-black/90 backdrop-blur-sm border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-gold font-black text-lg tracking-tight">INTERLIGA</span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/pronosticar/"
                className="text-silver text-xs hover:text-white transition-colors hidden sm:block"
              >
                Pronosticar
              </Link>
              <Link
                href="/mis-pronosticos/"
                className="text-silver text-xs hover:text-white transition-colors hidden sm:block"
              >
                Mis Pronósticos
              </Link>
              <Link
                href="/ranking/"
                className="text-silver text-xs hover:text-white transition-colors hidden sm:block"
              >
                Ranking
              </Link>
              <div className="relative group">
                <button className="bg-gold text-navy-black font-bold px-4 py-1.5 rounded-full text-xs hover:bg-gold-light transition-colors flex items-center gap-2">
                  {teamLogo ? (
                    <img src={teamLogo} alt={teamName} className="w-5 h-5 rounded-full object-contain" />
                  ) : (
                    <span className="text-[10px]">⚽</span>
                  )}
                  <span>{user.email?.split("@")[0]}</span>
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-navy-mid border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <Link href="/perfil/" className="block px-4 py-2 text-sm text-silver hover:text-white hover:bg-navy-card rounded-t-xl">
                    Mi Perfil
                  </Link>
                  <Link href="/pronosticar/" className="block px-4 py-2 text-sm text-silver hover:text-white hover:bg-navy-card sm:hidden">
                    Pronosticar
                  </Link>
                  <Link href="/mis-pronosticos/" className="block px-4 py-2 text-sm text-silver hover:text-white hover:bg-navy-card sm:hidden">
                    Mis Pronósticos
                  </Link>
                  <Link href="/ranking/" className="block px-4 py-2 text-sm text-silver hover:text-white hover:bg-navy-card sm:hidden">
                    Ranking
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-navy-card rounded-b-xl"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login/"
                className="text-silver text-xs hover:text-white transition-colors"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/registro/"
                className="bg-gold text-navy-black font-bold px-4 py-1.5 rounded-full text-xs hover:bg-gold-light transition-colors"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
