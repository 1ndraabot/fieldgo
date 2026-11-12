import type { ReactNode } from "react";

type IconProps = {
  size?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  className?: string;
};

function Base({
  size = 24, stroke = "currentColor", strokeWidth = 2, fill = "none", className, children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" className={className}
    >
      {children}
    </svg>
  );
}

export const BallIcon = (p: IconProps) => (
  <Base {...p}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2c3.5 3.2 3.5 16.8 0 20M12 2c-3.5 3.2-3.5 16.8 0 20" /></Base>
);
export const BallHalfIcon = (p: IconProps) => (
  <Base {...p}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /></Base>
);
export const ShuttleIcon = (p: IconProps) => (
  <Base {...p}><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" /></Base>
);
export const CalendarIcon = (p: IconProps) => (
  <Base {...p}><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></Base>
);
export const ClockIcon = (p: IconProps) => (
  <Base {...p}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></Base>
);
export const SearchIcon = (p: IconProps) => (
  <Base {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Base>
);
export const ArrowUpRightIcon = (p: IconProps) => (
  <Base {...p}><path d="M7 17 17 7M7 7h10v10" /></Base>
);
export const ArrowRightIcon = (p: IconProps) => (
  <Base {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Base>
);
export const StarIcon = (p: IconProps) => (
  <Base {...p}><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" /></Base>
);
export const PinIcon = (p: IconProps) => (
  <Base {...p}><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></Base>
);
export const CheckIcon = (p: IconProps) => (
  <Base {...p}><path d="M20 6 9 17l-5-5" /></Base>
);
export const ShieldCheckIcon = (p: IconProps) => (
  <Base {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></Base>
);
export const CardIcon = (p: IconProps) => (
  <Base {...p}><rect x="2" y="6" width="20" height="14" rx="3" /><path d="M2 10h20M16 15h2" /></Base>
);
export const XCircleIcon = (p: IconProps) => (
  <Base {...p}><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></Base>
);
