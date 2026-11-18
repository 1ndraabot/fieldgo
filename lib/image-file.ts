/** Validasi berkas foto lapangan (sisi klien): harus gambar yang sebenarnya. Tidak ada batas ukuran (tidak ada dasar di PRD). */
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export const IMAGE_MESSAGES = {
  notImage: (name: string) => `"${name}" bukan berkas gambar yang didukung (JPG, PNG, WebP, atau GIF).`,
  empty: (name: string) => `"${name}" kosong. Pilih berkas gambar yang lain.`,
  mismatch: (name: string) => `Isi "${name}" tidak sesuai formatnya. Pilih foto asli.`,
} as const;

type Family = "jpeg" | "png" | "webp" | "gif";
const EXT: Record<string, Family> = { jpg: "jpeg", jpeg: "jpeg", png: "png", webp: "webp", gif: "gif" };
const MIME: Record<string, Family> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export function sniffImage(b: Uint8Array): Family | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return "png";
  if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "gif"; // "GIF8"
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp"; // RIFF....WEBP
  return null;
}

export type ImageCheck = { ok: true } | { ok: false; message: string };

export async function validateImageFile(file: Blob & { name: string }): Promise<ImageCheck> {
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  const byExt = EXT[ext];
  const byMime = file.type ? MIME[file.type] : undefined;
  if (!byExt || (file.type && (!byMime || byMime !== byExt))) return { ok: false, message: IMAGE_MESSAGES.notImage(file.name) };
  if (file.size === 0) return { ok: false, message: IMAGE_MESSAGES.empty(file.name) };
  let head: Uint8Array;
  try { head = new Uint8Array(await file.slice(0, 12).arrayBuffer()); } catch { return { ok: false, message: IMAGE_MESSAGES.notImage(file.name) }; }
  return sniffImage(head) === byExt ? { ok: true } : { ok: false, message: IMAGE_MESSAGES.mismatch(file.name) };
}
