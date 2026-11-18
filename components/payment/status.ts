export type PaymentStatus = "menunggu_pembayaran" | "menunggu_verifikasi" | "dibatalkan" | "kedaluwarsa";

export const STATUS_CHIP: Record<PaymentStatus, { label: string; cls: string; dot: string }> = {
  menunggu_pembayaran: { label: "Menunggu pembayaran", cls: "bg-[#FFF1D6] text-[#7A4B00]", dot: "bg-star" },
  menunggu_verifikasi: { label: "Menunggu verifikasi", cls: "bg-[#D8F7F1] text-[#0B5E52]", dot: "bg-[#2DD4BF]" },
  dibatalkan: { label: "Dibatalkan", cls: "bg-[#E3EAE6] text-[#3F5247]", dot: "bg-[#8CA095]" },
  kedaluwarsa: { label: "Kedaluwarsa", cls: "bg-[#FDE4E5] text-[#B42328]", dot: "bg-[#E5484D]" },
};
