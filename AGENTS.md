# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

> Para estructura del proyecto, rutas, base de datos, stack, variables de entorno, seguridad, deploy y PWA → ver [README.md](./README.md).

## Convenciones y Buenas Prácticas

- Usar clases de **Tailwind CSS**, no CSS inline (excepto colores dinámicos de liga).
- Los componentes interactivos usan `"use client"`.
- Las rutas dinámicas (`[league]`) requieren `generateStaticParams()` en un Server Component wrapper.
- El cierre de pronósticos es a **1 minuto antes del inicio** (`diffMin <= 1`).
- Se permite **re-editar** pronósticos guardados mientras el partido esté abierto (`diffMin > 1`).
- Siempre usar `normalizeMatchLeague` y `normalizeTeamName` para asegurar correspondencia con plantillas y torneos.
- El selector de goleadores muestra la plantilla oficial completa (4.749 jugadores) y despliega el contador `[-] 1 [+]` únicamente al elegir un jugador (máx. 5 goleadores por equipo).
- `<Link>` genera rutas relativas automáticamente; `<img>` usa rutas absolutas desde la raíz (`/logos/...`).

### Política de Emojis (Jul 2025)

- **NO** se usan emojis informativos (🏆👑🎯✅⚠️📊🔍 etc.) en la UI.
- **SÍ** se permiten: emojis de acción (✕ ← →), emojis de premios (🎽 🩳 🧢 🚩 🍺 🕶️ 🖼️), e iconos decorativos en empty states dimmados (`text-silver/30`).
- La sección de premios en la landing presenta un Podio de Campeones con medallas de texto (1° Oro, 2° Plata, 3° Bronce) y chips visuales independientes para cada artículo del kit.

### Mecánica de Superviviente en Copas KO

- En Champions, Europa League, Conference League, Copa Italia, FA Cup, Copa del Rey y DFB-Pokal, el participante compite de forma independiente (`tournament_survivors`).
- Si predice y acierta la victoria del equipo rival, hereda su camiseta (`active_team_id`) manteniendo intacto su club base en ligas (`profiles.team_id`).

### Detección de Partidos KO (`isKnockoutMatch`)

- Copas domésticas siempre KO.
- Competiciones europeas (Champions/Europa/Conference): fase liga de sep a ene y rondas KO de feb a ago (por fecha, funciona con cruces TBD).

### Rondas Formato 2026/27 (`getKnockoutRound`)

| Mes | Ronda |
|-----|-------|
| Feb | Dieciseisavos de Final (playoff R32) |
| Mar | Octavos de Final |
| Abr | Cuartos de Final |
| Abr–May | Semifinal |
| May | Final |

- La ventana de pronósticos (`/pronosticar`) filtra partidos con equipos `TBD` (placeholders hasta que las fuentes publiquen los cruces reales).

---

## Operaciones y Troubleshooting

### Auth caído (nadie puede loguearse)

**Síntoma:** Endpoints `/auth/v1/*` se cuelgan (timeout) pero REST (`/rest/v1/*`) responde 200 y el proyecto figura `ACTIVE_HEALTHY`.

**Causa:** El servicio GoTrue quedó colgado (incidente conocido: *"401 errors due to JWT rejections"*, ago-2026).

**Solución:** Reiniciar el proyecto (NO tocar código):
```bash
curl -X POST "https://api.supabase.com/v1/projects/ilkndkqcmxvlufxaugog/restart" \
  -H "Authorization: Bearer <MANAGEMENT_API_TOKEN>"
```
El token `sbp_...` está en `~/.config/opencode/opencode.jsonc`. Verificar con `GET /auth/v1/health` (debe devolver 200 con `"version":"v2.x"`).

### Rebotes de email de Supabase

Las cuentas sin confirmar (`confirmed_at IS NULL` en `auth.users`) generan rebotes. Diagnosticar:
```sql
SELECT email, created_at FROM auth.users WHERE confirmed_at IS NULL;
```
Eliminar cuentas de testing/obsoletas con DELETE de `profiles` + `auth.users` (verificar dependencias primero). **NO** probar registros con emails inventados.

### Resultados no sincronizados (incidente ago-2026)

ESPN cambió su API y **rechaza listas de fechas separadas por coma** (`?dates=20260831,20260830,...` → HTTP 400). Solo acepta fecha única o **rango con guión** (`?dates=YYYYMMDD-YYYYMMDD`). El cron tiene **fail-fast**: si todas las ligas fallan, el run queda marcado como fallido.

Diagnosticar:
```bash
gh run list --workflow=auto-evaluate-matches.yml
# Revisar log de "Sync finished match results from ESPN"
curl "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20260828-20260831"
```

### Estado del proyecto (vía MCP)

`supabase_get_project` → `status: ACTIVE_HEALTHY`. La DB se puede consultar con `supabase_execute_sql` (service role implícito).
