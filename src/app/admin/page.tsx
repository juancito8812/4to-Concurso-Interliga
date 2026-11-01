"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

interface DashboardStats {
  generated_at: string;
  participants: { total: number; with_club: number; admins: number; new_7d: number };
  predictions: { total: number; scored: number; last_24h: number; last_7d: number; last_at: string | null };
  matches: { total: number; with_result: number; overdue: number };
  survivors: { alive: number; eliminated: number; total: number };
  activity_7d: { date: string; count: number }[];
  top_clubs: { name: string; league: string | null; logo_url: string | null; count: number }[];
  cups: { slug: string; alive: number; eliminated: number; total: number }[];
}

interface Fixture {
  id: string;
  home_team: string;
  away_team: string;
  match_date: string;
  league: string;
  home_logo?: string;
  away_logo?: string;
}

interface EvaluatedMatch {
  id: string;
  match_date: string;
  league: string;
  home_team?: string;
  away_team?: string;
  result_home: number;
  result_away: number;
}

const CUP_LABELS: Record<string, string> = {
  champions: "Champions League",
  europa: "Europa League",
  copadelrey: "Copa del Rey",
  coppaitalia: "Coppa Italia",
  dfbpokal: "DFB Pokal",
  dflsupercup: "DFL Supercup",
  facup: "FA Cup",
};

const nf = new Intl.NumberFormat("es-VE");

function fmtDate(iso: string | null, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-VE", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Caracas",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function effectiveTime(matchDate: string): number {
  if (!matchDate) return 0;
  if (matchDate.includes("T00:00:00") || matchDate.length === 10) {
    return new Date(`${matchDate.slice(0, 10)}T20:00:00Z`).getTime();
  }
  return new Date(matchDate).getTime();
}

function closingLabel(matchDate: string, now: number): string {
  const diffMin = (effectiveTime(matchDate) - now) / 60000;
  if (!Number.isFinite(diffMin) || diffMin <= 1) return "Cerrado";
  if (diffMin <= 60) return `Cierra en ${Math.max(1, Math.round(diffMin - 1))} min`;
  if (diffMin <= 1440) return `Cierra en ${Math.round((diffMin - 1) / 60)} h`;
  return `En ${Math.round(diffMin / 1440)} d`;
}

export default function AdminHomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [evaluated, setEvaluated] = useState<EvaluatedMatch[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const [rpc, fixturesRes, evaluatedRes] = await Promise.all([
      supabase.rpc("admin_dashboard_stats"),
      fetch("/data/officialFixtures.json").catch(() => null),
      fetch("/data/officialEvaluatedMatches.json").catch(() => null),
    ]);

    if (rpc.error) {
      setError(rpc.error.message);
    } else {
      setStats(rpc.data as DashboardStats);
    }

    if (fixturesRes?.ok) {
      try {
        setFixtures((await fixturesRes.json()) as Fixture[]);
      } catch {
        /* JSON corrupto: se ignora el bloque */
      }
    }
    if (evaluatedRes?.ok) {
      try {
        setEvaluated((await evaluatedRes.json()) as EvaluatedMatch[]);
      } catch {
        /* idem */
      }
    }

    setNow(Date.now());
    setLoading(false);
  }, []);

  useEffect(() => {
    const kick = setTimeout(() => {
      void load();
    }, 0);
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      clearTimeout(kick);
      clearInterval(t);
    };
  }, [load]);

  const upcoming = useMemo(() => {
    if (!now) return [];
    return fixtures
      .filter((f) => effectiveTime(f.match_date) > now)
      .sort((a, b) => effectiveTime(a.match_date) - effectiveTime(b.match_date))
      .slice(0, 6);
  }, [fixtures, now]);

  const lastEvaluated = useMemo(() => {
    if (!evaluated.length) return null;
    return evaluated.reduce((acc, m) => (effectiveTime(m.match_date) > effectiveTime(acc.match_date) ? m : acc));
  }, [evaluated]);

  const activity = useMemo(() => {
    const days: { key: string; label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const found = stats?.activity_7d.find((a) => a.date.slice(0, 10) === key);
      days.push({
        key,
        label: d.toLocaleDateString("es-VE", { weekday: "short", timeZone: "America/Caracas" }),
        count: found?.count ?? 0,
      });
    }
    return days;
  }, [stats]);

  const maxActivity = Math.max(1, ...activity.map((d) => d.count));
  const totalActivity = activity.reduce((s, d) => s + d.count, 0);
  const pendingResults = stats?.matches.overdue ?? 0;

  const kpi = (label: string, value: string, hint: string, tone: "normal" | "warn" | "good" = "normal") => (
    <div className="bg-navy-mid border border-border rounded-2xl p-4 sm:p-5">
      <p className="text-[11px] uppercase tracking-wide text-silver/70">{label}</p>
      <p
        className={`text-2xl sm:text-3xl font-bold mt-2 ${
          tone === "warn" ? "text-amber-400" : tone === "good" ? "text-green" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="text-[11px] text-silver/60 mt-1">{hint}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="bg-navy-mid border border-border rounded-2xl p-5 sm:p-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Panel de administración</h1>
          <p className="text-silver/80 text-sm mt-1">
            Estado del 4° Concurso Interliga · datos oficiales sincronizados por cron cada 30 min.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-silver/60">
            {stats ? `Leído ${fmtDate(stats.generated_at, true)}` : loading ? "Leyendo…" : "Sin datos"}
          </span>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-white hover:border-gold/60 disabled:opacity-50"
          >
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-red-400 text-xs">No se pudieron leer las métricas: {error}</p>
        </div>
      )}

      {pendingResults > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <p className="text-amber-300 text-xs font-semibold">
            {nf.format(pendingResults)} partido{pendingResults === 1 ? "" : "s"} de los últimos 7 días
            sigue{pendingResults === 1 ? "" : "n"} sin resultado oficial (más de 3 h desde el inicio).
          </p>
          <p className="text-amber-200/70 text-[11px] mt-1">
            Si son de ligas cubiertas por ESPN, revisá la última corrida del cron; si no, cargá el resultado a mano.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {kpi(
          "Participantes",
          stats ? nf.format(stats.participants.total) : "…",
          stats ? `${stats.participants.with_club} con club · ${stats.participants.total - stats.participants.with_club} sin club` : "cuentas registradas"
        )}
        {kpi(
          "Pronósticos",
          stats ? nf.format(stats.predictions.total) : "…",
          stats ? `${stats.predictions.last_24h} en 24 h · ${nf.format(stats.predictions.scored)} evaluados` : "enviados al sistema"
        )}
        {kpi(
          "Partidos con resultado",
          stats ? nf.format(stats.matches.with_result) : "…",
          stats ? `de ${nf.format(stats.matches.total)} en calendario` : "calendario oficial"
        )}
        {kpi(
          "Pendientes de resultado",
          stats ? nf.format(stats.matches.overdue) : "…",
          pendingResults > 0 ? "revisar cron o cargar a mano" : "todo al día",
          pendingResults > 0 ? "warn" : "good"
        )}
        {kpi(
          "Supervivientes vivos",
          stats ? nf.format(stats.survivors.alive) : "…",
          stats ? `${stats.survivors.eliminated} eliminados de ${stats.survivors.total}` : "copas KO"
        )}
        {kpi(
          "Nuevos (7 días)",
          stats ? nf.format(stats.participants.new_7d) : "…",
          stats ? `${stats.participants.admins} admin${stats.participants.admins === 1 ? "" : "s"} en total` : "altas recientes",
          stats && stats.participants.new_7d > 0 ? "good" : "normal"
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-navy-mid border border-border rounded-2xl p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-white">Actividad · últimos 7 días</h2>
            <span className="text-[11px] text-silver/60">{nf.format(totalActivity)} pronósticos</span>
          </div>
          <div className="mt-4 flex items-end gap-2 h-28">
            {activity.map((d) => (
              <div key={d.key} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[10px] text-silver/70">{d.count || ""}</span>
                <div
                  className={`w-full rounded-t ${d.count ? "bg-gold/70" : "bg-border"}`}
                  style={{ height: `${Math.max(4, (d.count / maxActivity) * 80)}px` }}
                  title={`${d.label}: ${d.count}`}
                />
                <span className="text-[10px] text-silver/50 capitalize">{d.label.replace(".", "")}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-silver/50 mt-3">
            Último pronóstico: {stats?.predictions.last_at ? fmtDate(stats.predictions.last_at, true) : "—"}
          </p>
        </div>

        <div className="bg-navy-mid border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white">Clubes más elegidos</h2>
          {stats?.top_clubs.length ? (
            <ul className="mt-3 space-y-2">
              {stats.top_clubs.slice(0, 6).map((c) => {
                const pct = (c.count / Math.max(1, stats.participants.with_club)) * 100;
                return (
                  <li key={`${c.name}-${c.league}`} className="flex items-center gap-2">
                    {c.logo_url ? (
                      <img src={c.logo_url} alt="" className="w-5 h-5 object-contain rounded-full bg-white p-0.5" />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-border" />
                    )}
                    <span className="text-xs text-white w-28 truncate">{c.name}</span>
                    <span className="flex-1 h-1.5 rounded bg-border overflow-hidden">
                      <span className="block h-full bg-gold/70" style={{ width: `${Math.max(4, pct)}%` }} />
                    </span>
                    <span className="text-[11px] text-silver/70 tabular-nums w-6 text-right">{c.count}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[11px] text-silver/50 mt-3">Nadie eligió club todavía.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-navy-mid border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white">Supervivientes por copa</h2>
          {stats?.cups.length ? (
            <div className="mt-3 space-y-2">
              {stats.cups.map((c) => (
                <div key={c.slug} className="flex items-center gap-3 text-xs">
                  <span className="text-white flex-1">{CUP_LABELS[c.slug] ?? c.slug}</span>
                  <span className="text-green tabular-nums">{c.alive} vivos</span>
                  <span className="text-red-400/80 tabular-nums">{c.eliminated} fuera</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-silver/50 mt-3">Sin participantes en copas KO.</p>
          )}
        </div>

        <div className="bg-navy-mid border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white">Datos oficiales (build actual)</h2>
          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-silver/70">Fixture en calendario</dt>
              <dd className="text-white tabular-nums">{nf.format(fixtures.length)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-silver/70">Partidos con resultado</dt>
              <dd className="text-white tabular-nums">{nf.format(evaluated.length)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-silver/70">Último resultado cargado</dt>
              <dd className="text-white text-right">
                {lastEvaluated
                  ? `${fmtDate(lastEvaluated.match_date)} · ${lastEvaluated.home_team ?? ""} ${
                      lastEvaluated.result_home
                    }-${lastEvaluated.result_away} ${lastEvaluated.away_team ?? ""}`.trim()
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-silver/70">Ligas en calendario</dt>
              <dd className="text-white tabular-nums">
                {new Set(fixtures.map((f) => f.league)).size || "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-navy-mid border border-border rounded-2xl p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-white">Próximos partidos · cierre de pronósticos</h2>
          <Link href="/pronosticar" className="text-[11px] text-gold hover:text-gold-light">
            Ir a pronosticar →
          </Link>
        </div>
        {upcoming.length ? (
          <ul className="mt-3 divide-y divide-border/60">
            {upcoming.map((f) => (
              <li key={f.id} className="py-2 flex items-center gap-3 text-xs">
                <span className="text-silver/70 w-24 shrink-0">{fmtDate(f.match_date, true)}</span>
                <span className="text-white flex-1 truncate">
                  {f.home_team} <span className="text-silver/50">vs</span> {f.away_team}
                </span>
                <span className="text-silver/50 hidden sm:block w-28 truncate">{f.league}</span>
                <span className="text-gold/90 w-24 text-right">{closingLabel(f.match_date, now)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-silver/50 mt-3">
            {now ? "Sin partidos futuros en el calendario publicado." : "Calculando…"}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: "/admin/cuenta", title: "Mi cuenta", hint: "Cambiar la contraseña del administrador" },
          { href: "/ranking", title: "Ranking general", hint: "Ver la tabla pública del concurso" },
          { href: "/pronosticar", title: "Cargar pronósticos", hint: "Vista de participante para probar el flujo" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="bg-navy-mid border border-border hover:border-gold/60 rounded-2xl p-5 transition-colors"
          >
            <p className="text-white font-semibold text-sm">{l.title}</p>
            <p className="text-silver/70 text-xs mt-1">{l.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
