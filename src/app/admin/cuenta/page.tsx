"use client";

import { useEffect, useState } from "react";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import { supabase } from "@/lib/supabase";

export default function AdminCuentaPage() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-navy-mid border border-border rounded-2xl p-6">
        <h1 className="text-xl font-bold text-white">Mi cuenta</h1>
        <p className="text-silver/80 text-sm mt-1">
          Correo: <span className="text-white">{email || "…"}</span>
        </p>
        <p className="text-silver/60 text-xs mt-2">
          El correo del administrador no se puede cambiar desde el panel: requiere acceso al servidor.
        </p>
      </div>

      <ChangePasswordForm email={email} />
    </div>
  );
}
