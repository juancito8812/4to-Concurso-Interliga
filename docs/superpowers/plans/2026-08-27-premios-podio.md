# Premios Podio Champions League Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la sección de Premios en `src/app/page.tsx` para presentar un Podio de Campeones jerárquico (Oro 🥇, Plata 🥈, Bronce 🥉), con elevación central para el 1er lugar, halos de luz metálicos y chips visuales independientes para cada artículo de recompensa.

**Architecture:** Actualizar la estructura de datos `prizes` en `src/app/page.tsx` para incluir metadatos de iconos, subtítulos y temas de color metálico (gold, silver, bronze). Reemplazar la grilla plana de 3 tarjetas por un podio responsivo con estilos Tailwind CSS v4, badges de relieve y listas de premios con chips temáticos.

**Tech Stack:** Next.js 16 (React 19), Tailwind CSS v4, TypeScript 5.

## Global Constraints

- Seguir estrictamente la paleta de colores del proyecto: `navy-black`, `navy-mid`, `navy-card`, `gold`, `silver`, `border`.
- No agregar dependencias de paquetes externas; utilizar clases nativas y símbolos Unicode estilizados.
- Mantener la compatibilidad con exportación estática (`output: "export"`).
- Garantizar diseño 100% responsivo en móviles (`grid-cols-1 md:grid-cols-3`).

---

### Task 1: Actualizar estructura de datos y componente de Podio de Premios en `src/app/page.tsx`

**Files:**
- Modify: `src/app/page.tsx:30-48` and `src/app/page.tsx:176-220`

**Interfaces:**
- Consumes: Tipos de premios con iconos y temas metálicos (`gold`, `silver`, `bronze`).
- Produces: Sección de premios visual con podio elevado y chips temáticos.

- [ ] **Step 1: Definir estructura enriquecida de premios en `src/app/page.tsx`**

```typescript
interface PrizeItem {
  icon: string;
  name: string;
}

interface PodiumPrize {
  rank: 1 | 2 | 3;
  placeTitle: string;
  badgeTitle: string;
  badgeIcon: string;
  theme: "gold" | "silver" | "bronze";
  cardBorder: string;
  cardGlow: string;
  badgeBg: string;
  textColor: string;
  orderClass: string;
  items: PrizeItem[];
}

const podiumPrizes: PodiumPrize[] = [
  {
    rank: 2,
    placeTitle: "2° LUGAR",
    badgeTitle: "SUBCAMPEÓN",
    badgeIcon: "🥈",
    theme: "silver",
    cardBorder: "border-slate-400/50 hover:border-slate-300",
    cardGlow: "shadow-[0_0_30px_rgba(203,213,225,0.12)]",
    badgeBg: "bg-gradient-to-r from-slate-300 via-gray-200 to-slate-400 text-navy-black",
    textColor: "text-slate-200",
    orderClass: "order-2 md:order-1 md:mt-6",
    items: [
      { icon: "🎽", name: "Camiseta Oficial del Club" },
      { icon: "🩳", name: "Short Oficial de Juego" },
      { icon: "🧢", name: "Gorra Oficial del Club" },
      { icon: "🚩", name: "Bandera Oficial del Club" },
      { icon: "🍺", name: "Jarra Oficial de Colección" },
      { icon: "🕶️", name: "Gafas de Sol Deportivas" },
      { icon: "🖼️", name: "Póster de Campeones" },
    ],
  },
  {
    rank: 1,
    placeTitle: "1° LUGAR",
    badgeTitle: "GRAN CAMPEÓN",
    badgeIcon: "👑",
    theme: "gold",
    cardBorder: "border-2 border-gold shadow-[0_0_40px_rgba(201,168,76,0.25)] hover:border-gold-light",
    cardGlow: "shadow-[0_0_50px_rgba(201,168,76,0.25)]",
    badgeBg: "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-navy-black",
    textColor: "text-gold",
    orderClass: "order-1 md:order-2 md:-translate-y-4 md:mb-4 z-10",
    items: [
      { icon: "🎽", name: "Camiseta Oficial del Club" },
      { icon: "🩳", name: "Short Oficial de Juego" },
      { icon: "⚽", name: "Balón Oficial de Fútbol" },
      { icon: "🍺", name: "Jarra Oficial de Colección" },
      { icon: "🚩", name: "Bandera Oficial del Club" },
      { icon: "🕶️", name: "Gafas de Sol Deportivas" },
      { icon: "📖", name: "Revista / Anuario Exclusivo" },
    ],
  },
  {
    rank: 3,
    placeTitle: "3° LUGAR",
    badgeTitle: "TERCER LUGAR",
    badgeIcon: "🥉",
    theme: "bronze",
    cardBorder: "border-amber-700/50 hover:border-amber-600",
    cardGlow: "shadow-[0_0_30px_rgba(180,83,9,0.12)]",
    badgeBg: "bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 text-white",
    textColor: "text-amber-400",
    orderClass: "order-3 md:order-3 md:mt-8",
    items: [
      { icon: "🎽", name: "Camiseta Oficial del Club" },
      { icon: "🩳", name: "Short Oficial de Juego" },
      { icon: "🧢", name: "Gorra Oficial del Club" },
      { icon: "🚩", name: "Bandera Oficial del Club" },
      { icon: "🍺", name: "Jarra Oficial de Colección" },
    ],
  },
];
```

- [ ] **Step 2: Reemplazar el renderizado de la sección de Premios con tarjetas de Podio y chips temáticos**

```tsx
      {/* PREMIOS - PODIO ESTILO CHAMPIONS LEAGUE */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-14">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gold flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(201,168,76,0.4)]">
                <span className="text-xs sm:text-sm font-black text-navy-black">3</span>
              </div>
              <div>
                <h2 className="text-xl sm:text-3xl font-black uppercase tracking-wider text-gold">
                  Premios Oficiales
                </h2>
                <p className="text-xs sm:text-sm text-silver font-medium mt-0.5">
                  Temporada 2026-27 · Kits oficiales para los mejores pronosticadores
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-navy-card/80 border border-border text-xs font-semibold text-silver">
              <span>🏆</span> 3 Podios Exclusivos
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-6 items-end mt-4">
            {podiumPrizes.map((prize) => (
              <div
                key={prize.rank}
                className={`relative flex flex-col bg-navy-mid/90 backdrop-blur-sm rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:scale-[1.02] ${prize.cardBorder} ${prize.cardGlow} ${prize.orderClass}`}
              >
                {/* Crown/Trophy Top Ribbon for 1st Place */}
                {prize.rank === 1 && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 via-gold to-amber-500 text-navy-black font-black text-[11px] uppercase tracking-widest px-4 py-1 rounded-full shadow-lg flex items-center gap-1.5 shrink-0 select-none">
                    <span>👑</span> MÁXIMO GALARDÓN
                  </div>
                )}

                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2 mb-4 pt-1">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-black text-lg sm:text-xl shadow-md ${prize.badgeBg}`}>
                      {prize.badgeIcon}
                    </div>
                    <div>
                      <h3 className={`text-base sm:text-lg font-black uppercase tracking-wider ${prize.textColor}`}>
                        {prize.placeTitle}
                      </h3>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-silver">
                        {prize.badgeTitle}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-silver/80 bg-navy-card/80 border border-border/60 px-2.5 py-1 rounded-lg">
                      {prize.items.length} premios
                    </span>
                  </div>
                </div>

                {/* Prize Items Chips Grid */}
                <div className="space-y-2 my-2 flex-1">
                  {prize.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-navy-card/50 border border-border/40 hover:bg-navy-card/90 transition-colors"
                    >
                      <span className="text-base select-none shrink-0">{item.icon}</span>
                      <span className="text-xs sm:text-sm font-semibold text-white/90">
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer Tag */}
                <div className="mt-4 pt-3 border-t border-border/40 text-center">
                  <span className="text-[11px] font-semibold text-silver/60 uppercase tracking-wider">
                    {prize.rank === 1 ? "Kit Completo de Campeón" : prize.rank === 2 ? "Kit de Subcampeón" : "Kit de Podio"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
```

- [ ] **Step 3: Ejecutar build de verificación**

```bash
npm run build
```
Expected: `✓ Compiled successfully` with 0 errors.

- [ ] **Step 4: Commit de la sección de premios renovada**

```bash
git add src/app/page.tsx
git commit -m "feat(landing): rediseñar seccion de premios con podio estilo champions league y chips tematicos"
```

---

### Task 2: Actualizar la documentación del proyecto

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Documentar el nuevo diseño de podio de premios en los `.md`**
- [ ] **Step 2: Commit y push a GitHub**

```bash
git add README.md AGENTS.md CLAUDE.md
git commit -m "docs: actualizar documentacion con podio de premios renovado"
git push origin main
```
