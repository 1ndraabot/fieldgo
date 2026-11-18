import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { ArrowRightIcon } from "@/components/ui/Icons";
import { ROUTES } from "@/lib/routes";
import NewsletterForm from "./NewsletterForm";

const COLUMNS = [
  {
    title: "Lapangan",
    links: [
      { label: "Futsal", href: ROUTES.home },
      { label: "Badminton", href: ROUTES.home },
      { label: "Basket & Tenis", href: ROUTES.home },
    ],
  },
  {
    title: "Akun",
    links: [
      { label: "Masuk", href: ROUTES.login },
      { label: "Daftar", href: ROUTES.register },
      { label: "Lupa kata sandi", href: ROUTES.forgot },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="dark relative -mt-px overflow-hidden rounded-t-[64px] bg-f9 px-[clamp(20px,5vw,72px)] pt-20 text-white">
      <div className="flex flex-wrap justify-between gap-12">
        <div className="max-w-[360px] flex-[1_1_280px]">
          <Logo />
          <p className="mt-[18px] text-[15px] leading-[1.6] text-white/75">
            Jl. Sudirman No. 24
            <br />
            Buka setiap hari 06.00–24.00 WIB
          </p>
        </div>

        <nav aria-label="Tautan footer" className="flex flex-wrap gap-x-[72px] gap-y-12">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="mb-4 font-display text-base font-bold">{col.title}</div>
              <div className="flex flex-col gap-3 text-[15px] text-white/75">
                {col.links.map((l) => (
                  <Link key={l.label} href={l.href}>{l.label}</Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <NewsletterForm icon={<ArrowRightIcon size={20} stroke="#0B2B1E" strokeWidth={2.4} />} />
      </div>

      <div aria-hidden="true" className="wm !mt-[72px]">Gelanggang</div>
    </footer>
  );
}
