import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { DEFAULT_COURT_ID, ROUTES } from "@/lib/routes";

const NAV = [
  { label: "Lapangan", href: ROUTES.home },
  { label: "Kalender", href: ROUTES.court(DEFAULT_COURT_ID) },
  { label: "Jadwal saya", href: ROUTES.mySchedule },
  { label: "Riwayat", href: ROUTES.history },
];

export default function Header({ user, active = "Lapangan" }: { user?: { name: string } | null; active?: string }) {
  return (
    <header className="relative z-10 flex items-center justify-between gap-4 bg-white px-[clamp(16px,4.5vw,64px)] py-5">
      <Logo />
      <nav
        aria-label="Menu utama"
        className="hide-m flex gap-1 rounded-full border border-line bg-f0 p-1.5"
      >
        {NAV.map((n) => (
          <Link
            key={n.label}
            href={n.href}
            aria-current={n.label === active ? "page" : undefined}
            className={`rounded-full px-[22px] py-2.5 text-[15px] font-semibold ${
              n.label === active ? "bg-f9 text-white" : ""
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
      {user ? (
        <div className="flex items-center gap-2.5">
          <span className="hide-m flex items-center gap-2.5 text-[15px] font-bold">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-lime font-display text-sm font-bold">
              {user.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")}
            </span>
            {user.name}
          </span>
          <form method="post" action="/api/auth/logout">
            <button type="submit" className="btn cursor-pointer rounded-full border-[1.5px] border-f9 px-5 py-[11px] text-sm font-bold">
              Keluar
            </button>
          </form>
        </div>
      ) : (
        <div className="flex gap-2.5">
          <Link href={ROUTES.login} className="btn rounded-full border-[1.5px] border-f9 px-6 py-[13px] text-[15px] font-bold">
            Masuk
          </Link>
          <Link href={ROUTES.register} className="btn rounded-full bg-f5 px-6 py-[13px] text-[15px] font-bold text-white">
            Daftar
          </Link>
        </div>
      )}
    </header>
  );
}
