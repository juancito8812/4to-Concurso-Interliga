# Knockout Survivor (Herencia de Equipo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the "Sobreviviente / Herencia de Equipo" mechanic for cup knockout competitions (Champions League, Europa League, Conference League, Copa Italia), where participants inherit the winning team's jersey when successfully predicting an upset/rival win while keeping their main league club fixed.

**Architecture:** A standalone Supabase table `tournament_survivors` tracks `(user_id, tournament_slug, active_team_id, status, history)` independently for each cup tournament. A dedicated TypeScript module `src/lib/survivor.ts` provides pure evaluation logic and Supabase RPC/queries. The UI integrates survivor badges into `CompetitionStatusCard.tsx`, `/pronosticar`, and `/mis-pronosticos`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Supabase PostgreSQL with RLS.

## Global Constraints

- Scope: Champions League (`champions`), Europa League (`europa`), Conference League (`conference`), Copa Italia (`coppaitalia`).
- Main League Club (`profiles.team_id`) remains 100% fixed and is never modified by cup survivor events.
- Survivor status can only be `ALIVE` or `ELIMINATED`.
- Transfer event is triggered when user predicted rival $E_{\text{pred}} \neq E_{\text{activo}}$ and $E_{\text{pred}}$ advances/wins.
- All code must pass `npm run build` and `npm run lint` with 0 errors.

---

### Task 1: Database Migration & Supabase Types for `tournament_survivors`

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `DISASTER_RECOVERY_AND_SCHEMA.md`

**Interfaces:**
- Produces: `tournament_survivors` table schema, RLS policies, and index definitions.

- [ ] **Step 1: Add `tournament_survivors` table definition to `supabase/schema.sql`**
- [ ] **Step 2: Add RLS policies allowing public read and authenticated write for owner**
- [ ] **Step 3: Update `DISASTER_RECOVERY_AND_SCHEMA.md` with the new table definition**
- [ ] **Step 4: Commit migration definitions**

```bash
git add supabase/schema.sql DISASTER_RECOVERY_AND_SCHEMA.md
git commit -m "feat(db): anadir tabla y politicas RLS tournament_survivors"
```

---

### Task 2: Survivor Domain Logic Module (`src/lib/survivor.ts`)

**Files:**
- Create: `src/lib/survivor.ts`

**Interfaces:**
- Produces:
  - `export interface TournamentSurvivor { id?: string; user_id: string; tournament_slug: string; active_team_id: string; active_team_name?: string; active_team_logo?: string; status: 'ALIVE' | 'ELIMINATED'; eliminated_at_round?: string | null; history: Array<{ from_team: string; to_team: string; match_id: string; round: string; date: string; }>; }`
  - `export function evaluateSurvivorProgression(params: { activeTeamName: string; predictedWinner: string; actualWinner: string; matchId: string; roundName: string; matchDate: string; currentHistory: any[]; }): { newStatus: 'ALIVE' | 'ELIMINATED'; newTeamName: string; updatedHistory: any[]; transferred: boolean; }`
  - `export async function getCupSurvivorStatus(userId: string): Promise<Record<string, TournamentSurvivor>>`
  - `export async function setInitialCupSurvivor(userId: string, tournamentSlug: string, teamId: string): Promise<boolean>`
  - `export async function updateCupSurvivor(survivor: TournamentSurvivor): Promise<boolean>`

- [ ] **Step 1: Write pure logic functions and interfaces in `src/lib/survivor.ts`**
- [ ] **Step 2: Implement Supabase queries and fallback cache**
- [ ] **Step 3: Verify TypeScript compilation**
- [ ] **Step 4: Commit `src/lib/survivor.ts`**

```bash
git add src/lib/survivor.ts
git commit -m "feat(survivor): crear modulo de logica de superviviente y herencia de equipos"
```

---

### Task 3: Unit Testing of Survivor Evaluation Logic

**Files:**
- Create: `src/lib/__tests__/survivor.test.ts` or standalone test script `scripts/test-survivor.js`

**Interfaces:**
- Consumes: `evaluateSurvivorProgression` from `src/lib/survivor.ts`

- [ ] **Step 1: Write comprehensive test scenarios:**
  1. User with Real Madrid predicts City to win, City wins -> Status `ALIVE`, Active team becomes `Manchester City`, Transfer recorded in history.
  2. User with Real Madrid predicts Real Madrid to win, Real Madrid wins -> Status `ALIVE`, Active team remains `Real Madrid`, No transfer.
  3. User with Real Madrid predicts Real Madrid to win, City wins -> Status `ELIMINATED`.
  4. User with Real Madrid predicts City to win, Real Madrid wins -> Status `ELIMINATED`.
- [ ] **Step 2: Run test script to verify all 4 scenarios pass**
- [ ] **Step 3: Commit test suite**

```bash
git add scripts/test-survivor.js
git commit -m "test(survivor): anadir pruebas unitarias para mecanica de herencia de equipo"
```

---

### Task 4: Interactive Landing Page Card #3 (`src/app/CompetitionStatusCard.tsx`)

**Files:**
- Modify: `src/app/CompetitionStatusCard.tsx`

**Interfaces:**
- Consumes: `getCupSurvivorStatus` from `src/lib/survivor.ts`

- [ ] **Step 1: Load survivor statuses for Champions, Europa League, Conference, and Copa Italia**
- [ ] **Step 2: Render responsive cup chips showing VIVO (with current active team badge) or KO (with round eliminated)**
- [ ] **Step 3: Test visual rendering in browser**
- [ ] **Step 4: Commit `CompetitionStatusCard.tsx`**

```bash
git add src/app/CompetitionStatusCard.tsx
git commit -m "feat(ui): integrar estado multitorneo de superviviente en tarjeta de reglas"
```

---

### Task 5: Forecast Page Knockout Survivor Integration (`src/app/pronosticar/page.tsx`)

**Files:**
- Modify: `src/app/pronosticar/page.tsx`

**Interfaces:**
- Consumes: `getCupSurvivorStatus`, `setInitialCupSurvivor` from `src/lib/survivor.ts`

- [ ] **Step 1: Detect if a match belongs to a knockout competition**
- [ ] **Step 2: Display informative Knockout Survivor banner explaining inheritance rules**
- [ ] **Step 3: If user is ELIMINATED in that cup, disable inputs with an explanatory KO badge**
- [ ] **Step 4: If user's main club is not in the cup and has no cup survivor club selected, render a quick selector for that cup**
- [ ] **Step 5: Verify build with `npm run build`**
- [ ] **Step 6: Commit `src/app/pronosticar/page.tsx`**

```bash
git add src/app/pronosticar/page.tsx
git commit -m "feat(pronosticos): integrar alertas y selector de superviviente en partidos de copa"
```

---

### Task 6: My Predictions Timeline & Documentation (`src/app/mis-pronosticos/page.tsx`)

**Files:**
- Modify: `src/app/mis-pronosticos/page.tsx`
- Modify: `README.md`, `CLAUDE.md`, `AGENTS.md`, `.agents/MEMORY.md`

**Interfaces:**
- Consumes: `getCupSurvivorStatus` from `src/lib/survivor.ts`

- [ ] **Step 1: Add a "Camisetas Heredadas" timeline badge in `mis-pronosticos` for knockout matches**
- [ ] **Step 2: Update all markdown documentation with the new survivor rule and schema**
- [ ] **Step 3: Run `npm run build` and `npm run lint` to verify 0 errors**
- [ ] **Step 4: Commit and push changes**

```bash
git add src/app/mis-pronosticos/page.tsx README.md CLAUDE.md AGENTS.md .agents/MEMORY.md
git commit -m "feat: completar integracion de historial de superviviente y actualizar documentacion"
```
