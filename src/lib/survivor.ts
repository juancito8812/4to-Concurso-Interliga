import { supabase } from "./supabase";
import { normalizeTeamName } from "./leagueConfig";

import teamAliasesData from "@/data/teamAliases.json";

export interface SurvivorTransferHistory {
  from_team: string;
  to_team: string;
  match_id: string;
  round: string;
  date: string;
}

export interface TournamentSurvivor {
  id?: string;
  user_id: string;
  tournament_slug: string; // 'champions' | 'europa' | 'conference' | 'coppaitalia' | 'facup' | 'copadelrey' | 'dfbpokal'
  active_team_id: string;
  active_team_name?: string;
  active_team_logo?: string;
  status: 'ALIVE' | 'ELIMINATED';
  eliminated_at_round?: string | null;
  history: SurvivorTransferHistory[];
  created_at?: string;
  updated_at?: string;
}

export const KNOCKOUT_CUP_SLUGS = [
  "champions",
  "europa",
  "conference",
  "coppaitalia",
  "facup",
  "copadelrey",
  "dfbpokal",
] as const;
export type KnockoutCupSlug = (typeof KNOCKOUT_CUP_SLUGS)[number];

export function getTeamCups(teamName: string): string[] {
  const cups = (teamAliasesData as { teamCups?: Record<string, string[]> }).teamCups?.[teamName];
  return Array.isArray(cups) ? cups : [];
}

export { isKnockoutCup } from "./leagueConfig";

/**
 * Pure evaluation function for survivor progression in a knockout match.
 */
export function evaluateSurvivorProgression(params: {
  activeTeamName: string;
  predictedWinner: string; // e.g. "Manchester City" or "Real Madrid"
  actualWinner: string;    // e.g. "Manchester City"
  matchId: string;
  roundName: string;
  matchDate: string;
  currentHistory: SurvivorTransferHistory[];
}): {
  newStatus: 'ALIVE' | 'ELIMINATED';
  newTeamName: string;
  updatedHistory: SurvivorTransferHistory[];
  transferred: boolean;
} {
  const activeNorm = normalizeTeamName(params.activeTeamName);
  const predNorm = normalizeTeamName(params.predictedWinner);
  const actualNorm = normalizeTeamName(params.actualWinner);

  // If user correctly predicted the advancing/winning team
  if (predNorm === actualNorm) {
    // If the predicted winner was the opposing team (not user's active team), transfer team!
    if (predNorm !== activeNorm) {
      const transferRecord: SurvivorTransferHistory = {
        from_team: activeNorm,
        to_team: predNorm,
        match_id: params.matchId,
        round: params.roundName,
        date: params.matchDate,
      };
      return {
        newStatus: 'ALIVE',
        newTeamName: predNorm,
        updatedHistory: [...params.currentHistory, transferRecord],
        transferred: true,
      };
    }
    // User predicted their own active team and won
    return {
      newStatus: 'ALIVE',
      newTeamName: activeNorm,
      updatedHistory: params.currentHistory,
      transferred: false,
    };
  }

  // Predicted winner did not win -> User is eliminated (KO)
  return {
    newStatus: 'ELIMINATED',
    newTeamName: activeNorm,
    updatedHistory: params.currentHistory,
    transferred: false,
  };
}

/**
 * Fetch all survivor tournament records for a given user.
 */
export async function getUserCupSurvivors(userId: string): Promise<Record<string, TournamentSurvivor>> {
  try {
    const { data, error } = await supabase
      .from("tournament_survivors")
      .select("*, teams(name, logo_url)")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching tournament_survivors:", error);
      return {};
    }

    const result: Record<string, TournamentSurvivor> = {};
    for (const row of data ?? []) {
      const r = row as Record<string, unknown> & { teams?: { name?: string; logo_url?: string } };
      result[r.tournament_slug as string] = {
        id: r.id as string | undefined,
        user_id: r.user_id as string,
        tournament_slug: r.tournament_slug as string,
        active_team_id: r.active_team_id as string,
        active_team_name: r.teams?.name ?? "",
        active_team_logo: r.teams?.logo_url ?? "",
        status: r.status as 'ALIVE' | 'ELIMINATED',
        eliminated_at_round: r.eliminated_at_round as string | null | undefined,
        history: Array.isArray(r.history) ? (r.history as SurvivorTransferHistory[]) : [],
        created_at: r.created_at as string | undefined,
        updated_at: r.updated_at as string | undefined,
      };
    }

    return result;
  } catch (err) {
    console.error("Failed to query tournament_survivors:", err);
    return {};
  }
}

// Alias for convenience across components/tasks
export const getCupSurvivorStatus = getUserCupSurvivors;

/**
 * Upsert a tournament survivor record.
 * Creates if not exists (status defaults to ALIVE, history to []).
 * Updates existing records with provided fields.
 */
export async function upsertCupSurvivor(survivor: {
  userId: string;
  tournamentSlug: string;
  activeTeamId: string;
  status?: 'ALIVE' | 'ELIMINATED';
  eliminatedAtRound?: string | null;
  history?: SurvivorTransferHistory[];
}): Promise<boolean> {
  try {
    const { error } = await supabase.from("tournament_survivors").upsert(
      {
        user_id: survivor.userId,
        tournament_slug: survivor.tournamentSlug,
        active_team_id: survivor.activeTeamId,
        status: survivor.status ?? "ALIVE",
        eliminated_at_round: survivor.eliminatedAtRound ?? null,
        history: survivor.history ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,tournament_slug" }
    );

    if (error) {
      console.error("Failed to upsert cup survivor:", error);
      return false;
    }
    return true;
  } catch (err) {      console.error("Exception in upsertCupSurvivor:", err);
    return false;
  }
}

/**
 * Initialize a new tournament survivor record (convenience wrapper).
 */
export async function setInitialCupSurvivor(
  userId: string,
  tournamentSlug: string,
  teamId: string
): Promise<boolean> {
  return upsertCupSurvivor({ userId, tournamentSlug, activeTeamId: teamId });
}
