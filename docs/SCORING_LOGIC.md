# 🧮 Lógica de Puntuación — FUENTE ÚNICA DE VERDAD

> Este documento es **normativo**. Si el código contradice algo de aquí, el bug es en el código.
> Última revisión: 2026-10-17 · Regla #5 **eliminada** el 16/09/2026.

## 1. Las 4 reglas (no hay más)

| Puntos | Concepto | Campo del desglose |
|--------|----------|--------------------|
| **+3** | Resultado general correcto (1X2: gana local / empate / gana visitante) | `pointsSign` |
| **+2** | Marcador exacto (ej. 2-1 y fue 2-1) | `pointsExactScore` |
| **+1** | Diferencia de **1 gol total** en el marcador (|Δlocal| + |Δvisita| = 1) | `pointsGoalDiff` |
| **+1** | Por **cada** autor de gol acertado por nombre | `pointsScorersName` |
| ~~—~~ | ~~Regla #5 (cantidad exacta de goles del líder goleador)~~ → **ELIMINADA**. `pointsScorersQuantity` se mantiene **siempre en 0** por compatibilidad con registros históricos. | `pointsScorersQuantity` |

**Máximo teórico por partido: 3 + 2 + 10 = 15 puntos** (los +1 de diferencia de gol y los 10 de
goleadores son mutuamente excluyentes con el exacto: si acierta el marcador exacto no aplica el +1
de diferencia).

### Reglas de aplicación exactas

1. `pointsSign` se calcula con `Math.sign(local − visita)` de la predicción vs el resultado real.
2. `pointsExactScore` **sólo** si ambos marcadores coinciden exactamente.
3. `pointsGoalDiff` **sólo** cuando **no** es exacto y `|Δlocal| + |Δvisita| === 1`.
4. `pointsScorersName`: ver §3.

## 2. Dónde vive la regla (dos motores, una sola ley)

| Motor | Archivo | Lo usa |
|-------|---------|--------|
| **JS** | `scripts/lib/score-utils.js` → `calculateScore()` | cron, `evaluate-matches.js`, `recalcular-puntos.js`, `auto-sync-espn-results.js`, `verify-logic.js` |
| **TS** | `src/lib/scoring.ts` → `calculateScore()` | frontend (ranking, mis-pronósticos, modal de desglose) |

**Ningún otro archivo puede reimplementar la regla.** Si necesitás puntuar algo, importá uno de
estos dos. Una copia propia de la regla es un bug, aunque hoy coincida.

### Garantía automática: prueba de paridad

`scripts/verify-engine-parity.js` compara **campo por campo** los dos motores sobre:

- **los pronósticos reales evaluados** (`officialEvaluatedPredictions.json`): exige que ambos motores
  coincidan **y** que reproduzcan exactamente el `points` guardado en la base de datos;
- **19 casos límite** (exacto, diferencia de 1, diferencia de 2, signo erróneo, goleadores con
  acentos/apellido suelto, anti-inflación, cap 5/equipo, Regla #5 eliminada, `team` ausente…).

Si los dos motores divergen → **exit 1**. Es la prueba que faltaba: `verify-logic.js` sólo probaba el
motor JS, por eso una divergencia entre frontend y cron podía pasar desapercibida (el síntoma de
"me cambiaron los puntos": el ranking mostraba un número y la base de datos guardaba otro).

## 3. Goleadores (+1 cada uno)

- Se acredita **+1 por cada goleador pronosticado que exista entre los goleadores reales** con
  `goals > 0`.
- **Matching por nombre** (`arePlayersMatching`): normaliza acentos/mayúsculas, aplica normalización
  fonética (ç/z/s → s, y/i → i, b/v → b) y acepta nombre completo vs apellido suelto
  (`Kane` = `Harry Kane`), iniciales (`N. Williams` = `Nico Williams`) y variantes (`Gonçalo Ramos`
  = `Gonzalo Ramos`).
- **Anti-inflación (doble candado):**
  - cada **nombre pronosticado** se evalúa **una sola vez** (`creditedPredNames`);
  - cada **goleador real** se acredita **una sola vez** (`creditedRealScorers`);
  - **cap de 5 goleadores por equipo** (máx. 10 por pronóstico). El equipo se toma del campo
    `team` (`away`; cualquier otro valor o ausente = `home`).
- Los goleadores reales con `goals = 0` **no** acreditan puntos.

## 4. Candados de integridad (defensa en profundidad)

| Capa | Mecanismo | Efecto |
|------|-----------|--------|
| DB | Trigger `trg_points_server_only` (`enforce_points_service_only`) | Sólo el rol `service_role` puede escribir/cambiar `points` y `created_at`. Un INSERT/UPDATE desde `anon`/`authenticated` con `points` no nulo **falla**. |
| DB | Trigger `trg_enforce_max_scorers` | Máximo 5 goleadores por equipo por pronóstico. |
| DB | Trigger `trg_enforce_team_lock` | El club elegido no se puede cambiar sin reiniciar la participación. |
| Cron | `isPredictionOnTime()` | Un pronóstico **registrado en/después del pitazo inicial** (o retroactivo) **no se evalúa** y queda sin puntos. Esto es **intencional** (anti-farmeo), no un fallo. |
| Cron | El cron sólo escribe puntos de partidos con resultado final | Un partido sin terminar deja `points = NULL` → la UI lo muestra como pendiente. |
| UI | Regla anti-copia (`diffMin > 1`) | Los partidos no iniciados ocultan el pronóstico (`🔒 ? - ?`). |

## 5. Cómo verificar (antes de cualquier commit)

```bash
npm run verify        # verify-logic (59 checks) + verify-engine-parity (paridad JS↔TS)
```

Ambos comandos corren en CI (`verify.yml` en cada PR y en `deploy.yml` antes de construir), así que
una divergencia **bloquea el despliegue**.

## 6. Historial de la regla

| Fecha | Cambio |
|-------|--------|
| 16/09/2026 | **Regla #5 eliminada** (cantidad exacta de goles del líder goleador). `pointsScorersQuantity` queda fijo en 0. |
| — | Cap de goleadores fijado en **5 por equipo** (antes global) y alineado en motor JS, motor TS y trigger de DB. |
| 2026-10-17 | Añadida la **prueba de paridad JS↔TS** y este documento normativo. Máximo oficial = **15 pts**. |
| 2026-10-17 | **Anti-copia (RLS)**: la lectura pública de `predictions`/`prediction_scorers` se limita a partidos **ya iniciados** y los abiertos se leen por la RPC enmascarada `get_public_predictions(p_user_id)`. Efecto secundario aceptado: el ranking solo cuenta pronósticos de partidos iniciados. **La puntuación no cambia** (`verify-logic.js` 59 checks + paridad 20/76 verdes). |
