"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

const leagueData: Record<string, { name: string; apiId: number }> = {
  laliga: { name: "LaLiga", apiId: 140 },
  premier: { name: "Premier League", apiId: 39 },
  seriea: { name: "Serie A", apiId: 135 },
  bundesliga: { name: "Bundesliga", apiId: 78 },
  champions: { name: "Champions League", apiId: 2 },
  europa: { name: "Europa League", apiId: 3 },
  conference: { name: "Conference League", apiId: 848 },
  coppaitalia: { name: "Copa Italia", apiId: 137 },
};

interface Standing {
  rank: number;
  team: { name: string; logo: string };
  points: number;
  goalsDiff: number;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
}

export default function TablaLigaClient() {
  const params = useParams();
  const league = params.league as string;
  const data = leagueData[league];
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!data) return;

    const fetchStandings = async () => {
      try {
        const res = await fetch(
          `https://v3.football.api-sports.io/standings?league=${data.apiId}&season=2025`,
          {
            headers: {
              "x-rapidapi-host": "v3.football.api-sports.io",
              "x-rapidapi-key": "demo",
            },
          }
        );
        const json = await res.json();
        if (json.response && json.response[0]) {
          setStandings(json.response[0].league.standings[0]);
        } else {
          setError("No se pudo cargar la clasificación");
        }
      } catch {
        setError("Error al conectar con la API");
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, [data]);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Liga no encontrada</h1>
          <Link href="/" className="text-gold hover:underline">← Volver al inicio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-silver hover:text-white mb-8 transition-colors">
          <span className="text-gold">←</span> Volver al inicio
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">{data.name}</h1>
        <p className="text-silver text-sm mb-8">Tabla de posiciones - Temporada 2025-26</p>

        <div className="rounded-2xl overflow-hidden border border-border bg-navy-mid">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-silver text-sm">Cargando clasificación...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-silver">{error}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-xs text-silver uppercase">
                    <th className="px-4 py-3 text-left w-12">#</th>
                    <th className="px-4 py-3 text-left">Equipo</th>
                    <th className="px-4 py-3 text-center w-12">PJ</th>
                    <th className="px-4 py-3 text-center w-12">G</th>
                    <th className="px-4 py-3 text-center w-12">E</th>
                    <th className="px-4 py-3 text-center w-12">P</th>
                    <th className="px-4 py-3 text-center w-16">DG</th>
                    <th className="px-4 py-3 text-center w-14 font-bold text-gold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s) => (
                    <tr
                      key={s.rank}
                      className="border-b border-border/50 hover:bg-navy-card transition-colors"
                    >
                      <td className="px-4 py-3 text-silver text-sm">{s.rank}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={s.team.logo}
                            alt={s.team.name}
                            className="w-6 h-6 object-contain"
                          />
                          <span className="text-white text-sm font-medium">{s.team.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-silver text-sm">{s.all.played}</td>
                      <td className="px-4 py-3 text-center text-silver text-sm">{s.all.win}</td>
                      <td className="px-4 py-3 text-center text-silver text-sm">{s.all.draw}</td>
                      <td className="px-4 py-3 text-center text-silver text-sm">{s.all.lose}</td>
                      <td className="px-4 py-3 text-center text-silver text-sm">{s.goalsDiff > 0 ? `+${s.goalsDiff}` : s.goalsDiff}</td>
                      <td className="px-4 py-3 text-center text-gold font-bold text-sm">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
