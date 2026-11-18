import Link from "next/link";
import { ROUTES } from "@/lib/routes";

export default function CourtFooter() {
  return (
    <footer className="footer-s dark !rounded-t-[64px] !px-[clamp(20px,5vw,72px)] !pt-14">
      <div className="flex flex-wrap justify-between gap-5 text-[15px] text-white/80">
        <span>Jl. Sudirman No. 24 · Buka setiap hari 06.00–24.00 WIB</span>
        <nav aria-label="Tautan footer" className="flex flex-wrap gap-x-3">
          <Link href={ROUTES.login}>Masuk</Link>·<Link href={ROUTES.register}>Daftar</Link>·<Link href={ROUTES.forgot}>Lupa kata sandi</Link>
        </nav>
      </div>
      <div aria-hidden="true" className="wm">Gelanggang</div>
    </footer>
  );
}
