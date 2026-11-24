'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Banner } from '@/components/auth/ui';
import { Icon } from '@/components/icons';
import { QrBayar } from '@/components/pembayaran/QrBayar';
import { SalinNomor } from '@/components/pembayaran/SalinNomor';
import type { KanalBayar } from '@/lib/gateway/kanal';
import type { TransaksiRingkas } from '@/lib/gateway/data';
import type { InstruksiPembayaran } from '@/lib/gateway/types';

const GRUP_LABEL: Record<string, string> = {
  qris: 'Pindai QR',
  va: 'Transfer bank (Virtual Account)',
  ewallet: 'E-Wallet',
};

const GRUP_URUT = ['qris', 'va', 'ewallet'] as const;

/** Jam WIB "HH.MM" untuk "berlaku sampai". */
const jamWib = (d: Date): string => {
  const wib = new Date(d.getTime() + 7 * 3600_000);
  return `${String(wib.getUTCHours()).padStart(2, '0')}.${String(wib.getUTCMinutes()).padStart(2, '0')} WIB`;
};

type Instruksi = InstruksiPembayaran;

function InstruksiPanel({ instruksi, modeSimulasi, redirectUrl }: {
  instruksi: Instruksi;
  modeSimulasi: boolean;
  redirectUrl: string | null;
}) {
  const berlaku = `Berlaku sampai ${jamWib(instruksi.kedaluwarsaPada)}`;
  if (instruksi.jenis === 'qr') {
    return (
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <QrBayar nilai={instruksi.nilai} />
        <div className="flex flex-col gap-2">
          <div className="text-sm font-semibold text-white/80">Pindai kode QR ini</div>
          <p className="m-0 max-w-[420px] text-[15px] leading-relaxed text-white/75">
            Buka aplikasi pembayaran (GoPay, DANA, ShopeePay, m-banking) lalu pindai QR di samping.
            {berlaku}.
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <code className="max-w-full truncate rounded-lg bg-white/10 px-3 py-2 text-[12px] text-white/85">{instruksi.nilai}</code>
            <SalinNomor nilai={instruksi.nilai} label="Salin string QR" />
          </div>
        </div>
      </div>
    );
  }
  if (instruksi.jenis === 'va') {
    return (
      <div className="flex flex-col gap-3">
        <div className="text-sm font-semibold text-white/80">Transfer ke {instruksi.bank} Virtual Account</div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-display text-[clamp(26px,4vw,40px)] font-extrabold tracking-[0.02em]">{instruksi.nomor}</span>
          <SalinNomor nilai={instruksi.nomor} label="Salin nomor VA" />
        </div>
        <p className="m-0 max-w-[520px] text-[15px] leading-relaxed text-white/75">
          Transfer dengan nominal yang sama persis lewat ATM, m-banking, atau internet banking. {berlaku}.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm font-semibold text-white/80">Selesaikan di aplikasi e-wallet</div>
      <a href={instruksi.url}
        className="btn flex h-14 w-fit items-center gap-3 rounded-full bg-lime py-0 pl-7 pr-2.5 text-base font-bold text-ink no-underline">
        Buka aplikasi & bayar
        <span className="flex size-9 items-center justify-center rounded-full bg-ink"><Icon name="arrow" size={18} stroke="#C6F432" width={2.4} /></span>
      </a>
      <p className="m-0 max-w-[520px] text-[15px] leading-relaxed text-white/75">
        Kamu diarahkan sekali ke aplikasi penyedia untuk menyetujui pembayaran. Status pesanan diperbarui otomatis.
      </p>
      {modeSimulasi && redirectUrl && (
        <a href={redirectUrl} className="text-[13px] font-bold text-lime underline">Buka halaman simulasi pembayaran</a>
      )}
    </div>
  );
}

/**
 * [Hanya pengembangan] Panel untuk menyelesaikan tagihan test mode Xendit lewat endpoint
 * simulasi resmi (POST /v3/payment_requests/{id}/simulate). Tidak ada uang sungguhan;
 * status akhir tetap ditarik dari Xendit oleh poller sinkron di halaman ini.
 */
function SimulasiTestPanel({ kode }: { kode: string }) {
  const [kirim, setKirim] = useState(false);
  const [selesai, setSelesai] = useState(false);
  const [galat, setGalat] = useState('');

  async function jalankan() {
    setKirim(true);
    setGalat('');
    try {
      const res = await fetch(`/api/pesanan/${encodeURIComponent(kode)}/simulasi-test`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      const b = await res.json() as { ok?: boolean; kode?: string };
      if (res.ok && b.ok) {
        setSelesai(true);
        return;
      }
      if (b.kode === 'KEDALUWARSA') setGalat('Batas bayar sudah lewat. Silakan pesan ulang.');
      else if (b.kode === 'HANYA_TEST' || b.kode === 'TIDAK_DIDUKUNG') setGalat('Simulasi hanya aktif dengan kunci test Xendit (xnd_development_) di mode development.');
      else if (b.kode === 'BELUM_ADA_TAGIHAN') setGalat('Tidak ada tagihan yang menunggu. Pilih metode pembayaran dulu.');
      else setGalat('Simulasi gagal diproses. Coba lagi sebentar lagi.');
    } catch {
      setGalat('Belum bisa terhubung ke server. Coba lagi sebentar lagi.');
    } finally {
      setKirim(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-dashed border-white/35 p-4">
      <div className="text-[12px] font-bold uppercase tracking-wider text-white/55">Mode test Xendit</div>
      <p className="m-0 text-[14px] leading-relaxed text-white/75">
        QRIS/VA pada kunci test tidak bisa dibayar sungguhan. Tombol ini memanggil endpoint simulasi resmi Xendit
        sehingga tagihan dianggap lunas — pesanan terkonfirmasi otomatis dalam beberapa detik.
      </p>
      {selesai ? (
        <span className="text-[13px] font-bold text-lime" role="status">Simulasi terkirim. Menunggu konfirmasi dari Xendit…</span>
      ) : (
        <button type="button" onClick={jalankan} disabled={kirim}
          className="btn h-11 w-fit cursor-pointer rounded-full border-[1.5px] border-lime bg-transparent px-5 text-[14px] font-bold text-lime disabled:cursor-not-allowed disabled:opacity-50">
          {kirim ? 'Mengirim simulasi…' : 'Simulasikan pembayaran berhasil'}
        </button>
      )}
      {galat && <span className="text-[13px] font-bold text-[#F97066]">{galat}</span>}
    </div>
  );
}

export function BayarSekarang({ kode, transaksi, kanal, gatewayAktif, modeSimulasi, simulasiTest }: {
  kode: string;
  transaksi: TransaksiRingkas | null;
  kanal: KanalBayar[];
  gatewayAktif: boolean;
  modeSimulasi: boolean;
  simulasiTest: boolean;
}) {
  const router = useRouter();
  const [kirim, setKirim] = useState<string | null>(null);
  const [ganti, setGanti] = useState(false);
  const [galat, setGalat] = useState('');

  if (!gatewayAktif) {
    return (
      <Banner nada="amber" ikon="info" role="status">
        Pembayaran online sedang dinonaktifkan pengelola. Pesananmu tetap tersimpan — hubungi pengelola lapangan
        untuk menyelesaikan pembayaran.
      </Banner>
    );
  }
  if (!kanal.length) {
    return (
      <Banner nada="amber" ikon="info" role="status">
        Belum ada metode pembayaran yang diaktifkan pengelola. Hubungi pengelola lapangan untuk menyelesaikan pembayaran.
      </Banner>
    );
  }

  const menunggu = transaksi?.status === 'pending';
  const instruksi = menunggu ? transaksi?.instruksi ?? null : null;
  const tampilkanInstruksi = menunggu && instruksi && !ganti;

  async function bayar(metode: string) {
    setKirim(metode);
    setGalat('');
    try {
      const res = await fetch(`/api/pesanan/${encodeURIComponent(kode)}/bayar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ metode }),
      });
      const b = await res.json() as {
        ok?: boolean; redirectUrl?: string | null; instruksi?: Instruksi; kode?: string;
      };
      if (b.ok) {
        if (b.instruksi?.jenis === 'redirect' && b.instruksi.url) {
          window.location.assign(b.instruksi.url);
          return;
        }
        setGanti(false);
        router.refresh(); // instruksi QR/VA dirender ulang dari data server
        return;
      }
      if (res.status === 401) {
        router.push(`/masuk?next=${encodeURIComponent(`/pesanan/${kode}/bayar`)}`);
        return;
      }
      if (b.kode === 'GATEWAY_NONAKTIF') setGalat('Pembayaran gateway belum diaktifkan. Hubungi pengelola lapangan.');
      else if (b.kode === 'MODE_DEMO') setGalat('Mode demo tanpa basis data: transaksi pembayaran tidak tersedia.');
      else if (b.kode === 'METODE_TIDAK_VALID') { setGalat('Metode pembayaran tidak tersedia. Pilih metode lain.'); router.refresh(); }
      else if (b.kode === 'KEDALUWARSA') { setGalat('Batas bayar sudah lewat. Silakan pesan ulang.'); router.refresh(); }
      else if (b.kode === 'STATUS_BERUBAH') { setGalat('Status pesanan sudah berubah.'); router.refresh(); }
      else if (b.kode === 'BATAS_PERCOBAAN') setGalat('Batas percobaan pembayaran tercapai. Hubungi pengelola lapangan.');
      else setGalat('Belum bisa membuat transaksi. Coba lagi sebentar lagi.');
    } catch {
      setGalat('Belum bisa terhubung ke server. Coba lagi sebentar lagi.');
    } finally {
      setKirim(null);
    }
  }

  const kelompok = GRUP_URUT
    .map((g) => ({ grup: g, isi: kanal.filter((k) => k.grup === g) }))
    .filter((x) => x.isi.length);

  return (
    <div className="flex flex-col gap-5">
      {galat && <Banner nada="merah" ikon="alert">{galat}</Banner>}

      {tampilkanInstruksi && instruksi && (
        <div className="flex flex-col gap-5">
          <InstruksiPanel instruksi={instruksi} modeSimulasi={modeSimulasi} redirectUrl={transaksi?.redirectUrl ?? null} />
          {simulasiTest && <SimulasiTestPanel kode={kode} />}
          <div className="flex flex-wrap items-center gap-3 border-t border-white/15 pt-4">
            <button type="button" onClick={() => setGanti(true)}
              className="btn h-11 cursor-pointer rounded-full border-[1.5px] border-white/45 bg-transparent px-5 text-[14px] font-bold text-white">
              Ganti metode pembayaran
            </button>
            <span className="text-[13px] font-medium text-white/60">Metode baru menutup tagihan sebelumnya.</span>
          </div>
        </div>
      )}

      {/* Instruksi v2 lama: invoice hosted masih bisa dilanjutkan */}
      {!tampilkanInstruksi && menunggu && !instruksi && transaksi?.redirectUrl && (
        <div className="flex flex-col gap-3">
          <a href={transaksi.redirectUrl}
            className="btn flex h-14 w-fit items-center gap-3 rounded-full bg-lime py-0 pl-7 pr-2.5 text-base font-bold text-ink no-underline">
            Lanjutkan pembayaran
            <span className="flex size-9 items-center justify-center rounded-full bg-ink"><Icon name="arrow" size={18} stroke="#C6F432" width={2.4} /></span>
          </a>
          <p className="m-0 text-[13px] font-medium text-white/60">
            Tagihan ini dibuat dengan cara lama. Pilih metode baru di bawah untuk checkout di halaman ini.
          </p>
        </div>
      )}

      {!tampilkanInstruksi && (
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-sm font-semibold text-white/80">
              {menunggu && instruksi === null && transaksi?.redirectUrl ? 'Atau pilih metode lain' : 'Pilih metode pembayaran'}
            </div>
            {menunggu && (
              <p className="m-0 mt-1 text-[13px] font-medium text-white/60">
                Tagihan yang masih berlaku dengan metode yang sama dipakai ulang; metode berbeda menutup tagihan lama.
              </p>
            )}
          </div>
          {kelompok.map((g) => (
            <div key={g.grup} className="flex flex-col gap-2">
              <div className="text-[12px] font-bold uppercase tracking-wider text-white/55">{GRUP_LABEL[g.grup]}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {g.isi.map((k) => (
                  <button key={k.kode} type="button" onClick={() => bayar(k.kode)} disabled={kirim !== null}
                    className="btn flex h-[52px] cursor-pointer items-center justify-between gap-3 rounded-2xl border-[1.5px] border-white/25 bg-white/5 px-5 text-[15px] font-bold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
                    {k.label}
                    <span className="text-[13px] font-semibold text-white/60">
                      {kirim === k.kode ? 'Menyiapkan…' : 'Pilih'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="m-0 text-sm leading-relaxed text-white/70">
        Pembayaran diproses lewat Xendit. Status pesanan diperbarui otomatis setelah pembayaran diterima.
      </p>
    </div>
  );
}
