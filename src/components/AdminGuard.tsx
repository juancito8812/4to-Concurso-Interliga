"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const isLogin = pathname.startsWith("/admin/login");
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (isLogin) return;

    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        if (!cancelled) router.replace("/admin/login/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (cancelled) return;

      if (profile?.role !== "admin") {
        await supabase.auth.signOut();
        router.replace("/admin/login/");
        return;
      }

      setEmail(user.email ?? null);
      setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isLogin, pathname, router]);

  if (isLogin) return <>{children}</>;

  if (checking) {
    return (
      <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4 flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login/");
  };

  const tab = (href: string, label: string) => {
    const active = pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
          active ? "bg-gold text-navy-black" : "text-silver hover:text-white"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen pt-16 sm:pt-20 pb-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-gold font-bold">Panel de administración</p>
            <p className="text-silver/70 text-xs mt-0.5">{email}</p>
          </div>
          <div className="flex items-center gap-2">
            {tab("/admin/cuenta", "Mi cuenta")}
            {tab("/admin", "Panel")}
            <Link href="/" className="px-3 py-1.5 rounded-full text-xs text-silver hover:text-white transition-colors">
              Ir al sitio
            </Link>
            <button
              onClick={signOut}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 hover:text-white transition-colors cursor-pointer"
            >
              Salir
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
