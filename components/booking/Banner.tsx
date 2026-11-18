import type { ReactNode } from "react";

const TONE = {
  amber: "border-star bg-[#FFF1D6] text-[#5A3700]",
  red: "border-[#E5484D] bg-[#FDE4E5] text-[#7A1519]",
  teal: "border-[#2DD4BF] bg-[#E6FBF7] text-[#0B5E52]",
  green: "border-f3 bg-f1 text-[#07522B]",
} as const;

const STROKE = { amber: "#7A4B00", red: "#B42328", teal: "#0B5E52", green: "#07522B" } as const;
const ICON_PATH = { alert: "M12 8v5M12 16.5v.01", info: "M12 16v-4M12 8v.01", clock: "M12 6v6l4 2", check: "m9 12 2 2 4-4" } as const;

type Props = {
  tone: keyof typeof TONE;
  children: ReactNode;
  role?: "alert" | "note" | "status";
  icon?: keyof typeof ICON_PATH | null;
  className?: string;
};

export default function Banner({ tone, children, role, icon = null, className = "" }: Props) {
  return (
    <div role={role} className={`flex items-start gap-3.5 rounded-[22px] border-[1.5px] px-5 py-4 text-[15px] font-semibold leading-[1.5] ${TONE[tone]} ${className}`}>
      {icon && (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={STROKE[tone]} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-px flex-none">
          <circle cx="12" cy="12" r="10" />
          <path d={ICON_PATH[icon]} />
        </svg>
      )}
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}
