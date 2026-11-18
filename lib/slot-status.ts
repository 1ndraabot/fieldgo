import type { SlotStatus } from "./availability";

/** Warna & label status slot — konsisten dengan legenda dan grid di Beranda. */
export const SLOT_STYLE: Record<SlotStatus, { cls: string; label: string; legend: string }> = {
  tersedia: { cls: "bg-f1 text-f6", label: "Tersedia", legend: "Tersedia" },
  terisi: { cls: "bg-[#FDE4E5] text-[#B42328]", label: "Terisi", legend: "Terisi" },
  ditahan: { cls: "bg-[#FFF1D6] text-[#7A4B00]", label: "Ditahan", legend: "Ditahan sementara" },
  "tidak-tersedia": { cls: "bg-[#E3EAE6] text-[#4F6358]", label: "Tidak tersedia", legend: "Tidak tersedia" },
};
