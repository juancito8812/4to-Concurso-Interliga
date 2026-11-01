import type { Metadata } from "next";
import AdminGuard from "@/components/AdminGuard";

// Todo el segmento /admin queda fuera de buscadores (defensa en profundidad:
// robots.txt ya lo bloquea, pero el meta evita indexación por enlaces directos).
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGuard>{children}</AdminGuard>;
}
