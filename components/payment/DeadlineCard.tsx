import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { deadlineLong, formatHMS } from "@/lib/payment-format";
import type { PaymentStatus } from "./status";

type Props = { status: PaymentStatus; deadlineMs: number; remaining: number; courtId: string };

const WRAP = "flex flex-wrap items-center justify-between gap-5 rounded-[36px] border-[1.5px] px-8 py-7";
const TIMER = "font-display text-[clamp(40px,5.4vw,64px)] font-extrabold tracking-[-0.04em] [font-variant-numeric:tabular-nums]";

/** Kartu batas bayar + hitung mundur; berubah mengikuti status pesanan. */
export default function DeadlineCard({ status, deadlineMs, remaining, courtId }: Props) {
  if (status === "menunggu_pembayaran") {
    return (
      <div className={`${WRAP} border-star bg-[#FFF1D6]`}>
        <div>
          <div className="text-sm font-bold text-[#7A4B00]">Batas bayar</div>
          <div className="mt-1 text-lg font-bold">{deadlineLong(deadlineMs)}</div>
        </div>
        <div role="timer" aria-label="Sisa waktu pembayaran" className={TIMER}>{formatHMS(remaining)}</div>
      </div>
    );
  }
  if (status === "menunggu_verifikasi") {
    return (
      <div className={`${WRAP} border-f4 bg-f1`}>
        <div>
          <div className="text-sm font-bold text-f6">Hitungan berhenti</div>
          <div className="mt-1 text-lg font-bold">Bukti terkirim, menunggu verifikasi pengelola</div>
          <div className="mt-1 text-sm font-medium text-muted">Batas bayar tidak berlaku lagi setelah bukti diunggah.</div>
        </div>
        <div role="timer" aria-label="Sisa waktu saat bukti dikirim (dihentikan)" className={`${TIMER} text-f9/40`}>{formatHMS(remaining)}</div>
      </div>
    );
  }
  if (status === "dibatalkan") {
    return (
      <div className={`${WRAP} border-[#C9D6CE] bg-[#E3EAE6]`}>
        <div>
          <div className="text-sm font-bold text-[#3F5247]">Pesanan dibatalkan</div>
          <div className="mt-1 text-lg font-bold">Pesanan ini sudah dibatalkan dan slotnya dibuka kembali.</div>
          <div className="mt-1 text-sm font-medium text-muted">Pembayaran dan unggah bukti tidak tersedia lagi.</div>
        </div>
        <div aria-hidden="true" className={`${TIMER} text-f9/30`}>--:--:--</div>
      </div>
    );
  }
  return (
    <div className={`${WRAP} border-[#E5484D] bg-[#FDE4E5]`}>
      <div>
        <div className="text-sm font-bold text-[#B42328]">Waktu pembayaran habis</div>
        <div className="mt-1 text-lg font-bold">Pesanan kedaluwarsa dan slot dilepas.</div>
        <Link href={ROUTES.court(courtId)} className="mt-1 inline-block text-sm font-bold text-[#7A1519] underline underline-offset-4">Pesan ulang lapangan ini</Link>
      </div>
      <div role="timer" aria-label="Sisa waktu pembayaran" className={`${TIMER} text-[#B42328]`}>00:00:00</div>
    </div>
  );
}
