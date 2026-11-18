import type { CourtPhoto } from "@/lib/admin-courts";

const TONES = ["#22C06B", "#C6F432", "#1C5A40", "#A7F0E0", "#16A05A", "#DDF7E8"];
const DARK = new Set(["#1C5A40", "#16A05A", "#22C06B"]);

type Props = { photo: CourtPhoto | undefined; label: string; className?: string; showLabel?: boolean };

/** Foto: gambar dari berkas yang dipilih (object URL) atau blok warna untuk foto contoh. */
export default function PhotoThumb({ photo, label, className = "", showLabel = true }: Props) {
  if (photo?.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- object URL lokal, tidak cocok untuk next/image
      <img src={photo.url} alt={label} className={`block object-cover ${className}`} />
    );
  }
  const bg = TONES[(photo?.tone ?? 0) % TONES.length];
  return (
    <div role="img" aria-label={label} className={`flex items-end p-2.5 text-[13px] font-bold ${className}`} style={{ background: bg, color: DARK.has(bg) ? "#fff" : "#0B2B1E" }}>
      {photo && showLabel ? label : ""}
    </div>
  );
}
