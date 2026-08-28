import { supabase } from "@/lib/supabase";
import { normalizeTeamName, cleanTeamName } from "@/lib/leagueConfig";

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
  tournament_slug: string; // 'champions' | 'europa' | 'conference' | 'coppaitalia'
  active_team_id: string;
  active_team_name?: string;
  active_team_logo?: string;
  status: 'ALIVE' | 'ELIMINATED';
  eliminated_at_round?: string | null;
  history: SurvivorTransferHistory[];
  created_at?: string;
  updated_at?: string;
}

export const KNOCKOUT_CUP_SLUGS = ["champions", "europa", "conference", "coppaitalia"] as const;
export type KnockoutCupSlug = (typeof KNOCKOUT_CUP_SLUGS)[number];

export function isKnockoutCup(leagueOrSlug: string): boolean {
  const norm = leagueOrSlug.toLowerCase().trim();
  return (
    norm.includes("champions") ||
    norm.includes("europa") ||
    norm.includes("conference") ||
    norm.includes("copa italia") ||
    norm.includes("coppa") ||
    norm === "cl" ||
    norm === "el" ||
    norm === "ecl" ||
    norm === "ci"
  );
}

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
    (data || []).forEach((row: any) => {
      result[row.tournament_slug] = {
        id: row.id,
        user_id: row.user_id,
        tournament_slug: row.tournament_slug,
        active_team_id: row.active_team_id,
        active_team_name: row.teams?.name || "",
        active_team_logo: row.teams?.logo_url || "",
        status: row.status,
        eliminated_at_round: row.eliminated_at_round,
        history: Array.isArray(row.history) ? row.history : [],
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    return result;
  } catch (err) {
    console.error("Failed to query tournament_survivors:", err);
    return {};
  }
}

// Alias for convenience across components/tasks
export const getCupSurvivorStatus = getUserCupSurvivors;

/**
 * Initialize or set initial representative club for a cup tournament.
 */
export async function setInitialCupSurvivor(
  userId: string,
  tournamentSlug: string,
  teamId: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from("tournament_survivors").upsert(
      {
        user_id: userId,
        tournament_slug: tournamentSlug,
        active_team_id: teamId,
        status: "ALIVE",
        history: [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,tournament_slug" }
    );

    if (error) {
      console.error("Failed to set initial cup survivor:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Exception in setInitialCupSurvivor:", err);
    return false;
  }
}

/**
 * Update an existing tournament survivor record.
 */
export async function updateCupSurvivor(survivor: {
  userId: string;
  tournamentSlug: string;
  activeTeamId: string;
  status: 'ALIVE' | 'ELIMINATED';
  eliminatedAtRound?: string | null;
  history: SurvivorTransferHistory[];
}): Promise<boolean> {
  try {
    const { error } = await supabase.from("tournament_survivors").upsert(
      {
        user_id: survivor.userId,
        tournament_slug: survivor.tournamentSlug,
        active_team_id: survivor.activeTeamId,
        status: survivor.status,
        eliminated_at_round: survivor.eliminatedAtRound || null,
        history: survivor.history,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,tournament_slug" }
    );

    if (error) {
      console.error("Failed to update cup survivor:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Exception in updateCupSurvivor:", err);
    return false;
  }
}
