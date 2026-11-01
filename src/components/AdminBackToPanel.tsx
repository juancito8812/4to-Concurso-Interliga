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
 */
export default function AdminBackToPanel() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let active = true;
    supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (active) setIsAdmin(data?.role === "admin");
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (!isAdmin) return null;

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
