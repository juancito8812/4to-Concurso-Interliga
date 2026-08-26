"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      setError(error);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <Link href="/" className="text-silver text-xs hover:text-white transition-colors inline-flex items-center gap-1 mb-4">← Inicio</Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center">Iniciar Sesión</h1>
        <p className="text-silver text-sm text-center mb-8">Entrá a tu cuenta para pronosticar</p>

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
              className="w-full bg-navy-card border border-border rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold transition-colors"
              placeholder="Tu contraseña"
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
            {loading ? "Ingresando..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className="flex flex-col items-center gap-3 mt-6">
          <Link href="/olvide-contrasena" className="text-gold text-xs hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
          <p className="text-silver text-xs">
            ¿No tenés cuenta?{" "}
            <Link href="/registro" className="text-gold hover:underline">Registrate</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
