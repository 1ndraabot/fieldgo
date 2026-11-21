import Link from 'next/link';
import type { ReactNode } from 'react';

const card = 'rounded-[28px] border-[1.5px] border-line bg-white';

/** Kartu tabel admin standar. Bila kosong diisi, tabel diganti pesan kosong. */
export function Tabel({ ariaLabel, head, children, kosong }: { ariaLabel: string; head: string[]; children?: ReactNode; kosong?: string }) {
  if (kosong) return <div className={`${card} px-6 py-10 text-center text-muted`}>{kosong}</div>;
  return (
    <div className={`${card} overflow-x-auto`}>
      <table aria-label={ariaLabel} className="w-full min-w-[720px] text-left text-[15px]">
        <thead>
          <tr className="border-b border-line bg-mist text-[12px] uppercase tracking-wider text-muted">
            {head.map((h, i) => <th key={h} className={`px-5 py-3.5 font-bold ${i === head.length - 1 ? 'text-right' : ''}`}>{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, kanan = false, strong = false }: { children: ReactNode; kanan?: boolean; strong?: boolean }) {
  return <td className={`px-5 py-4 align-middle ${kanan ? 'text-right' : ''} ${strong ? 'font-semibold' : ''}`}>{children}</td>;
}

/** Pemilih lapangan berupa pil tautan (?lapangan=id). */
export function PilihLapangan({ daftar, aktifId, basis }: { daftar: { id: number; nama: string }[]; aktifId: number; basis: string }) {
  return (
    <nav aria-label="Pilih lapangan" className="flex flex-wrap gap-2.5">
      {daftar.map((l) => {
        const on = l.id === aktifId;
        return (
          <Link key={l.id} href={`${basis}?lapangan=${l.id}`} aria-current={on ? 'true' : undefined}
            className={`flex h-11 items-center rounded-full border-[1.5px] px-5 text-[14px] font-bold no-underline ${on ? 'border-ink bg-ink text-white' : 'border-line bg-mist text-ink'}`}>
            {l.nama}
          </Link>
        );
      })}
    </nav>
  );
}

/** Pil tautan generik untuk filter (?k=v). */
export function PilFilter({ daftar, aktif, basis, namaParam }: {
  daftar: { nilai: string; label: string }[]; aktif: string; basis: string; namaParam: string;
}) {
  return (
    <nav aria-label="Filter" className="flex flex-wrap gap-2.5">
      {daftar.map((f) => {
        const on = f.nilai === aktif;
        const q = f.nilai === 'semua' ? '' : `?${namaParam}=${f.nilai}`;
        return (
          <Link key={f.nilai} href={`${basis}${q}`} aria-current={on ? 'true' : undefined}
            className={`flex h-11 items-center rounded-full border-[1.5px] px-5 text-[14px] font-bold no-underline ${on ? 'border-ink bg-ink text-white' : 'border-line bg-mist text-ink'}`}>
            {f.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Tombol tampilan (backend menyusul). */
export function TombolAksi({ children, utama = false, label }: { children: ReactNode; utama?: boolean; label?: string }) {
  return (
    <button type="button" aria-label={label} title={label ?? 'Aksi tersambung saat backend siap'}
      className={`btn inline-flex h-10 cursor-pointer items-center rounded-full border-[1.5px] px-4 text-[13px] font-bold ${utama ? 'border-transparent bg-brand text-white' : 'border-ink bg-white text-ink'}`}>
      {children}
    </button>
  );
}

/** Catatan kecil di bawah tabel. */
export function Catatan({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-[13px] leading-relaxed text-muted">{children}</p>;
}
