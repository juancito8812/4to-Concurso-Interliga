# Especificación de Diseño: Sección de Premios en Podio Estilo Champions League

**Fecha:** 2026-08-27  
**Estado:** Aprobado  
**Objetivo:** Rediseñar la sección de premios en la landing page (`src/app/page.tsx`) con una estructura visual de Podio jerárquico (Oro 🥇, Plata 🥈, Bronce 🥉), medallas metálicas distintivas y chips visuales detallados para cada artículo premiado.

---

## 1. Contexto y Objetivos

- **Problema actual:** Los premios se mostraban en tarjetas uniformes con listas de texto plano, sin jerarquía cromática (todas usaban el mismo badge dorado) y con poca diferenciación visual entre el 1er, 2do y 3er puesto.
- **Solución:** Implementar un Podio de Campeones con:
  1. Jerarquía de metales reales: **Oro (1er lugar)**, **Plata (2do lugar)** y **Bronce (3er lugar)**.
  2. 1er puesto central elevado con efecto de brillo radiante dorado y corona 👑.
  3. Desglose visual de cada artículo con iconos temáticos y chips estilizados (Camiseta 🎽, Balón ⚽, Gorra 🧢, Jarra 🍺, etc.).
  4. Diseño completamente responsivo: podio ordenado en desktop (`[2°, 1°, 3°]`) y orden natural en móviles (`[1°, 2°, 3°]`).

---

## 2. Arquitectura Visual y Componentes

### 2.1 Podio y Jerarquía de Puestos

| Puesto | Acabado Metálico | Distintivo | Elevación | Borde & Brillo |
|---|---|---|---|---|
| **1er Lugar** | Oro brillante (`amber-300` a `yellow-500`) | 👑 🏆 **GRAN CAMPEÓN** | Elevado en desktop (`md:-translate-y-4`) | Borde dorado intenso `border-2 border-gold` + `shadow-[0_0_50px_rgba(201,168,76,0.25)]` |
| **2do Lugar** | Plata brillante (`slate-200` a `gray-400`) | 🥈 **SUBCAMPEÓN** | Base estándar | Borde plateado `border border-slate-400/50` + `shadow-[0_0_30px_rgba(203,213,225,0.1)]` |
| **3er Lugar** | Bronce cálido (`amber-700` a `orange-800`) | 🥉 **TERCER LUGAR** | Base estándar | Borde bronce `border border-amber-700/50` + `shadow-[0_0_30px_rgba(180,83,9,0.1)]` |

### 2.2 Desglose de Artículos por Puesto

```typescript
export interface PrizeItem {
  icon: string;
  name: string;
  category?: string;
}

export interface PodiumPrize {
  rank: 1 | 2 | 3;
  placeTitle: string;
  subtitle: string;
  badge: string;
  theme: "gold" | "silver" | "bronze";
  items: PrizeItem[];
}
```

#### Artículos Definidos:
- **1er Lugar (7 artículos de élite):**
  - 🎽 Camiseta Oficial del Club
  - 🩳 Short Oficial de Juego
  - ⚽ Balón Oficial de Fútbol
  - 🍺 Jarra Oficial de Colección
  - 🚩 Bandera Oficial del Club
  - 🕶️ Gafas de Sol Deportivas
  - 📖 Revista / Anuario Exclusivo

- **2do Lugar (7 artículos):**
  - 🎽 Camiseta Oficial del Club
  - 🩳 Short Oficial de Juego
  - 🧢 Gorra Oficial del Club
  - 🚩 Bandera Oficial
  - 🍺 Jarra Oficial
  - 🕶️ Gafas de Sol Deportivas
  - 🖼️ Póster Exclusivo de Campeones

- **3er Lugar (5 artículos):**
  - 🎽 Camiseta Oficial del Club
  - 🩳 Short Oficial de Juego
  - 🧢 Gorra Oficial del Club
  - 🚩 Bandera Oficial
  - 🍺 Jarra Oficial

---

## 3. Implementación Técnica

- **Archivo objetivo:** `src/app/page.tsx`
- **Componentes auxiliares:** Reutilizar paleta navy y Tailwind CSS v4 existente.
- **Accesibilidad y Rendimiento:** Cero dependencias externas; uso de iconos Unicode enriquecidos y clases semánticas de Tailwind.
- **Efectos:** Transiciones suaves en hover (`transition-all duration-300 hover:scale-[1.02]`).

---

## 4. Criterios de Aceptación y Verificación

1. El podio muestra claramente las medallas Oro 🥇, Plata 🥈 y Bronce 🥉 con sus respectivos colores y halos.
2. El 1er lugar destaca como el punto focal central del podio.
3. Cada artículo tiene su chip independiente con icono y nombre visible y legible.
4. La vista en móviles se adapta fluidamente sin desbordamientos horizontales.
5. `npm run build` compila con 0 errores.
