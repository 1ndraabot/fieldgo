import type { CourtKind } from "@/lib/data";

type Props = {
  kind: CourtKind;
  color?: string;
  label?: string;
  className?: string;
};

/** Garis lapangan (viewBox 416×300) — dipakai di hero, panel gelap, dan kartu lapangan. */
export default function CourtIllustration({ kind, color = "#fff", label, className }: Props) {
  return (
    <svg
      viewBox="0 0 416 300"
      preserveAspectRatio="none"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className ?? "absolute inset-0 h-full w-full"}
      style={{ color }}
      fill="none" stroke="currentColor" strokeWidth={3}
    >
      <rect x="30" y="30" width="356" height="240" rx="8" />
      {kind === "futsal" && (
        <>
          <path d="M208 30v240" />
          <circle cx="208" cy="150" r="54" />
          <circle cx="208" cy="150" r="4" fill="currentColor" />
          <rect x="30" y="90" width="57" height="120" />
          <rect x="329" y="90" width="57" height="120" />
        </>
      )}
      {kind === "badminton" && (
        <>
          <path d="M208 30v240" strokeWidth={6} />
          <path d="M158 30v240M258 30v240M30 150h128M258 150h128M30 57h356M30 243h356" />
        </>
      )}
      {kind === "basket" && (
        <>
          <path d="M208 30v240" />
          <circle cx="208" cy="150" r="45" />
          <rect x="30" y="96" width="72" height="108" />
          <rect x="314" y="96" width="72" height="108" />
          <circle cx="102" cy="150" r="27" />
          <circle cx="314" cy="150" r="27" />
        </>
      )}
      {kind === "tenis" && (
        <>
          <path d="M208 30v240" strokeWidth={6} />
          <path d="M30 60h356M30 240h356M136 60v180M280 60v180M136 150h144" />
        </>
      )}
    </svg>
  );
}

export const STRIPE_DARK = "repeating-linear-gradient(90deg,transparent 0 10%,rgba(255,255,255,.09) 10% 20%)";
export const STRIPE_LIGHT = "repeating-linear-gradient(90deg,transparent 0 10%,rgba(11,43,30,.07) 10% 20%)";
