/** Aturan murni pengaturan global admin (FR-ADM-11). Dipakai server dan form. */

export type Rekening = { bank: string; nomor: string; atasNama: string };

export type MetodeKode = 'qris' | 'gopay' | 'shopeepay' | 'bank_transfer' | 'echannel' | 'credit_card';

/** Kode `enabled_payments` Midtrans yang boleh dipilih admin (kosong = semua metode aktif). */
export const METODE_PEMBAYARAN: { kode: MetodeKode; label: string }[] = [
  { kode: 'qris', label: 'QRIS' },
  { kode: 'gopay', label: 'GoPay' },
  { kode: 'shopeepay', label: 'ShopeePay' },
  { kode: 'bank_transfer', label: 'Transfer bank (VA)' },
  { kode: 'echannel', label: 'Mandiri Bill' },
  { kode: 'credit_card', label: 'Kartu kredit' },
];

export const BATAS_BAYAR_MIN = 1;
export const BATAS_BAYAR_MAKS = 72;
export const BATAS_BATAL_MIN = 1;
export const BATAS_BATAL_MAKS = 7;

export type InputPengaturan = {
  rekening: Rekening | null;
  batasBayarJam: number;
  batasPembatalanHari: number;
  gatewayAktif: boolean;
  metodeAktif: string[];
};

export const NOMOR_REKENING = /^[0-9 .-]{5,30}$/;

const teks = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const angka = (v: unknown): number => (typeof v === 'number' ? v : Number(v));

/** Normalisasi body JSON: angka boleh datang sebagai string dari form. */
export function normalisasiPengaturan(b: Record<string, unknown>): InputPengaturan {
  const r = b.rekening;
  let rekening: Rekening | null = null;
  if (r && typeof r === 'object' && !Array.isArray(r)) {
    const o = r as Record<string, unknown>;
    const bank = teks(o.bank);
    const nomor = teks(o.nomor);
    const atasNama = teks(o.atasNama);
    rekening = bank || nomor || atasNama ? { bank, nomor, atasNama } : null;
  }

  return {
    rekening,
    batasBayarJam: angka(b.batasBayarJam),
    batasPembatalanHari: angka(b.batasPembatalanHari),
    gatewayAktif: b.gatewayAktif === true,
    metodeAktif: Array.isArray(b.metodeAktif)
      ? [...new Set(b.metodeAktif.filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter(Boolean))]
      : [],
  };
}

/** Daftar pesan galat; kosong = valid. */
export function validasiPengaturan(i: InputPengaturan): string[] {
  const galat: string[] = [];

  if (i.rekening) {
    if (i.rekening.bank.length < 2 || i.rekening.bank.length > 60) galat.push('Nama bank harus 2–60 karakter.');
    if (!NOMOR_REKENING.test(i.rekening.nomor)) {
      galat.push('Nomor rekening harus 5–30 karakter dan hanya angka, spasi, titik, atau tanda hubung.');
    }
    if (i.rekening.atasNama.length < 2 || i.rekening.atasNama.length > 80) galat.push('Nama pemilik rekening harus 2–80 karakter.');
  }

  if (!Number.isInteger(i.batasBayarJam) || i.batasBayarJam < BATAS_BAYAR_MIN || i.batasBayarJam > BATAS_BAYAR_MAKS) {
    galat.push(`Batas bayar harus bilangan bulat ${BATAS_BAYAR_MIN}–${BATAS_BAYAR_MAKS} jam.`);
  }
  if (!Number.isInteger(i.batasPembatalanHari) || i.batasPembatalanHari < BATAS_BATAL_MIN || i.batasPembatalanHari > BATAS_BATAL_MAKS) {
    galat.push(`Batas pembatalan harus bilangan bulat ${BATAS_BATAL_MIN}–${BATAS_BATAL_MAKS} hari.`);
  }
  if (typeof i.gatewayAktif !== 'boolean') galat.push('Status gateway tidak valid.');

  const dikenal = new Set(METODE_PEMBAYARAN.map((m) => m.kode as string));
  const asing = i.metodeAktif.filter((m) => !dikenal.has(m));
  if (asing.length) galat.push(`Metode pembayaran tidak dikenal: ${asing.join(', ')}.`);

  return galat;
}
