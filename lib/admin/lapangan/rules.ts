/** Aturan murni pengelolaan lapangan, tarif, dan jam operasional (FR-ADM-02…04). */

export const JAM_MIN = 6;
export const JAM_MAKS = 24;

export type TipeHari = 'weekday' | 'weekend';
export type AturanTarif = { tipeHari: TipeHari; jamMulai: number; jamSelesai: number; hargaPerJam: number };
export type BarisJam = { hari: number; buka: boolean; jamBuka: number; jamTutup: number };

export const HARI = [1, 2, 3, 4, 5, 6, 7] as const;
export const NAMA_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

/** Sabtu/Minggu = weekend; hari lain weekday (sama dengan aturan pemesanan). */
export const tipeHariDari = (hari: number): TipeHari => (hari >= 6 ? 'weekend' : 'weekday');

export const labelTipeHari = (t: TipeHari): string => (t === 'weekday' ? 'Hari kerja' : 'Akhir pekan');

export const formatJam = (jam: number): string => `${String(jam).padStart(2, '0')}.00`;

/** Jam (6..23) yang benar-benar dibuka untuk satu tipe hari. Hari tutup tidak menuntut tarif. */
export function jamTerbuka(baris: BarisJam[], tipe: TipeHari): number[] {
  const set = new Set<number>();
  for (const b of baris) {
    if (!b.buka || tipeHariDari(b.hari) !== tipe) continue;
    for (let j = b.jamBuka; j < b.jamTutup; j++) set.add(j);
  }
  return [...set].sort((a, b) => a - b);
}

/** Jam operasional yang belum ditutup tarif (dipakai validasi server dan peringatan UI). */
export function jamTanpaTarif(aturan: AturanTarif[], jam: BarisJam[]): { tipeHari: TipeHari; jam: number }[] {
  const hilang: { tipeHari: TipeHari; jam: number }[] = [];
  for (const tipe of ['weekday', 'weekend'] as const) {
    for (const j of jamTerbuka(jam, tipe)) {
      if (!aturan.some((t) => t.tipeHari === tipe && j >= t.jamMulai && j < t.jamSelesai)) {
        hilang.push({ tipeHari: tipe, jam: j });
      }
    }
  }
  return hilang;
}

const ringkasJam = (hilang: { tipeHari: TipeHari; jam: number }[]): string => {
  const contoh = hilang.slice(0, 3).map((h) => `${formatJam(h.jam)} (${h.tipeHari})`).join(', ');
  return hilang.length > 3 ? `${contoh}, …` : contoh;
};

/**
 * Tarif harus menutupi seluruh jam operasional tiap tipe hari, tanpa tumpang tindih.
 * Mengembalikan daftar pesan galat; kosong = valid.
 */
export function validasiTarif(aturan: AturanTarif[], jam: BarisJam[]): string[] {
  const galat: string[] = [];
  if (!Array.isArray(aturan) || aturan.length === 0) {
    return jamTanpaTarif([], jam).length ? ['Tarif belum diisi.'] : [];
  }

  aturan.forEach((a, i) => {
    const n = i + 1;
    if (a.tipeHari !== 'weekday' && a.tipeHari !== 'weekend') galat.push(`Baris ${n}: tipe hari tidak dikenal.`);
    if (!Number.isInteger(a.jamMulai) || a.jamMulai < JAM_MIN || a.jamMulai >= JAM_MAKS) {
      galat.push(`Baris ${n}: jam mulai harus bilangan bulat ${JAM_MIN}–${JAM_MAKS - 1}.`);
    }
    if (!Number.isInteger(a.jamSelesai) || a.jamSelesai <= JAM_MIN || a.jamSelesai > JAM_MAKS) {
      galat.push(`Baris ${n}: jam selesai harus bilangan bulat ${JAM_MIN + 1}–${JAM_MAKS}.`);
    }
    if (Number.isInteger(a.jamMulai) && Number.isInteger(a.jamSelesai) && a.jamMulai >= a.jamSelesai) {
      galat.push(`Baris ${n}: jam mulai harus lebih awal dari jam selesai.`);
    }
    if (!Number.isInteger(a.hargaPerJam) || a.hargaPerJam <= 0) {
      galat.push(`Baris ${n}: harga per jam harus bilangan bulat lebih dari 0.`);
    }
  });

  // Tumpang tindih dicek per tipe hari setelah urut jam mulai.
  for (const tipe of ['weekday', 'weekend'] as const) {
    const urut = aturan
      .filter((a) => a.tipeHari === tipe && Number.isInteger(a.jamMulai) && Number.isInteger(a.jamSelesai))
      .sort((a, b) => a.jamMulai - b.jamMulai);
    for (let i = 1; i < urut.length; i++) {
      if (urut[i].jamMulai < urut[i - 1].jamSelesai) {
        galat.push(
          `Tarif ${labelTipeHari(tipe)} ${formatJam(urut[i].jamMulai)}–${formatJam(urut[i].jamSelesai)} ` +
          `tumpang tindih dengan ${formatJam(urut[i - 1].jamMulai)}–${formatJam(urut[i - 1].jamSelesai)}.`,
        );
      }
    }
  }

  if (galat.length === 0) {
    const hilang = jamTanpaTarif(aturan, jam);
    if (hilang.length > 0) galat.push(`Jam operasional belum tertutup tarif: ${ringkasJam(hilang)}.`);
  }
  return galat;
}

/** Tujuh baris (Senin–Minggu), dan perubahan jam tidak boleh menyisakan jam tanpa tarif. */
export function validasiJamOperasional(baris: BarisJam[], tarif: AturanTarif[]): string[] {
  const galat: string[] = [];
  if (!Array.isArray(baris) || baris.length !== 7) {
    return ['Jam operasional harus berisi tepat 7 hari.'];
  }

  const hari = new Set<number>();
  for (const b of baris) {
    if (!HARI.includes(b.hari as (typeof HARI)[number])) galat.push('Hari harus 1 (Senin) sampai 7 (Minggu).');
    else if (hari.has(b.hari)) galat.push(`${NAMA_HARI[b.hari - 1]}: hari ganda.`);
    hari.add(b.hari);
    if (typeof b.buka !== 'boolean') galat.push(`${NAMA_HARI[b.hari - 1] ?? 'Hari'}: status buka tidak valid.`);
    if (!b.buka) continue;
    if (!Number.isInteger(b.jamBuka) || b.jamBuka < JAM_MIN || b.jamBuka >= JAM_MAKS) {
      galat.push(`${NAMA_HARI[b.hari - 1] ?? 'Hari'}: jam buka harus ${JAM_MIN}–${JAM_MAKS - 1}.`);
    }
    if (!Number.isInteger(b.jamTutup) || b.jamTutup <= JAM_MIN || b.jamTutup > JAM_MAKS) {
      galat.push(`${NAMA_HARI[b.hari - 1] ?? 'Hari'}: jam tutup harus ${JAM_MIN + 1}–${JAM_MAKS}.`);
    }
    if (Number.isInteger(b.jamBuka) && Number.isInteger(b.jamTutup) && b.jamBuka >= b.jamTutup) {
      galat.push(`${NAMA_HARI[b.hari - 1] ?? 'Hari'}: jam buka harus lebih awal dari jam tutup.`);
    }
  }
  if (hari.size !== 7) galat.push('Setiap hari harus muncul tepat satu kali.');

  if (galat.length === 0) {
    const hilang = jamTanpaTarif(tarif, baris);
    if (hilang.length > 0) {
      galat.push(`Perubahan jam menyisakan jam tanpa tarif: ${ringkasJam(hilang)}. Lengkapi tarif lebih dulu.`);
    }
  }
  return galat;
}

export type InputLapangan = {
  nama: string;
  jenisOlahragaId: number;
  deskripsi: string | null;
  alamat: string | null;
  latitude: number | null;
  longitude: number | null;
  fasilitasIds: number[];
  aktif: boolean;
};

/** Validasi data lapangan; `namaDipakai` diisi service dari basis data. */
export function validasiLapangan(i: InputLapangan, opsi: { namaDipakai?: boolean } = {}): string[] {
  const galat: string[] = [];
  const nama = typeof i.nama === 'string' ? i.nama.trim() : '';

  if (nama.length < 3) galat.push('Nama lapangan minimal 3 karakter.');
  else if (nama.length > 80) galat.push('Nama lapangan maksimal 80 karakter.');
  if (opsi.namaDipakai) galat.push('Nama lapangan sudah dipakai.');
  if (!Number.isInteger(i.jenisOlahragaId) || i.jenisOlahragaId <= 0) galat.push('Jenis olahraga wajib dipilih.');
  if (i.deskripsi !== null && (typeof i.deskripsi !== 'string' || i.deskripsi.length > 1000)) {
    galat.push('Deskripsi maksimal 1000 karakter.');
  }
  if (i.alamat !== null && (typeof i.alamat !== 'string' || i.alamat.length > 500)) {
    galat.push('Alamat maksimal 500 karakter.');
  }

  const latNull = i.latitude === null || i.latitude === undefined;
  const lonNull = i.longitude === null || i.longitude === undefined;
  if (latNull !== lonNull) {
    galat.push('Latitude dan longitude harus diisi berdua atau dikosongkan berdua.');
  } else if (!latNull && !lonNull) {
    if (!Number.isFinite(i.latitude) || i.latitude! < -90 || i.latitude! > 90) galat.push('Latitude harus antara -90 dan 90.');
    if (!Number.isFinite(i.longitude) || i.longitude! < -180 || i.longitude! > 180) galat.push('Longitude harus antara -180 dan 180.');
  }

  if (typeof i.aktif !== 'boolean') galat.push('Status aktif tidak valid.');
  if (!Array.isArray(i.fasilitasIds) || i.fasilitasIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    galat.push('Daftar fasilitas tidak valid.');
  } else if (new Set(i.fasilitasIds).size !== i.fasilitasIds.length) {
    galat.push('Fasilitas tidak boleh dipilih dua kali.');
  }

  return galat;
}

/** Normalisasi input lapangan dari body JSON; angka boleh datang sebagai string dari form. */
export function normalisasiLapangan(b: Record<string, unknown>): InputLapangan {
  const teksAtauNull = (v: unknown): string | null => {
    if (typeof v !== 'string') return null;
    const t = v.trim();
    return t === '' ? null : t;
  };
  const angkaAtauNull = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : NaN;
  };
  const id = (v: unknown): number => (typeof v === 'number' ? v : Number(v));

  return {
    nama: typeof b.nama === 'string' ? b.nama.trim() : '',
    jenisOlahragaId: id(b.jenisOlahragaId),
    deskripsi: teksAtauNull(b.deskripsi),
    alamat: teksAtauNull(b.alamat),
    latitude: angkaAtauNull(b.latitude),
    longitude: angkaAtauNull(b.longitude),
    fasilitasIds: Array.isArray(b.fasilitasIds) ? b.fasilitasIds.map(id).filter((n) => Number.isFinite(n)) : [],
    aktif: typeof b.aktif === 'boolean' ? b.aktif : true,
  };
}
