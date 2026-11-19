import { db } from '../../db.ts';
import { DEMO } from '../../demo.ts';
import type { Rekening } from './rules.ts';

export type { Rekening } from './rules.ts';

export type Pengaturan = {
  rekening: Rekening | null;
  batasBayarJam: number;
  batasPembatalanHari: number;
  gatewayAktif: boolean;
  metodeAktif: string[];
};

export const DEFAULT_PENGATURAN: Pengaturan = {
  rekening: null,
  batasBayarJam: 24,
  batasPembatalanHari: 1,
  gatewayAktif: true,
  metodeAktif: [],
};

const DEMO_REKENING: Rekening = { bank: 'Bank BCA', nomor: '1234 567 890', atasNama: 'FieldGo Sport' };

const teks = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

function angka(v: unknown, min: number, maks: number, cadangan: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isInteger(n) && n >= min && n <= maks ? n : cadangan;
}

function rekeningDari(v: unknown): Rekening | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  const bank = teks(r.bank);
  const nomor = teks(r.nomor);
  const atasNama = teks(r.atas_nama) ?? teks(r.atasNama);
  return bank && nomor && atasNama ? { bank, nomor, atasNama } : null;
}

function metodeDari(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()))];
}

/**
 * Pengaturan global dari tabel jsonb fieldgo. Nilai yang hilang/rusak jatuh ke default,
 * sehingga halaman tidak pernah gagal hanya karena satu kunci belum diisi.
 */
export async function bacaPengaturan(): Promise<Pengaturan> {
  if (DEMO) return { ...DEFAULT_PENGATURAN, rekening: DEMO_REKENING };

  const rows = await db.pengaturan.findMany({
    where: { kunci: { in: ['rekening_tujuan', 'batas_bayar_jam', 'batas_pembatalan_hari', 'gateway_aktif', 'metode_aktif'] } },
  });
  const peta = new Map(rows.map((r) => [r.kunci, r.nilai]));

  return {
    rekening: rekeningDari(peta.get('rekening_tujuan')),
    batasBayarJam: angka(peta.get('batas_bayar_jam'), 1, 72, DEFAULT_PENGATURAN.batasBayarJam),
    batasPembatalanHari: angka(peta.get('batas_pembatalan_hari'), 1, 7, DEFAULT_PENGATURAN.batasPembatalanHari),
    gatewayAktif: peta.get('gateway_aktif') !== false,
    metodeAktif: metodeDari(peta.get('metode_aktif')),
  };
}
