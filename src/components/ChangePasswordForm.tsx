"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  email: string;
  onDone?: () => void;
  title?: string;
  subtitle?: string;
}

function validate(pw: string): string | null {
  if (pw.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/[A-ZÁÉÍÓÚÑ]/.test(pw)) return "Debe incluir al menos una mayúscula.";
  if (!/[0-9]/.test(pw)) return "Debe incluir al menos un número.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Debe incluir al menos un símbolo (ej: #, !, $).";
  return null;
}

export default function ChangePasswordForm({
  email,
  onDone,
  title = "Cambiar contraseña",
  subtitle = "Necesitás tu contraseña actual para confirmar el cambio.",
}: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const invalid = validate(next);
    if (invalid) return setError(invalid);
    if (next !== confirm) return setError("Las contraseñas nuevas no coinciden.");
    if (next === current) return setError("La contraseña nueva debe ser distinta a la actual.");

    setLoading(true);

    // Reautenticación: confirma que quien cambia la clave conoce la actual.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (reauthError) {
      setLoading(false);
      return setError("La contraseña actual no es correcta.");
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: next });
    setLoading(false);

    if (updateError) {
      return setError(
        /different from the old|same as/i.test(updateError.message)
          ? "La contraseña nueva debe ser distinta a la actual."
          : `No se pudo cambiar: ${updateError.message}`
      );
    }

    setCurrent("");
    setNext("");
    setConfirm("");
    setSuccess("Contraseña actualizada. Usala la próxima vez que inicies sesión.");
    onDone?.();
  };

  const field =
    "w-full bg-navy-card border border-border rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold transition-colors";

  return (
    <form
      onSubmit={submit}
      className="bg-navy-mid border border-border rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl"
    >
      <div>
        <h2 className="text-white font-bold text-base">{title}</h2>
        <p className="text-silver/80 text-xs mt-1">{subtitle}</p>
      </div>

      <div>
        <label className="block text-silver text-xs mb-1.5">Contraseña actual</label>
        <input
          type={show ? "text" : "password"}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          autoComplete="current-password"
          className={field}
          placeholder="Tu contraseña actual"
        />
      </div>

      <div>
        <label className="block text-silver text-xs mb-1.5">Contraseña nueva</label>
        <input
          type={show ? "text" : "password"}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          autoComplete="new-password"
          className={field}
          placeholder="Mín. 8 caracteres, mayúscula, número y símbolo"
        />
      </div>

      <div>
        <label className="block text-silver text-xs mb-1.5">Repetir contraseña nueva</label>
        <input
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          className={field}
          placeholder="Repetí la contraseña nueva"
        />
      </div>

      <label className="flex items-center gap-2 text-silver/80 text-xs cursor-pointer select-none">
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => setShow(e.target.checked)}
          className="accent-gold"
        />
        Mostrar contraseñas
      </label>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green/10 border border-green/20 rounded-lg p-3">
          <p className="text-green text-xs">{success}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gold text-navy-black font-bold py-3 rounded-full text-sm hover:bg-gold-light transition-colors disabled:opacity-50 cursor-pointer shadow-md"
      >
        {loading ? "Actualizando..." : "Cambiar contraseña"}
      </button>
    </form>
  );
}
