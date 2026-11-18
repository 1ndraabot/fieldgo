import Link from "next/link";
import { fmtRupiah } from "@/lib/data";
import { rangeLabel } from "@/lib/datetime";
import type { AuthStatus } from "@/lib/auth";

export type SummaryLine = { hour: number; price: number };

type Props = {
  courtName: string;
  dateLabel: string;
  lines: SummaryLine[];
  total: number;
  deadline: string | null;
  auth: AuthStatus;
  loginHref: string;
  onLoginClick: () => void;
  onConfirm: () => void;
};

const BTN = "btn mt-[18px] flex h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border-[1.5px] border-transparent bg-f5 px-7 text-base font-bold text-white";

/** Ringkasan pesanan (kolom kanan, sticky di desktop). */
export default function OrderSummary({ courtName, dateLabel, lines, total, deadline, auth, loginHref, onLoginClick, onConfirm }: Props) {
  const has = lines.length > 0;
  return (
    <aside
      aria-label="Ringkasan"
      className="box-border w-full flex-[1_1_380px] rounded-[32px] border-[1.5px] border-line bg-white p-7 shadow-[0_18px_40px_rgba(8,44,28,.08)] min-[981px]:sticky min-[981px]:top-6 min-[981px]:max-w-[460px]"
    >
      <span className="inline-flex h-[30px] items-center rounded-full bg-f1 px-3.5 text-[13px] font-bold text-f6">Ringkasan pesanan</span>
      <h2 className="mt-3.5 font-display text-[clamp(24px,2.6vw,32px)] font-bold leading-[1.2] tracking-[-0.03em]">{courtName}</h2>
      <div className="mt-1.5 text-[15px] font-semibold text-muted">{dateLabel}</div>

      {has ? (
        <>
          <div className="mt-[18px] flex flex-col gap-2.5 rounded-[28px] border-[1.5px] border-line bg-f0 p-6 text-[15px]">
            {lines.map((l) => (
              <div key={l.hour} className="flex justify-between">
                <span className="font-medium text-muted">{rangeLabel(l.hour, l.hour + 1)}</span>
                <b>{fmtRupiah(l.price)}</b>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-line pt-3">
              <b>Total · {lines.length} jam</b>
              <span className="font-display text-2xl font-bold text-f5" aria-live="polite">{fmtRupiah(total)}</span>
            </div>
          </div>
          <div className="mt-3.5 text-sm leading-[1.55] text-muted">
            Batas bayar: <b className="text-f9">{deadline}</b>. Harga dikunci saat pesanan dibuat.
          </div>
        </>
      ) : (
        <div className="mt-[18px] flex flex-col items-center gap-3 rounded-[28px] border-[1.5px] border-dashed border-[#86E3AE] bg-f0 px-4 py-7 text-center">
          <span className="font-semibold text-muted">Pilih satu atau beberapa jam berurutan pada kalender.</span>
        </div>
      )}

      {auth === "guest" && (
        <Link href={loginHref} onClick={onLoginClick} className={BTN}>Masuk untuk memesan</Link>
      )}
      {auth === "verified" && (
        <button type="button" className={BTN} disabled={!has} onClick={onConfirm}>Lanjut ke konfirmasi</button>
      )}
      {auth === "unverified" && (
        <button type="button" className={BTN} disabled>Verifikasi email dulu</button>
      )}
    </aside>
  );
}
