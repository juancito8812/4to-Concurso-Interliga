"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function PerfilPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setDisplayName(data.display_name || "");
        });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, display_name: displayName }, { onConflict: "user_id" });

    setLoading(false);

    if (error) {
      setError("Error al guardar: " + error.message);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4 flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4">
      <div className="max-w-md mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-silver hover:text-white mb-4 transition-colors text-sm"><span className="text-gold">←</span> Volver al inicio</Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Mi Perfil</h1>
        <p className="text-silver text-sm mb-8">Editá tu información personal</p>

        <form onSubmit={handleSubmit} className="bg-navy-mid border border-border rounded-2xl p-6 sm:p-8 space-y-4">
          <div>
            <label className="block text-silver text-xs mb-1.5">Correo electrónico</label>
            <input
              type="email"
              value={user.email || ""}
              disabled
              className="w-full bg-navy-card border border-border rounded-lg px-4 py-3 text-silver text-sm cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-silver text-xs mb-1.5">Nombre para mostrar</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-navy-card border border-border rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold transition-colors"
              placeholder="Tu nombre en el concurso"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <p className="text-green-400 text-xs">¡Perfil actualizado!</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-navy-black font-bold py-3 rounded-full text-sm hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar Cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}
