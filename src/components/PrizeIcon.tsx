"use client";

import {
  Beer,
  Cap,
  Flag,
  Footprints,
  Glasses,
  Image as ImageIcon,
  Shirt,
  type LucideIcon,
} from "lucide-react";

/**
 * Un único set de íconos (Lucide) para todos los premios: mismo grosor de trazo
 * (1.75) y mismo tamaño en todo el sitio. Los emojis anteriores cambiaban de
 * forma y color según el sistema operativo del visitante.
 */
const PRIZE_ICONS: Record<string, LucideIcon> = {
  shirt: Shirt,
  shorts: Footprints,
  cap: Cap,
  flag: Flag,
  mug: Beer,
  glasses: Glasses,
  poster: ImageIcon,
};

export default function PrizeIcon({
  name,
  className = "",
  size = 20,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  const Icon = PRIZE_ICONS[name] ?? Shirt;
  return (
    <Icon
      size={size}
      strokeWidth={1.75}
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    />
  );
}
