"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const basePath = "/4to-Concurso-Interliga";

export default function Navbar() {
  const { user, signOut } = useAuth();

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
                href={`${basePath}/pronosticar/`}
                className="text-silver text-xs hover:text-white transition-colors hidden sm:block"
              >
                Pronosticar
              </Link>
              <Link
                href={`${basePath}/mis-pronosticos/`}
                className="text-silver text-xs hover:text-white transition-colors hidden sm:block"
              >
                Mis Pronósticos
              </Link>
              <Link
                href={`${basePath}/ranking/`}
                className="text-silver text-xs hover:text-white transition-colors hidden sm:block"
              >
                Ranking
              </Link>
              <div className="relative group">
                <button className="bg-gold text-navy-black font-bold px-4 py-1.5 rounded-full text-xs hover:bg-gold-light transition-colors">
                  {user.email?.split("@")[0]}
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-navy-mid border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <Link href={`${basePath}/perfil/`} className="block px-4 py-2 text-sm text-silver hover:text-white hover:bg-navy-card rounded-t-xl">
                    Mi Perfil
                  </Link>
                  <Link href={`${basePath}/pronosticar/`} className="block px-4 py-2 text-sm text-silver hover:text-white hover:bg-navy-card sm:hidden">
                    Pronosticar
                  </Link>
                  <Link href={`${basePath}/mis-pronosticos/`} className="block px-4 py-2 text-sm text-silver hover:text-white hover:bg-navy-card sm:hidden">
                    Mis Pronósticos
                  </Link>
                  <Link href={`${basePath}/ranking/`} className="block px-4 py-2 text-sm text-silver hover:text-white hover:bg-navy-card sm:hidden">
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
                href={`${basePath}/login/`}
                className="text-silver text-xs hover:text-white transition-colors"
              >
                Iniciar Sesión
              </Link>
              <Link
                href={`${basePath}/registro/`}
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
