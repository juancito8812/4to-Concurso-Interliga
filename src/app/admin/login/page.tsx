"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Si ya hay sesión de admin, entrar directo.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user;
      if (!u) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", u.id)
        .single();
      if (profile?.role === "admin") router.replace("/admin/");
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      setLoading(false);
      setError("Correo o contraseña incorrectos.");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", data.user.id)
      .single();

    setLoading(false);

    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      setError("Esta cuenta no tiene permisos de administrador.");
      return;
    }

    router.replace("/admin/");
  };

  const field =
    "w-full bg-navy-card border border-border rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold transition-colors";

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <Link href="/" className="inline-flex items-center gap-2 text-silver hover:text-white mb-4 transition-colors text-sm">
          <span className="text-gold">←</span> Volver al inicio
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center">Administración</h1>
        <p className="text-silver text-sm text-center mb-8">Acceso exclusivo del organizador del concurso</p>

        <form onSubmit={handleSubmit} className="bg-navy-mid border border-border rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div>
            <label className="block text-silver text-xs mb-1.5">Correo del administrador</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              className={field}
              placeholder="admin@…"
            />
          </div>

          <div>
            <label className="block text-silver text-xs mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={field}
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
            className="w-full bg-gold text-navy-black font-bold py-3 rounded-full text-sm hover:bg-gold-light transition-colors disabled:opacity-50 cursor-pointer shadow-md"
          >
            {loading ? "Verificando..." : "Entrar al panel"}
          </button>
        </form>
      </div>
    </div>
  );
}
