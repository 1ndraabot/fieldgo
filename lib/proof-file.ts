/** Validasi berkas bukti transfer (sisi klien): ekstensi, tipe MIME, ukuran, dan isi berkas (magic bytes). */
export const MAX_PROOF_BYTES = 5 * 1024 * 1024;
export const PROOF_ACCEPT = ".jpg,.jpeg,.png,.pdf";

export type ProofKind = "image" | "pdf";
export type ProofCheck = { ok: true; kind: ProofKind } | { ok: false; message: string };

export const PROOF_MESSAGES = {
  format: "Format berkas tidak didukung. Pilih JPG, JPEG, PNG, atau PDF.",
  size: "Ukuran berkas melebihi 5 MB. Pilih berkas yang lebih kecil.",
  empty: "Berkas kosong. Pilih berkas bukti transfer yang lain.",
  mismatch: "Isi berkas tidak sesuai formatnya. Pilih foto atau PDF asli bukti transfer.",
  unreadable: "Berkas tidak bisa dibaca. Coba pilih ulang berkasnya.",
} as const;

type Family = "jpeg" | "png" | "pdf";
const EXT: Record<string, Family> = { jpg: "jpeg", jpeg: "jpeg", png: "png", pdf: "pdf" };
const MIME: Record<string, Family> = { "image/jpeg": "jpeg", "image/png": "png", "application/pdf": "pdf" };

/** Pemeriksaan cepat berdasarkan nama, tipe, dan ukuran (tanpa membaca isi). */
export function checkMeta(f: { name: string; type: string; size: number }): { ok: true; family: Family } | { ok: false; message: string } {
  const ext = f.name.includes(".") ? f.name.split(".").pop()!.toLowerCase() : "";
  const byExt = EXT[ext];
  const byMime = f.type ? MIME[f.type] : undefined;
  if (!byExt || (f.type && !byMime) || (byMime && byMime !== byExt)) return { ok: false, message: PROOF_MESSAGES.format };
  if (f.size === 0) return { ok: false, message: PROOF_MESSAGES.empty };
  if (f.size > MAX_PROOF_BYTES) return { ok: false, message: PROOF_MESSAGES.size };
  return { ok: true, family: byExt };
}

/** Kenali format dari byte awal berkas. */
export function sniff(b: Uint8Array): Family | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return "png";
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return "pdf";
  return null;
}

export async function validateProofFile(file: Blob & { name: string }): Promise<ProofCheck> {
  const meta = checkMeta(file);
  if (!meta.ok) return meta;
  let head: Uint8Array;
  try { head = new Uint8Array(await file.slice(0, 8).arrayBuffer()); } catch { return { ok: false, message: PROOF_MESSAGES.unreadable }; }
  if (sniff(head) !== meta.family) return { ok: false, message: PROOF_MESSAGES.mismatch };
  return { ok: true, kind: meta.family === "pdf" ? "pdf" : "image" };
}

/** "1,2 MB" / "240 KB" */
export function formatBytes(n: number): string {
  return n > 1_048_576 ? `${(n / 1_048_576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}
