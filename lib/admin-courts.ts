/**
 * Aturan Admin — Kelola Lapangan (FR-ADM-02), FRONTEND SAJA. Murni dan dapat diuji.
 * Lapangan tidak dihapus, hanya dinonaktifkan (BR-17).
 */
export type CourtPhoto = {
  id: string;
  name: string;
  /** object URL dari berkas yang dipilih di browser; null = foto contoh (tampil sebagai blok warna) */
  url: string | null;
  /** indeks warna untuk foto contoh */
  tone: number;
};

export type AdminCourt = {
  id: string;
  nama: string;
  sport: string;
  aktif: boolean;
  desc: string;
  alamat: string;
  lat: string;
  lng: string;
  fotos: CourtPhoto[];
  /** id foto utama (null bila belum ada foto) */
  utamaId: string | null;
  fac: string[];
};

export type CourtErrors = Partial<Record<"nama" | "sport" | "desc" | "alamat" | "lat" | "lng" | "foto", string>>;

export const MESSAGES = {
  nama: "Nama lapangan wajib diisi.",
  sport: "Pilih jenis olahraga.",
  desc: "Deskripsi wajib diisi.",
  alamat: "Alamat wajib diisi.",
  foto: "Unggah minimal satu foto lapangan.",
  latEmpty: "Latitude wajib diisi.",
  lngEmpty: "Longitude wajib diisi.",
  lat: "Latitude harus angka antara -90 dan 90, contoh: -6.2088.",
  lng: "Longitude harus angka antara -180 dan 180, contoh: 106.8456.",
} as const;

export type CoordParse = { ok: true; value: number } | { ok: false; message: string };

/** Koordinat desimal. Titik atau koma sebagai pemisah desimal; rentang -90..90 / -180..180. */
export function parseCoordinate(input: string, kind: "lat" | "lng"): CoordParse {
  const raw = input.trim().replace(",", ".");
  if (raw === "") return { ok: false, message: kind === "lat" ? MESSAGES.latEmpty : MESSAGES.lngEmpty };
  const limit = kind === "lat" ? 90 : 180;
  if (!/^[+-]?\d+(\.\d+)?$/.test(raw)) return { ok: false, message: MESSAGES[kind] };
  const value = Number(raw);
  return Math.abs(value) > limit ? { ok: false, message: MESSAGES[kind] } : { ok: true, value };
}

export function validateCourt(d: AdminCourt, sports: string[]): CourtErrors {
  const e: CourtErrors = {};
  if (!d.nama.trim()) e.nama = MESSAGES.nama;
  if (!d.sport || !sports.includes(d.sport)) e.sport = MESSAGES.sport;
  if (!d.desc.trim()) e.desc = MESSAGES.desc;
  if (!d.alamat.trim()) e.alamat = MESSAGES.alamat;
  const la = parseCoordinate(d.lat, "lat"); if (!la.ok) e.lat = la.message;
  const lo = parseCoordinate(d.lng, "lng"); if (!lo.ok) e.lng = lo.message;
  if (d.fotos.length === 0) e.foto = MESSAGES.foto;
  return e;
}

/** Rapikan sebelum disimpan: trim teks, koordinat berformat titik. */
export function normalizeCourt(d: AdminCourt): AdminCourt {
  const la = parseCoordinate(d.lat, "lat"), lo = parseCoordinate(d.lng, "lng");
  return {
    ...d, nama: d.nama.trim(), desc: d.desc.trim(), alamat: d.alamat.trim(),
    lat: la.ok ? String(la.value) : d.lat, lng: lo.ok ? String(lo.value) : d.lng,
    utamaId: d.fotos.some((f) => f.id === d.utamaId) ? d.utamaId : d.fotos[0]?.id ?? null,
  };
}

/** Geser foto satu posisi (-1 kiri, +1 kanan). Foto utama ditandai dengan id, jadi tidak perlu disesuaikan. */
export function movePhoto(fotos: CourtPhoto[], index: number, dir: -1 | 1): CourtPhoto[] {
  const j = index + dir;
  if (index < 0 || index >= fotos.length || j < 0 || j >= fotos.length) return fotos;
  const a = [...fotos];
  [a[index], a[j]] = [a[j], a[index]];
  return a;
}

/** Hapus foto; bila yang dihapus adalah foto utama, foto pertama yang tersisa menjadi utama. */
export function removePhoto(fotos: CourtPhoto[], utamaId: string | null, id: string) {
  const next = fotos.filter((f) => f.id !== id);
  return { fotos: next, utamaId: utamaId === id || !next.some((f) => f.id === utamaId) ? next[0]?.id ?? null : utamaId };
}

/** Tambah foto di akhir; bila belum ada foto utama, foto pertama menjadi utama. */
export function addPhotos(fotos: CourtPhoto[], utamaId: string | null, added: CourtPhoto[]) {
  const next = [...fotos, ...added];
  return { fotos: next, utamaId: utamaId && next.some((f) => f.id === utamaId) ? utamaId : next[0]?.id ?? null };
}

export function uniqueId(base: string, existing: string[]): string {
  const slug = base.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "lapangan";
  if (!existing.includes(slug)) return slug;
  let n = 2;
  while (existing.includes(`${slug}-${n}`)) n++;
  return `${slug}-${n}`;
}

export type AddNameResult = { ok: true; list: string[]; name: string } | { ok: false; message: string };

/** Tambah jenis olahraga / fasilitas: wajib diisi dan tidak boleh kembar (tak peka huruf besar). */
export function addName(list: string[], input: string, kind: "sport" | "facility"): AddNameResult {
  const name = input.trim().replace(/\s+/g, " ");
  const noun = kind === "sport" ? "jenis olahraga" : "fasilitas";
  if (!name) return { ok: false, message: `Nama ${noun} wajib diisi.` };
  if (list.some((x) => x.toLowerCase() === name.toLowerCase())) return { ok: false, message: `${noun[0].toUpperCase()}${noun.slice(1)} ini sudah ada.` };
  return { ok: true, list: [...list, name], name };
}

export const countSport = (courts: AdminCourt[], name: string) => courts.filter((c) => c.sport === name).length;
export const countFacility = (courts: AdminCourt[], name: string) => courts.filter((c) => c.fac.includes(name)).length;
