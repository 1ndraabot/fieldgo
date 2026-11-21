export const MAKS_BYTES = 5 * 1024 * 1024; // 5 MB (PRD FR-PAY-02)

const SIGNATURE = [
  { tipe: 'image/jpeg', ekstensi: 'jpg', cocok: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { tipe: 'image/png', ekstensi: 'png', cocok: (b: Uint8Array) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v) },
  { tipe: 'application/pdf', ekstensi: 'pdf', cocok: (b: Uint8Array) => [0x25, 0x50, 0x44, 0x46, 0x2d].every((v, i) => b[i] === v) },
] as const;

export type HasilBerkas =
  | { ok: true; tipe: string; ekstensi: string }
  | { ok: false; kode: 'KOSONG' | 'TERLALU_BESAR' | 'TIPE_TIDAK_DIDUKUNG' };

/** Validasi di server: ukuran dan tipe dari isi berkas. Nama/Content-Type dari klien tidak dipercaya. */
export function validasiBerkas(isi: Uint8Array): HasilBerkas {
  if (isi.length === 0) return { ok: false, kode: 'KOSONG' };
  if (isi.length > MAKS_BYTES) return { ok: false, kode: 'TERLALU_BESAR' };
  const s = SIGNATURE.find((x) => x.cocok(isi));
  return s ? { ok: true, tipe: s.tipe, ekstensi: s.ekstensi } : { ok: false, kode: 'TIPE_TIDAK_DIDUKUNG' };
}
