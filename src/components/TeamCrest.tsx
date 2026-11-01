"use client";

import { useState } from "react";

function initials(name: string): string {
  const words = (name || "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

type TeamCrestProps = {
  src?: string | null;
  name: string;
  /** Tailwind size classes applied to both the image and the fallback badge. */
  size?: string;
  /** Font size for the fallback initials. */
  textSize?: string;
  className?: string;
};

/**
 * Escudo de club con fallback: si el equipo no tiene logo (o la URL falla),
 * se muestra una insignia con las iniciales en vez de un hueco vacío.
 */
export default function TeamCrest({
  src,
  name,
  size = "w-10 h-10",
  textSize = "text-xs",
  className = "",
}: TeamCrestProps) {
  const [failed, setFailed] = useState(false);
  const base = `${size} rounded-full shrink-0`;

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={name}
        title={name}
        className={`${base} flex items-center justify-center bg-navy-mid border border-gold/40 text-gold font-black ${textSize} ${className}`}
      >
        {initials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      title={name}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`${base} object-contain bg-white p-0.5 shadow-sm ${className}`}
    />
  );
}
