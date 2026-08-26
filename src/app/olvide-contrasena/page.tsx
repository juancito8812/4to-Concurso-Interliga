"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function OlvideContrasenaPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await resetPassword(email);
    setLoading(false);

    if (error) {
      setError(error);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <span className="text-5xl mb-4 block">📬</span>
          <h1 className="text-2xl font-bold text-white mb-4">¡Email enviado!</h1>
          <p className="text-silver text-sm mb-6">
            Te enviamos un link para recuperar tu contraseña a <span className="text-gold">{email}</span>.
            Revisá tu bandeja de entrada.
          </p>
          <Link href="/login" className="inline-block bg-gold text-navy-black font-bold px-6 py-3 rounded-full text-sm hover:bg-gold-light transition-colors">
            Volver a Iniciar Sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <Link href="/" className="text-silver text-xs hover:text-white transition-colors inline-flex items-center gap-1 mb-4">← Inicio</Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center">Recuperar Contraseña</h1>
        <p className="text-silver text-sm text-center mb-8">Ingresa tu correo y te enviamos un link para restablecerla</p>

        <form onSubmit={handleSubmit} className="bg-navy-mid border border-border rounded-2xl p-6 sm:p-8 space-y-4">
          <div>
            <label className="block text-silver text-xs mb-1.5">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-navy-card border border-border rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold transition-colors"
              placeholder="tu@email.com"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-navy-black font-bold py-3 rounded-full text-sm hover:bg-gold-light transition-colors disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar Link de Recuperación"}
          </button>
        </form>

        <p className="text-silver text-xs text-center mt-6">
          ¿Recordaste tu contraseña?{" "}
          <Link href="/login" className="text-gold hover:underline">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
