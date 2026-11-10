import type { ReactNode } from 'react';

const PATHS = {
  ball: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2c3.5 3.2 3.5 16.8 0 20M12 2c-3.5 3.2-3.5 16.8 0 20" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  arrow: <path d="M7 17 17 7M7 7h10v10" />,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>,
  card: <><rect x="2" y="6" width="20" height="14" rx="3" /><path d="M2 10h20M16 15h2" /></>,
  cancel: <><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></>,
  spark: <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />,
  kanan: <path d="M5 12h14M13 6l6 6-6 6" />,
  upload: <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8v.01" /></>,
  alert: <><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16.5v.01" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  mail: <><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m22 7-10 6L2 7" /></>,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, stroke = 'currentColor', width = 2.2 }: { name: IconName; size?: number; stroke?: string; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
