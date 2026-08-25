---
version: alpha
name: Interliga
description: Pasión futbolera con energía competitiva. Paleta oscura con acentos vibrantes que evocan la emoción del estadio.
colors:
  primary: "#0A0E1A"
  secondary: "#1A2332"
  tertiary: "#C62828"
  accent: "#F4A261"
  neutral: "#F1FAEE"
  success: "#2A9D8F"
typography:
  h1:
    fontFamily: Inter
    fontSize: 3.5rem
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  h2:
    fontFamily: Inter
    fontSize: 2.25rem
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  h3:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: Inter
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
    backgroundColor: "{colors.tertiary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: 16px
  button-primary-hover:
    backgroundColor: "#B71C1C"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    padding: 16px
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.neutral}"
    rounded: "{rounded.full}"
    padding: 14px
  card:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.lg}"
    padding: 24px
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

Interliga es un concurso de pronósticos futboleros para la temporada 2026-27. El diseño captura la emoción del estadio: fondo oscuro que evoca las gradas bajo las luces nocturnas, con acentos rojos y dorados que transmiten pasión y victoria. La identidad visual debe sentirse premium, energética y competitiva.

## Colors

- **Primary (#0A0E1A):** Azul muy oscuro, casi negro — evoca la atmósfera nocturna de un estadio bajo focos.
- **Secondary (#1A2332):** Azul-gris profundo — fondos de secciones alternas, paneles de contenido.
- **Tertiary (#C62828):** Rojo intenso — color de acción principal. Botones, CTAs, acentos de urgencia.
- **Accent (#F4A261):** Dorado cálido — premios, logros, elementos dedestacados. Evoca trofeos y victoria.
- **Neutral (#F1FAEE):** Blanco roto — texto principal, contraste sobre fondos oscuros.
- **Success (#2A9D8F):** Verde-teal — feedback positivo, aciertos en pronósticos.

## Typography

Inter (Google Fonts) para todo el sitio. Jerarquía agresiva con pesos extremos (900 para headlines, 400 para cuerpo). Tracking negativo en titulares para impacto visual.

## Components

`button-primary` es la acción de alto énfasis — rojo vibrante sobre fondo oscuro, bordes redondeados completos (pill shape). El hover oscurece ligeramente. `button-secondary` es contorno-transparente para acciones secundarias. `card` usa el fondo secondary con bordes redondeados generosos. `badge` en dorado para destacar información clave como premios y posiciones.
