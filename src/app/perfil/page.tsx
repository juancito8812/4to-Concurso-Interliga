"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function PerfilPage() {
  const { user, refreshProfile, deleteAccount, loading: authLoading } = useAuth();
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

    const sanitizedName = displayName.trim().replace(/[\x00-\x1F\x7F]/g, "").slice(0, 40);

    setLoading(true);
    setError("");
    setSuccess(false);

    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, display_name: sanitizedName }, { onConflict: "user_id" });

    setLoading(false);

    if (error) {
      setError("Error al guardar: " + error.message);
    } else {
      setDisplayName(sanitizedName);
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const [resetting, setResetting] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleResetData = async () => {
    if (!user) return;
    setResetting(true);
    setError("");

    try {
      // 1. Delete user predictions from Supabase
      const { data: userPreds } = await supabase
        .from("predictions")
        .select("id")
        .eq("user_id", user.id);

      if (userPreds && userPreds.length > 0) {
        const predIds = userPreds.map((p) => p.id);
        await supabase.from("prediction_scorers").delete().in("prediction_id", predIds);
        await supabase.from("predictions").delete().eq("user_id", user.id);
      }

      // 1b. Reset cup survivor records (active teams, history and status)
      await supabase.from("tournament_survivors").delete().eq("user_id", user.id);

      // 2. Clear team and display name in profiles
      await supabase
        .from("profiles")
        .upsert({ user_id: user.id, team_id: null, display_name: null }, { onConflict: "user_id" });

      // 3. Clear localStorage on device
      try {
        localStorage.removeItem(`interliga_predictions_${user.id}`);
        localStorage.removeItem("interliga_predictions_anon");
        localStorage.removeItem("interliga_predictions_guest");
        localStorage.removeItem("interliga_predictions_default");
        localStorage.removeItem("interliga_selected_team");
        localStorage.removeItem("interliga_selected_team_name");
        localStorage.removeItem("interliga_user_profile");
        // Clear any other interliga keys
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("interliga_")) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn("Error clearing localStorage:", e);
      }

      setResetting(false);
      setShowConfirmReset(false);
      // Redirect to home with fresh state
      router.push("/?reset=success");
    } catch (err: unknown) {
      console.error("Error resetting account:", err);
      setError("Error al reiniciar datos");
      setResetting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    setError("");

    const { error: delErr } = await deleteAccount();
    if (delErr) {
      setError("Error al eliminar cuenta: " + delErr);
      setDeleting(false);
      setShowConfirmDelete(false);
    } else {
      router.push("/?deleted=success");
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
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-silver hover:text-white mb-4 transition-colors text-sm">
            <span className="text-gold">←</span> Volver al inicio
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Mi Perfil</h1>
          <p className="text-silver text-sm">Editá tu información personal o administrá tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-navy-mid border border-border rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div>
            <label className="block text-silver text-xs mb-1.5 font-medium">Correo electrónico</label>
            <input
              type="email"
              value={user.email || ""}
              disabled
              className="w-full bg-navy-card border border-border rounded-lg px-4 py-3 text-silver text-sm cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-silver text-xs mb-1.5 font-medium">Nombre de usuario (Apodo en el concurso)</label>
            <input
              type="text"
              value={displayName}
              maxLength={40}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-navy-card border border-border rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold transition-colors"
              placeholder="Ej: JuanRaudel, LucasDT, Franco10"
            />
            <span className="text-[11px] text-silver/70 mt-1 block">
              Este nombre de usuario es el que aparecerá en la tabla de posiciones, podio y estadísticas del concurso.
            </span>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green/10 border border-green/20 rounded-lg p-3">
              <p className="text-green text-xs">¡Perfil actualizado con éxito!</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-navy-black font-bold py-3 rounded-full text-sm hover:bg-gold-light transition-colors disabled:opacity-50 cursor-pointer shadow-md"
          >
            {loading ? "Guardando..." : "Guardar Cambios"}
          </button>
        </form>

        {/* Zona de Gestión / Peligro */}
        <div className="bg-navy-mid border border-red-500/30 rounded-2xl p-6 space-y-6 shadow-xl">
          
          {/* Opción 1: Reiniciar Pronósticos */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <span>🔄</span>
              <span>Reiniciar Participación (Elegir otro club)</span>
            </div>
            <p className="text-silver/80 text-xs leading-relaxed">
              Borra tu club confirmado actual y todos tus pronósticos para reiniciar tus puntos a 0 y elegir otro club. Tu cuenta y correo seguirán existiendo.
            </p>

            {!showConfirmReset ? (
              <button
                type="button"
                onClick={() => setShowConfirmReset(true)}
                className="w-full bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 hover:text-white font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                🔄 Reiniciar pronósticos y club (0 pts)
              </button>
            ) : (
              <div className="bg-navy-dark/90 border border-amber-500/40 rounded-xl p-4 space-y-3">
                <p className="text-amber-300 text-xs font-semibold text-center">
                  ¿Confirmás que querés borrar tu club y pronósticos para empezar de cero?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={resetting}
                    onClick={handleResetData}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {resetting ? "Reiniciando..." : "Sí, reiniciar"}
                  </button>
                  <button
                    type="button"
                    disabled={resetting}
                    onClick={() => setShowConfirmReset(false)}
                    className="flex-1 bg-navy-card hover:bg-navy-card/80 text-silver border border-border py-2 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/70" />

          {/* Opción 2: Eliminar Cuenta Totalmente y Liberar Email */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <span>🗑️</span>
              <span>Eliminar Cuenta Definitivamente</span>
            </div>
            <p className="text-silver/80 text-xs leading-relaxed">
              Elimina por completo tu cuenta de usuario, tus datos y registros de la base de datos. <strong className="text-white">Tu correo quedará 100% liberado</strong> para registrar una nueva cuenta cuando lo desees.
            </p>

            {!showConfirmDelete ? (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="w-full bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-600 hover:text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
              >
                🗑️ Eliminar mi cuenta y liberar mi correo
              </button>
            ) : (
              <div className="bg-navy-dark/95 border border-red-500/60 rounded-xl p-4 space-y-3 shadow-2xl">
                <p className="text-red-300 text-xs font-bold text-center leading-relaxed">
                  ⚠️ Esta acción es irreversible. Se eliminará tu cuenta y tu correo quedará libre. ¿Deseas continuar?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDeleteAccount}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {deleting ? "Eliminando..." : "Sí, eliminar cuenta"}
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setShowConfirmDelete(false)}
                    className="flex-1 bg-navy-card hover:bg-navy-card/80 text-silver border border-border py-2 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
