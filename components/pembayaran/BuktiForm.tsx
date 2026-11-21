'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Banner } from '@/components/auth/ui';
import { Icon } from '@/components/icons';
import { MAKS_BYTES } from '@/lib/berkas';
import { formatHitungMundur } from '@/lib/format';

const TIPE = ['image/jpeg', 'image/png', 'application/pdf'];
const ukuran = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export function BuktiForm({ kode }: { kode: string }) {
  const router = useRouter();
  const api = `/api/pesanan/${encodeURIComponent(kode)}`;
  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<string | null>(null);
  const [galat, setGalat] = useState('');
  const [tunggu, setTunggu] = useState(0);
  const [kirim, setKirim] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState(false);

  useEffect(() => {
    if (!berkas?.type.startsWith('image/')) { setPratinjau(null); return; }
    const u = URL.createObjectURL(berkas);
    setPratinjau(u);
    return () => URL.revokeObjectURL(u);
  }, [berkas]);

  useEffect(() => {
    if (tunggu <= 0) return;
    const id = setTimeout(() => setTunggu((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [tunggu]);

  function pilih(f: File | undefined) {
    setGalat('');
    setBerkas(null);
    if (!f) return;
    // Lapisan 1 (browser). Server memeriksa ulang ukuran dan tipe dari ISI berkas.
    if (!TIPE.includes(f.type)) return setGalat('Format harus JPG, PNG, atau PDF.');
    if (f.size === 0) return setGalat('Berkas kosong.');
    if (f.size > MAKS_BYTES) return setGalat('Ukuran berkas maksimal 5 MB.');
    setBerkas(f);
  }

  function tanganiGalat(status: number, b: { kode?: string; ulangiDetik?: number }) {
    if (status === 401) return router.push(`/masuk?next=${encodeURIComponent(`/pesanan/${kode}/bayar`)}`);
    if (b.kode === 'DIBATASI') return setTunggu(b.ulangiDetik ?? 60);
    if (b.kode === 'TERLALU_BESAR') return setGalat('Ukuran berkas maksimal 5 MB.');
    if (b.kode === 'TIPE_TIDAK_DIDUKUNG' || b.kode === 'KOSONG') return setGalat('Format harus JPG, PNG, atau PDF.');
    if (b.kode === 'STATUS_BERUBAH' || b.kode === 'KEDALUWARSA' || b.kode === 'TIDAK_DITEMUKAN') {
      setGalat('Pesanan ini sudah tidak menunggu pembayaran.');
      return router.refresh();
    }
    setGalat('Belum berhasil. Coba lagi sebentar lagi.');
  }

  async function kirimBukti(e: FormEvent) {
    e.preventDefault();
    if (!berkas) return setGalat('Pilih berkas bukti transfer dulu.');
    setKirim(true);
    setGalat('');
    try {
      const fd = new FormData();
      fd.set('berkas', berkas);
      const res = await fetch(`${api}/bukti`, { method: 'POST', body: fd });
      const b = await res.json();
      if (b.ok) router.refresh(); // halaman beralih ke "Bukti terkirim"
      else tanganiGalat(res.status, b);
    } catch {
      setGalat('Belum bisa terhubung ke server. Coba lagi sebentar lagi.');
    } finally {
      setKirim(false);
    }
  }

  async function batalkan() {
    setKirim(true);
    setGalat('');
    try {
      const res = await fetch(`${api}/batal`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      const b = await res.json();
      if (b.ok) { router.push('/jadwal-saya'); router.refresh(); } else { setKonfirmasi(false); tanganiGalat(res.status, b); }
    } catch {
      setGalat('Belum bisa terhubung ke server. Coba lagi sebentar lagi.');
    } finally {
      setKirim(false);
    }
  }

  return (
    <form onSubmit={kirimBukti} noValidate className="flex flex-col gap-5">
      <h2 className="mt-4 font-display text-[28px] font-bold tracking-[-0.03em]">Unggah bukti transfer</h2>
      <div className="flex flex-wrap gap-5">
        <label className="relative flex min-h-[300px] min-w-[260px] flex-[1_1_280px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[32px] border-[1.5px] border-dashed border-brand-2 bg-mist p-6 text-center focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-brand-2">
          <input type="file" name="berkas" accept="image/jpeg,image/png,application/pdf" className="sr-only"
            onChange={(e) => pilih(e.target.files?.[0])} aria-describedby="petunjuk-bukti" />
          <span className="flex size-16 items-center justify-center rounded-full bg-brand"><Icon name="upload" size={28} stroke="#C6F432" width={2.4} /></span>
          <span className="text-[17px] font-bold">{berkas ? 'Ganti berkas' : 'Pilih berkas bukti'}</span>
          <span className="text-sm font-medium text-muted">JPG, PNG, atau PDF · maks 5 MB</span>
        </label>
        <div className="box-border min-h-[300px] min-w-[260px] flex-[1_1_280px] rounded-[32px] border-[1.5px] border-line bg-white p-[26px] shadow-[0_16px_36px_rgba(8,44,28,.1)]">
          <div className="text-xs font-bold tracking-[0.06em] text-muted">PRATINJAU</div>
          {berkas ? (
            <div className="mt-3.5">
              {pratinjau
                ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={pratinjau} alt="Pratinjau bukti transfer" className="max-h-[170px] w-full rounded-2xl bg-mist object-contain" />
                : <div className="flex h-[120px] items-center justify-center rounded-2xl bg-mist text-lg font-bold text-muted">PDF</div>}
              <div className="mt-3 truncate text-[15px] font-bold">{berkas.name}</div>
              <div className="text-sm font-medium text-muted">{ukuran(berkas.size)}</div>
              <button type="button" onClick={() => setBerkas(null)} className="mt-2 cursor-pointer border-0 bg-transparent p-0 text-sm font-bold text-[#B42328] underline">Hapus berkas</button>
            </div>
          ) : <p className="mt-3.5 text-sm leading-relaxed text-muted">Belum ada berkas dipilih. Pratinjau akan tampil di sini sebelum dikirim.</p>}
        </div>
      </div>
      <p id="petunjuk-bukti" className="m-0 text-[15px] leading-6 text-muted">Sebelum dikirim, pastikan nominal terlihat jelas serta nama bank dan tanggal terbaca.</p>

      {galat && <Banner nada="merah" ikon="alert">{galat}</Banner>}
      {tunggu > 0 && <Banner nada="amber" ikon="clock">Terlalu banyak percobaan. Coba lagi dalam <b>{formatHitungMundur(tunggu)}</b>.</Banner>}
      <Banner nada="merah" ikon="alert" role="note">Bukti yang ditolak bersifat final. Anda harus memesan ulang.</Banner>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={kirim || tunggu > 0}
          className="btn flex h-14 cursor-pointer items-center gap-3 rounded-full border-0 bg-brand py-0 pl-7 pr-2.5 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">
          {kirim ? 'Memproses…' : 'Kirim bukti'}
          <span className="flex size-9 items-center justify-center rounded-full bg-lime"><Icon name="arrow" size={18} stroke="#0B2B1E" width={2.4} /></span>
        </button>
        {!konfirmasi ? (
          <button type="button" onClick={() => setKonfirmasi(true)} disabled={kirim}
            className="btn flex h-14 cursor-pointer items-center rounded-full border-[1.5px] border-[#B42328] bg-transparent px-7 text-base font-bold text-[#B42328] disabled:opacity-45">Batalkan pesanan</button>
        ) : (
          <div role="alertdialog" aria-label="Konfirmasi pembatalan" className="flex flex-wrap items-center gap-3 rounded-[24px] border-[1.5px] border-[#E5484D] bg-[#FDE4E5] px-5 py-3 text-[15px] font-semibold text-[#7A1519]">
            Batalkan pesanan? Slot akan dilepas.
            <button type="button" onClick={batalkan} disabled={kirim} className="cursor-pointer rounded-full border-0 bg-[#B42328] px-5 py-2 text-sm font-bold text-white disabled:opacity-45">Ya, batalkan</button>
            <button type="button" onClick={() => setKonfirmasi(false)} className="cursor-pointer rounded-full border-[1.5px] border-[#B42328] bg-transparent px-5 py-2 text-sm font-bold text-[#B42328]">Tidak</button>
          </div>
        )}
      </div>
    </form>
  );
}
