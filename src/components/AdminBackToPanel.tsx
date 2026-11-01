"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

/**
 * Acceso permanente al panel para la cuenta administradora.
 *
 * El sitio no tiene barra de navegación global (solo la portada), así que al
 * entrar en /ranking, /tabla/... o /pronosticar desde /admin no había forma de
 * volver al panel. Este botón flotante se muestra únicamente a los admins.
 *
 * Se guarda el id del usuario admin (no un booleano) para que el botón
 * desaparezca solo al cambiar de sesión sin necesidad de setState síncrono
 * dentro del efecto (react-hooks/set-state-in-effect).
 */
export default function AdminBackToPanel() {
  const { user } = useAuth();
  const [adminUserId, setAdminUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (active) setAdminUserId(data?.role === "admin" ? user.id : null);
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (!user || adminUserId !== user.id) return null;

  return (
    <Link
      href="/admin/"
      aria-label="Volver al panel de administración"
      className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2.5 text-xs font-bold text-navy-black shadow-lg shadow-black/40 ring-1 ring-black/10 transition-colors hover:bg-gold-light focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <span aria-hidden="true">←</span>
      Panel admin
    </Link>
  );
}
