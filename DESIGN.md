---
version: 1.0
name: Interliga
description: Concurso de pronósticos futboleros. Paleta oscura navy con acentos dorados.
colors:
  primary: "#080e1c"
  secondary: "#131d35"
  tertiary: "#1a2540"
  accent: "#c9a84c"
  accent-light: "#d4b45e"
  accent-dark: "#b8943f"
  neutral: "#ffffff"
  silver: "#8a9bb5"
  success: "#1ed760"
  border: "#1e2d4a"
typography:
  fontFamily: "DM Sans"
  h1:
    fontSize: 3.5rem
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  h2:
    fontSize: 2.25rem
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  h3:
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body-lg:
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: 4px
  md: 8px
  lg: 16px
  xl: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  2xl: 64px
  3xl: 96px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: 16px
  button-primary-hover:
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: 16px
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    border: "1px solid {colors.accent}"
    rounded: "{rounded.full}"
    padding: 14px
  card:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.lg}"
    padding: 24px
  card-landing:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.xl}"
    padding: "20px 28px"
  badge:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: 6px
  success-badge:
    backgroundColor: "{colors.success}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: 6px
---

## Overview

Interliga es un concurso de pronósticos futboleros para la temporada 2026-27. Fondo oscuro navy con acentos dorados que evocan trofeos y victoria. Identidad visual premium, energética y competitiva.

## Colors

- **Primary (#080e1c):** Azul muy oscuro, casi negro — fondo principal del sitio.
- **Secondary (#131d35):** Azul-gris profundo — fondos de cards y secciones.
- **Tertiary (#1a2540):** Azul oscuro — fondos de inputs y elementos internos.
- **Accent (#c9a84c):** Dorado — botones primarios, acentos, títulos destacados.
- **Accent Light (#d4b45e):** Dorado claro — hover de botones dorados.
- **Accent Dark (#b8943f):** Dorado oscuro — variante más saturada.
- **Silver (#8a9bb5):** Gris azulado — texto secundario, labels.
- **Border (#1e2d4a):** Borde sutil — separadores de cards y inputs.
- **Success (#1ed760):** Verde — feedback positivo, estados de éxito.

## Typography

DM Sans (Google Fonts) para todo el sitio. Jerarquía con pesos extremos (900 para headlines, 400 para cuerpo). Tracking negativo en titulares para impacto visual.

## Components

`button-primary` usa dorado sobre fondo oscuro, bordes redondeados completos (pill shape). El hover aclara el dorado. `button-secondary` es contorno-dorado para acciones secundarias. `card` usa el fondo secondary con bordes `rounded-xl sm:rounded-2xl`. `badge` en dorado para destacar información clave.

## League Colors

- **Premier League:** #3d195b (violeta)
- **LaLiga:** #ee8707 (naranja)
- **Serie A:** #024494 (azul)
- **Bundesliga:** #d20515 (rojo)
- **Champions League:** #1a4b8e (azul oscuro)
- **Europa League:** #f37920 (naranja)
- **Conference League:** #00843d (verde)
- **Copa Italia:** #024494 (azul)
