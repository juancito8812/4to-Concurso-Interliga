"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Stats {
  total: number;
  conClub: number;
  admins: number;
}

export default function AdminHomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from("profiles")
        .select("team_id, role")
        .limit(5000);

      if (err) {
        setError(err.message);
        return;
      }

      const rows = data ?? [];
      setStats({
        total: rows.length,
        conClub: rows.filter((r) => Boolean(r.team_id)).length,
        admins: rows.filter((r) => r.role === "admin").length,
      });
    })();
  }, []);

  const card = (label: string, value: number | string, hint: string) => (
    <div className="bg-navy-mid border border-border rounded-2xl p-5">
      <p className="text-[11px] uppercase tracking-wide text-silver/70">{label}</p>
      <p className="text-3xl font-bold text-white mt-2">{value}</p>
      <p className="text-[11px] text-silver/60 mt-1">{hint}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-navy-mid border border-border rounded-2xl p-6">
        <h1 className="text-xl font-bold text-white">Panel de administración</h1>
        <p className="text-silver/80 text-sm mt-1">
          Estado del 4° Concurso Interliga. Los datos oficiales se sincronizan por cron cada 30 minutos.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-red-400 text-xs">No se pudieron leer las métricas: {error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {card("Participantes", stats?.total ?? "…", "cuentas registradas")}
        {card("Con club elegido", stats?.conClub ?? "…", "listos para puntuar")}
        {card("Administradores", stats?.admins ?? "…", "acceso al panel")}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/admin/cuenta"
          className="bg-navy-mid border border-border hover:border-gold/60 rounded-2xl p-5 transition-colors"
        >
          <p className="text-white font-semibold text-sm">Mi cuenta</p>
          <p className="text-silver/70 text-xs mt-1">Cambiar la contraseña del administrador</p>
        </Link>
        <Link
          href="/ranking"
          className="bg-navy-mid border border-border hover:border-gold/60 rounded-2xl p-5 transition-colors"
        >
          <p className="text-white font-semibold text-sm">Ranking general</p>
          <p className="text-silver/70 text-xs mt-1">Ver la tabla pública del concurso</p>
        </Link>
      </div>

      <div className="bg-navy-mid/60 border border-border/70 rounded-2xl p-5">
        <p className="text-silver/70 text-xs leading-relaxed">
          Módulos de gestión (usuarios, fixtures, evaluación manual) se habilitarán en fases posteriores. Las
          escrituras sensibles deberán ir por RPCs <span className="text-silver">SECURITY DEFINER</span> con chequeo
          de rol, no por policies de UPDATE amplias.
        </p>
      </div>
    </div>
  );
}
