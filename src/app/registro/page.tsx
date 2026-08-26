"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function RegistroPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);
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
          <span className="text-5xl mb-4 block">📧</span>
          <h1 className="text-2xl font-bold text-white mb-4">¡Revisa tu correo!</h1>
          <p className="text-silver text-sm mb-6">
            Te enviamos un link de confirmación a <span className="text-gold">{email}</span>.
            Hacé clic en el link para activar tu cuenta.
          </p>
          <Link href="/login" className="inline-block bg-gold text-navy-black font-bold px-6 py-3 rounded-full text-sm hover:bg-gold-light transition-colors">
            Ir a Iniciar Sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <Link href="/" className="text-silver text-xs hover:text-white transition-colors inline-flex items-center gap-1 mb-4">← Inicio</Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center">Crear Cuenta</h1>
        <p className="text-silver text-sm text-center mb-8">Registrate para participar del concurso</p>

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

          <div>
            <label className="block text-silver text-xs mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-navy-card border border-border rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold transition-colors"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-silver text-xs mb-1.5">Confirmar contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full bg-navy-card border border-border rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold transition-colors"
              placeholder="Repetí tu contraseña"
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
            {loading ? "Creando cuenta..." : "Crear Cuenta"}
          </button>
        </form>

        <p className="text-silver text-xs text-center mt-6">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-gold hover:underline">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
