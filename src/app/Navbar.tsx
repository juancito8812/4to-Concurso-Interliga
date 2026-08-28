"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const [teamName, setTeamName] = useState("");
  const [teamLogo, setTeamLogo] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

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
              .select("name, logo_url")
              .eq("id", data.team_id)
              .single()
              .then(({ data: team }) => {
                if (team) {
                  setTeamName(team.name);
                  setTeamLogo(team.logo_url || "");
                }
              });
          }
        });
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("#user-menu-container")) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-black/95 backdrop-blur-md border-b border-border shadow-lg shadow-navy-black/40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-gold font-black text-xl tracking-tight group-hover:text-gold-light transition-colors">
            INTERLIGA
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {user ? (
            <>
              <Link
                href="/pronosticar/"
                className="text-silver text-xs font-semibold hover:text-white transition-colors hidden sm:block"
              >
                Pronosticar
              </Link>
              <Link
                href="/mis-pronosticos/"
                className="text-silver text-xs font-semibold hover:text-white transition-colors hidden sm:block"
              >
                Mis Pronósticos
              </Link>
              <Link
                href="/ranking/"
                className="text-silver text-xs font-semibold hover:text-white transition-colors hidden sm:block"
              >
                Ranking
              </Link>
              <div id="user-menu-container" className="relative">
                <button
                  onClick={() => setMenuOpen((prev) => !prev)}
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                  className="bg-gold text-navy-black font-bold px-3 py-1.5 rounded-full text-xs hover:bg-gold-light transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm cursor-pointer"
                >
                  {teamLogo ? (
                    <img src={teamLogo} alt={teamName} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-contain bg-white p-0.5" />
                  ) : (
                    <span className="text-xs">⚽</span>
                  )}
                  <span className="max-w-[80px] sm:max-w-[100px] truncate">{user.email?.split("@")[0]}</span>
                  <span className={`text-[9px] transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}>▼</span>
                </button>
                <div
                  className={`absolute right-0 top-full mt-2 w-52 bg-navy-mid border border-border rounded-xl shadow-xl transition-all duration-150 z-50 ${
                    menuOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2 pointer-events-none"
                  }`}
                >
                  {teamName && (
                    <div className="px-4 py-2.5 border-b border-border/70 flex items-center gap-2">
                      {teamLogo && <img src={teamLogo} alt="" className="w-4 h-4 rounded-full object-contain bg-white p-0.5" />}
                      <span className="text-xs text-silver font-medium truncate">{teamName}</span>
                    </div>
                  )}
                  <Link
                    href="/perfil/"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-xs text-silver hover:text-white hover:bg-navy-card transition-colors"
                  >
                    Mi Perfil
                  </Link>
                  <Link
                    href="/pronosticar/"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-xs text-silver hover:text-white hover:bg-navy-card sm:hidden transition-colors"
                  >
                    Pronosticar
                  </Link>
                  <Link
                    href="/mis-pronosticos/"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-xs text-silver hover:text-white hover:bg-navy-card sm:hidden transition-colors"
                  >
                    Mis Pronósticos
                  </Link>
                  <Link
                    href="/ranking/"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-xs text-silver hover:text-white hover:bg-navy-card sm:hidden transition-colors"
                  >
                    Ranking
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      signOut();
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-navy-card rounded-b-xl border-t border-border/70 transition-colors cursor-pointer"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/ranking/"
                className="text-silver text-xs font-semibold hover:text-white transition-colors flex items-center gap-1 px-1.5 py-1"
              >
                <span>🏆</span>
                <span className="hidden sm:inline">Ranking</span>
              </Link>
              <Link
                href="/login/"
                className="text-silver text-xs font-semibold hover:text-white transition-colors px-2 py-1"
              >
                Ingresar
              </Link>
              <Link
                href="/registro/"
                className="bg-gold text-navy-black font-bold px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-xs hover:bg-gold-light transition-all shadow-sm shrink-0"
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
